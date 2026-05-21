import os
import sys
import io
import traceback
import base64
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
from openai import AsyncOpenAI
from app.config import settings

from app.database import get_db
from app.models.postgres_models import DataSession

router = APIRouter(prefix="/api/python-runner", tags=["Python Runner"])

class RunCodeRequest(BaseModel):
    session_id: Optional[str] = None
    code: str

class CopilotRequest(BaseModel):
    session_id: Optional[str] = None
    prompt: str
    current_code: str

@router.post("/execute")
async def execute_python_code(req: RunCodeRequest, db: AsyncSession = Depends(get_db)):
    df = None
    if req.session_id:
        result = await db.execute(select(DataSession).where(DataSession.session_id == req.session_id))
        session = result.scalar_one_or_none()
        if session:
            cleaned_path = session.approved_file_path or session.cleaned_file_path
            if cleaned_path and os.path.exists(cleaned_path):
                df = pd.read_csv(cleaned_path)

    # Prepare the execution environment
    output_buffer = io.StringIO()
    error_buffer = io.StringIO()
    figures_b64 = []
    
    try:
        # We will patch matplotlib to use Agg backend (no GUI)
        # and capture the figures manually.
        global_env = {
            "pd": pd,
            "__builtins__": __builtins__
        }
        
        if df is not None:
            global_env["df"] = df
        
        # Ensure matplotlib is set to Agg before user imports it
        pre_code = """
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
"""
        exec(pre_code, global_env)

        # Redirect stdout and stderr
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = output_buffer
        sys.stderr = error_buffer

        try:
            # Execute user code
            exec(req.code, global_env)
            
            # Capture any generated matplotlib figures
            plt = global_env.get('plt')
            if plt:
                fignums = plt.get_fignums()
                for num in fignums:
                    fig = plt.figure(num)
                    buf = io.BytesIO()
                    fig.savefig(buf, format='png', bbox_inches='tight')
                    buf.seek(0)
                    b64 = base64.b64encode(buf.read()).decode('utf-8')
                    figures_b64.append(b64)
                plt.close('all')

        except Exception as e:
            traceback.print_exc(file=error_buffer)
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Runner setup failed: {str(e)}")

    stdout_val = output_buffer.getvalue()
    stderr_val = error_buffer.getvalue()

    return {
        "success": True,
        "stdout": stdout_val,
        "stderr": stderr_val,
        "figures": figures_b64
    }

@router.post("/copilot")
async def generate_copilot_code(req: CopilotRequest, db: AsyncSession = Depends(get_db)):
    df_columns = []
    if req.session_id:
        result = await db.execute(select(DataSession).where(DataSession.session_id == req.session_id))
        session = result.scalar_one_or_none()
        if session:
            cleaned_path = session.approved_file_path or session.cleaned_file_path
            if cleaned_path and os.path.exists(cleaned_path):
                # Just get columns for context
                df = pd.read_csv(cleaned_path, nrows=0)
                df_columns = df.columns.tolist()

    api_key = (settings.groq_api_key or "").strip()
    base_url = (settings.groq_base_url or "https://api.groq.com/openai/v1").strip()
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    
    system_prompt = (
        "You are an AI Python programming assistant (Copilot). "
        "The user is writing code in a Jupyter-like Notebook environment. "
        "The dataset is available as a pandas DataFrame named `df`.\n"
    )
    if df_columns:
        system_prompt += f"The dataset `df` has the following columns: {df_columns}\n"
    
    system_prompt += (
        "Your task is to provide ONLY the raw Python code to solve the user's prompt. "
        "DO NOT include markdown formatting like ```python ... ```. "
        "DO NOT include explanations. JUST raw python code that can be directly inserted into the editor. "
        "If the user asks to 'plot', use matplotlib.pyplot as plt."
    )

    user_prompt = f"Current Code:\n{req.current_code}\n\nUser Request: {req.prompt}\n\nProvide the code:"

    try:
        resp = await client.chat.completions.create(
            model=settings.chat_model or "llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=1024,
        )
        code = (resp.choices[0].message.content or "").strip()
        
        # Clean up markdown if the LLM hallucinated it anyway
        if code.startswith("```python"):
            code = code[9:]
        if code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]
            
        return {"success": True, "code": code.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
