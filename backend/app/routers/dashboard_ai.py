import os
import json
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.postgres_models import DataSession
from app.utils.helpers import get_column_types
from app.services.chatbot_service import _invoke_langchain_chat, _invoke_gemini_chat, _get_gemini_model
from app.config import settings
from langchain_openai import ChatOpenAI

router = APIRouter(prefix="/api/dashboard-ai", tags=["Dashboard AI"])

class DashboardRequest(BaseModel):
    session_id: str
    prompt: str

from typing import List

class RefreshRequest(BaseModel):
    session_id: str
    charts: List[dict]

def _populate_chart_data(full_df: pd.DataFrame, charts_list: List[dict]) -> List[dict]:
    final_charts = []
    for c in charts_list:
        try:
            x = c.get("xAxis") or c.get("x_col") or c.get("x_key")
            y = c.get("yAxis") or c.get("y_col") or c.get("y_key")
            agg = c.get("aggregation")
            c_type = c.get("type", "bar")
            
            c["xAxis"] = x
            c["yAxis"] = y

            if not x or x not in full_df.columns:
                continue
                
            if c_type == "scatter":
                if not y or y not in full_df.columns: continue
                sample = full_df[[x, y]].dropna().head(150)
                c["data"] = sample.rename(columns={x: "x", y: "y"}).to_dict(orient="records")
                c["x_col"] = x
                c["y_col"] = y
                c["correlation"] = full_df[x].corr(full_df[y]) if pd.api.types.is_numeric_dtype(full_df[x]) and pd.api.types.is_numeric_dtype(full_df[y]) else 0
            elif c_type == "pie":
                counts = full_df[x].value_counts(dropna=True).reset_index().head(15)
                counts.columns = ["name", "value"]
                c["data"] = counts.to_dict(orient="records")
            else:
                if y and y in full_df.columns and agg in ["sum", "avg", "mean", "count"]:
                    if agg in ["avg", "mean"]:
                        grouped = full_df.groupby(x, dropna=True)[y].mean().reset_index()
                    elif agg == "sum":
                        grouped = full_df.groupby(x, dropna=True)[y].sum().reset_index()
                    else:
                        grouped = full_df.groupby(x, dropna=True)[y].count().reset_index()
                    grouped = grouped.sort_values(by=y, ascending=False).head(20)
                    
                    if c_type == "line":
                        c["data"] = grouped.rename(columns={x: "x", y: "value"}).to_dict(orient="records")
                    else:
                        c["data"] = grouped.rename(columns={x: "category", y: "value"}).to_dict(orient="records")
                        c["x_key"] = "category"
                        c["y_key"] = "value"
                        c["type"] = "column"
                else:
                    counts = full_df[x].value_counts(dropna=True).reset_index().head(20)
                    counts.columns = ["category", "value"]
                    c["data"] = counts.to_dict(orient="records")
                    c["x_key"] = "category"
                    c["y_key"] = "value"
                    c["type"] = "column"
                    
            final_charts.append(c)
        except Exception:
            continue
    return final_charts

@router.post("/generate")
async def generate_dashboard(req: DashboardRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSession).where(DataSession.session_id == req.session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    cleaned_path = session.approved_file_path or session.cleaned_file_path
    if not cleaned_path or not os.path.exists(cleaned_path):
        raise HTTPException(status_code=404, detail="Data file not found.")

    try:
        full_df = pd.read_csv(cleaned_path)
        df_sample = full_df.head(5)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load data: {str(exc)}")

    columns_info = get_column_types(full_df)
    head_json = df_sample.to_json(orient="records", date_format="iso")

    system_prompt = f"""You are an AI BI Developer.
The user wants a dashboard based on the dataset schema:
{json.dumps(columns_info, indent=2)}

Sample data:
{head_json}

Return ONLY a valid JSON object with a single key "charts", containing an array of charts. 
Each chart must have:
- "id": a unique string
- "title": a string
- "type": one of ["bar", "line", "pie", "scatter"]
- "xAxis": column name
- "yAxis": column name
- "aggregation": one of ["sum", "avg", "count", "none"]
- "description": a short reason why you chose this.

Do not include markdown blocks like ```json.
"""
    try:
        # Fallback to GROQ if CHAT_API_KEY is invalid
        api_key = settings.groq_api_key or settings.chat_api_key
        base_url = settings.groq_base_url or settings.chat_base_url
        
        llm = ChatOpenAI(
            model=settings.chat_model,
            temperature=0.0,
            max_tokens=1024,
            api_key=api_key,
            base_url=base_url
        ) if api_key else None
        
        if llm:
            response = await _invoke_langchain_chat(llm, system_prompt, [], req.prompt)
        else:
            model, err2 = _get_gemini_model()
            if not model:
                 raise HTTPException(status_code=500, detail="No LLM provider configured.")
            response = await _invoke_gemini_chat(model, system_prompt, [], req.prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Generation Failed: {str(e)}")
        
    # The _invoke_* methods return parsed JSON dicts because they call _parse_llm_response
    if "charts" not in response:
        # If it failed to parse or returned raw, wrap it
        if isinstance(response, dict) and "type" in response:
            response["charts"] = [response]
        else:
            return {"success": False, "detail": "Failed to generate valid charts format."}

    final_charts = _populate_chart_data(full_df, response["charts"])
    return {"success": True, "charts": final_charts}

@router.post("/refresh")
async def refresh_ai_dashboard(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSession).where(DataSession.session_id == req.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cleaned_path = session.approved_file_path or session.cleaned_file_path
    if not cleaned_path or not os.path.exists(cleaned_path):
        raise HTTPException(status_code=404, detail="Data file not found.")

    try:
        full_df = pd.read_csv(cleaned_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load data: {str(exc)}")

    updated_charts = _populate_chart_data(full_df, req.charts)
    return {"success": True, "charts": updated_charts}
