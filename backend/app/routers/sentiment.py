"""
StatsFlow Sentiment Analysis Router
------------------------------------
API endpoints for sentiment analysis operations.
"""

import pandas as pd
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any

from app.database import get_db
from app.models.postgres_models import DataSession
from app.services.sentiment_analysis import analyze_sentiment_in_dataframe, SentimentAnalyzer
from app.utils.helpers import df_to_json_safe
import logging

router = APIRouter(prefix="/api", tags=["Sentiment Analysis"])
logger = logging.getLogger(__name__)


@router.post("/sentiment/analyze", summary="Analyze sentiment in text columns")
async def analyze_sentiment(
    session_id: str = Body(..., embed=True, description="Session ID"),
    columns: List[str] = Body(None, embed=True, description="Columns to analyze, or None for auto-detect"),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze sentiment for text columns in a cleaned dataset.
    
    Args:
        session_id: The session ID
        columns: List of column names to analyze, or None to auto-detect text columns
        
    Returns:
        Analysis results with sentiment distribution and new data columns
    """
    try:
        # Fetch session
        result = await db.execute(
            select(DataSession).where(DataSession.session_id == session_id)
        )
        session = result.scalars().first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not session.cleaned_file_path:
            raise HTTPException(status_code=400, detail="No cleaned data available for analysis")
        
        # Load cleaned data
        df = pd.read_csv(session.cleaned_file_path)
        
        # Perform sentiment analysis
        df_analyzed, summary = analyze_sentiment_in_dataframe(df, columns)
        
        # Save updated dataset with sentiment columns
        sentiment_file_path = session.cleaned_file_path.replace('.csv', '_sentiment.csv')
        df_analyzed.to_csv(sentiment_file_path, index=False)
        
        # Update session with new file path and sentiment results
        session.cleaned_file_path = sentiment_file_path
        session.sentiment_analysis_results = summary  # Store analysis results in DB
        session.text_columns_identified = list(summary.keys())  # Store analyzed columns in DB
        session.cleaning_summary = session.cleaning_summary or {}
        if isinstance(session.cleaning_summary, dict):
            session.cleaning_summary['sentiment_analysis'] = {
                'analyzed_columns': list(summary.keys()),
                'timestamp': str(__import__('datetime').datetime.now())
            }
        await db.commit()
        
        return {
            "status": "success",
            "session_id": session_id,
            "message": "Sentiment analysis completed successfully",
            "analyzed_columns": list(summary.keys()),
            "sentiment_summary": summary,
            "total_rows": len(df_analyzed),
            "new_columns": [col for col in df_analyzed.columns if '_sentiment' in col or '_confidence' in col or '_polarity' in col or '_subjectivity' in col]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")


@router.get("/sentiment/text-columns/{session_id}", summary="Get identified text columns")
async def get_text_columns(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Identify text columns in the cleaned dataset that can be analyzed for sentiment.
    
    Args:
        session_id: The session ID
        
    Returns:
        List of text columns suitable for sentiment analysis
    """
    try:
        # Fetch session
        result = await db.execute(
            select(DataSession).where(DataSession.session_id == session_id)
        )
        session = result.scalars().first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not session.cleaned_file_path:
            raise HTTPException(status_code=400, detail="No cleaned data available")
        
        # Load data and identify text columns
        df = pd.read_csv(session.cleaned_file_path)
        analyzer = SentimentAnalyzer()
        text_columns = analyzer.identify_text_columns(df)
        
        # Store identified columns in session
        session.text_columns_identified = text_columns
        await db.commit()
        
        return {
            "status": "success",
            "session_id": session_id,
            "text_columns": text_columns,
            "total_columns": len(df.columns),
            "total_rows": len(df)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error identifying text columns: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to identify text columns: {str(e)}")


@router.post("/sentiment/single", summary="Analyze sentiment for a single text")
async def analyze_single_text(
    text: str = Body(..., embed=True, description="Text to analyze")
):
    """
    Analyze sentiment for a single text string.
    
    Args:
        text: Text to analyze
        
    Returns:
        Sentiment analysis results
    """
    try:
        analyzer = SentimentAnalyzer()
        result = analyzer.analyze_text(text)
        
        return {
            "status": "success",
            "text": text[:100] + "..." if len(text) > 100 else text,
            "analysis": result
        }
    
    except Exception as e:
        logger.error(f"Error analyzing single text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/sentiment/summary/{session_id}", summary="Get sentiment analysis summary")
async def get_sentiment_summary(
    session_id: str,
    column_name: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive sentiment analysis summary for a session.
    
    Args:
        session_id: The session ID
        column_name: Optional specific column to get summary for
        
    Returns:
        Sentiment analysis summary with distributions and statistics
    """
    try:
        # Fetch session
        result = await db.execute(
            select(DataSession).where(DataSession.session_id == session_id)
        )
        session = result.scalars().first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not session.cleaned_file_path:
            raise HTTPException(status_code=400, detail="No sentiment data available")
        
        # Load data
        df = pd.read_csv(session.cleaned_file_path)
        
        analyzer = SentimentAnalyzer()
        summary = {}
        
        if column_name:
            # Get summary for specific column
            if f'{column_name}_sentiment' not in df.columns:
                raise HTTPException(status_code=404, detail=f"No sentiment data for column '{column_name}'")
            summary[column_name] = analyzer.get_sentiment_summary(df, f'{column_name}_sentiment')
        else:
            # Get summary for all sentiment columns
            sentiment_cols = [col for col in df.columns if col.endswith('_sentiment')]
            for sent_col in sentiment_cols:
                original_col = sent_col.replace('_sentiment', '')
                summary[original_col] = analyzer.get_sentiment_summary(df, sent_col)
        
        return {
            "status": "success",
            "session_id": session_id,
            "sentiment_summary": summary
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sentiment summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")


@router.get("/sentiment/detailed/{session_id}", summary="Get detailed sentiment analysis with AI insights")
async def get_detailed_sentiment_analysis(
    session_id: str,
    column_name: str = None,
    sentiment_type: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed flagged rows by sentiment type with AI-generated insights.
    
    Args:
        session_id: The session ID
        column_name: Text column name to analyze
        sentiment_type: 'positive', 'negative', or 'neutral'
        
    Returns:
        Detailed rows with AI summary and insights
    """
    try:
        from app.services.sentiment_insights import SentimentInsightsGenerator
        
        logger.info(f"Getting detailed sentiment analysis for session {session_id}")
        logger.info(f"Params: column_name={column_name}, sentiment_type={sentiment_type}")
        
        # Fetch session
        result = await db.execute(
            select(DataSession).where(DataSession.session_id == session_id)
        )
        session = result.scalars().first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not session.cleaned_file_path:
            raise HTTPException(status_code=400, detail="No data available for analysis")
        
        logger.info(f"Loading data from: {session.cleaned_file_path}")
        
        # Load data
        df = pd.read_csv(session.cleaned_file_path)
        logger.info(f"Loaded DataFrame with shape: {df.shape}, columns: {df.columns.tolist()}")
        
        if not column_name:
            # Get first text column
            sentiment_cols = [col for col in df.columns if col.endswith('_sentiment')]
            logger.info(f"Found sentiment columns: {sentiment_cols}")
            if not sentiment_cols:
                raise HTTPException(status_code=404, detail="No sentiment data available")
            column_name = sentiment_cols[0].replace('_sentiment', '')
            logger.info(f"Auto-selected column: {column_name}")
        
        if sentiment_type not in ['positive', 'negative', 'neutral']:
            raise HTTPException(status_code=400, detail="Invalid sentiment type")
        
        # Extract flagged rows
        insights_gen = SentimentInsightsGenerator()
        flagged_rows = insights_gen.extract_flagged_rows(df, column_name, sentiment_type)
        
        logger.info(f"Extracted {len(flagged_rows)} rows for sentiment '{sentiment_type}'")
        
        if not flagged_rows:
            return {
                "status": "success",
                "session_id": session_id,
                "column_name": column_name,
                "sentiment_type": sentiment_type,
                "count": 0,
                "rows": [],
                "summary": "No entries found for this sentiment type.",
                "insights": {}
            }
        
        # Extract texts for analysis
        texts = [row['text'] for row in flagged_rows]
        
        # Generate AI insights — await the async Groq LLM call properly
        analysis = await insights_gen.analyze_by_category_async(texts, sentiment_type)

        
        return {
            "status": "success",
            "session_id": session_id,
            "column_name": column_name,
            "sentiment_type": sentiment_type,
            "count": len(flagged_rows),
            "rows": flagged_rows,
            # Top-level fields consumed directly by the new modal
            "domain": analysis.get('domain', ''),
            "summary": analysis.get('summary', ''),
            "themes": analysis.get('themes', []),
            # Negative-specific
            "problems": analysis.get('problems', []),
            "workarounds": analysis.get('workarounds', []),
            "actionable_insights": analysis.get('actionable_insights', []),
            # Positive-specific
            "strengths": analysis.get('strengths', []),
            "why_satisfied": analysis.get('why_satisfied', ''),
            "standout_quotes": analysis.get('standout_quotes', []),
            # Neutral-specific
            "mixed_signals": analysis.get('mixed_signals', []),
            "opportunities": analysis.get('opportunities', []),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting detailed sentiment analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detailed analysis failed: {str(e)}")
