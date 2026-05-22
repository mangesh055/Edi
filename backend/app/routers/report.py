import os
from datetime import datetime
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.postgres_models import DataSession

router = APIRouter(prefix="/api/report", tags=["Report Generation"])

def generate_html_report(session: DataSession, df: pd.DataFrame) -> str:
    filename = session.filename or "Dataset"
    rows, cols = df.shape
    health_score = session.cleaned_health_score or session.raw_health_score or 0
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Basic stats
    numeric_df = df.select_dtypes(include=['number'])
    stats_html = ""
    if not numeric_df.empty:
        desc = numeric_df.describe().round(2)
        stats_html = desc.to_html(classes="data-table", border=0)

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StatsFlow Executive Summary: {filename}</title>
        <style>
            :root {{
                --primary: #4f46e5;
                --text: #1e293b;
                --text-light: #64748b;
                --bg: #f8fafc;
                --card-bg: #ffffff;
                --border: #e2e8f0;
            }}
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: var(--text);
                background-color: var(--bg);
                line-height: 1.6;
                margin: 0;
                padding: 40px;
            }}
            .container {{
                max-width: 1000px;
                margin: 0 auto;
                background: var(--card-bg);
                padding: 50px;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid var(--border);
                padding-bottom: 30px;
                margin-bottom: 40px;
            }}
            .header h1 {{
                margin: 0 0 10px 0;
                font-size: 32px;
                color: var(--primary);
            }}
            .header p {{
                margin: 0;
                color: var(--text-light);
                font-size: 16px;
            }}
            .metrics-grid {{
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 40px;
            }}
            .metric-card {{
                background: var(--bg);
                padding: 20px;
                border-radius: 8px;
                border: 1px solid var(--border);
                text-align: center;
            }}
            .metric-value {{
                font-size: 36px;
                font-weight: bold;
                color: var(--primary);
                margin-bottom: 5px;
            }}
            .metric-label {{
                font-size: 14px;
                color: var(--text-light);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            .section {{
                margin-bottom: 40px;
            }}
            .section h2 {{
                font-size: 24px;
                margin-bottom: 20px;
                border-bottom: 1px solid var(--border);
                padding-bottom: 10px;
            }}
            .data-table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 14px;
            }}
            .data-table th, .data-table td {{
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid var(--border);
            }}
            .data-table th {{
                background-color: var(--bg);
                font-weight: 600;
                color: var(--text-light);
            }}
            .footer {{
                text-align: center;
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid var(--border);
                color: var(--text-light);
                font-size: 14px;
            }}
            @media print {{
                body {{ background: white; padding: 0; }}
                .container {{ box-shadow: none; padding: 0; }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>StatsFlow Executive Data Report</h1>
                <p>Dataset: <strong>{filename}</strong> | Generated on: {date_str}</p>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{rows:,}</div>
                    <div class="metric-label">Total Rows</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{cols}</div>
                    <div class="metric-label">Total Columns</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{health_score}%</div>
                    <div class="metric-label">Data Quality Score</div>
                </div>
            </div>

            <div class="section">
                <h2>Data Dictionary & Completeness</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Column Name</th>
                            <th>Data Type</th>
                            <th>Missing Values</th>
                            <th>Missing %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {"".join(f"<tr><td>{col}</td><td>{df[col].dtype}</td><td>{df[col].isnull().sum()}</td><td>{(df[col].isnull().sum() / rows * 100):.2f}%</td></tr>" for col in df.columns)}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h2>Numeric Distributions Summary</h2>
                {stats_html if stats_html else "<p>No numeric columns available in this dataset.</p>"}
            </div>

            <div class="footer">
                Generated automatically by StatsFlow AI Data Platform
            </div>
        </div>
        <script>
            // Automatically prompt the user to save as PDF
            window.onload = function() {{
                window.print();
            }};
        </script>
    </body>
    </html>
    """
    return html

@router.get("/generate/{session_id}")
async def get_html_report(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSession).where(DataSession.session_id == session_id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    cleaned_path = session.chatbot_working_file_path or session.approved_file_path or session.cleaned_file_path or session.file_path
    if not cleaned_path or not os.path.exists(cleaned_path):
        raise HTTPException(status_code=404, detail="Data file not found")
        
    df = pd.read_csv(cleaned_path)
    html_content = generate_html_report(session, df)
    
    return HTMLResponse(content=html_content, status_code=200)
