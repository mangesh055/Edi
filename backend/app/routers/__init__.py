"""
StatsFlow Routers Package
--------------------------
Aggregates all FastAPI APIRouter instances for registration
in main.py via `app.include_router(...)`.

Routers:
  - upload        : Phase 1 — raw dataset ingestion
  - cleaning      : Phase 2 — automated cleaning pipeline
  - visualization : Phase 3 — chart & insight generation
  - chatbot       : Phase 4 — agentic AI chatbot
  - sentiment     : Phase 5 — sentiment analysis on text columns
"""

from app.routers import upload, cleaning, visualization, chatbot, sentiment

__all__ = ["upload", "cleaning", "visualization", "chatbot", "sentiment"]