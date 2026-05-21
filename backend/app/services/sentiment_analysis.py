"""
StatsFlow Sentiment Analysis Service
-------------------------------------
Analyzes text columns in datasets and assigns sentiment labels
(positive/negative/neutral) with confidence scores.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any
from textblob import TextBlob
from nltk.sentiment import SentimentIntensityAnalyzer
import nltk
import logging

logger = logging.getLogger(__name__)

# Download required NLTK data
try:
    nltk.data.find('sentiment/vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)


class SentimentAnalyzer:
    """Analyzes sentiment in text data using multiple methods."""
    
    def __init__(self):
        """Initialize sentiment analyzer."""
        self.vader = SentimentIntensityAnalyzer()
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of a single text string.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dict with sentiment label and confidence score
        """
        if not text or not isinstance(text, str) or len(text.strip()) == 0:
            return {
                'sentiment': 'neutral',
                'confidence': 0.0,
                'polarity': 0.0,
                'subjectivity': 0.0
            }
        
        try:
            # Use VADER for initial sentiment scoring
            vader_scores = self.vader.polarity_scores(text)
            compound = vader_scores['compound']
            
            # Use TextBlob for polarity and subjectivity
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity
            
            # Determine sentiment label based on compound score
            if compound >= 0.05:
                sentiment = 'positive'
                confidence = vader_scores['pos']
            elif compound <= -0.05:
                sentiment = 'negative'
                confidence = vader_scores['neg']
            else:
                sentiment = 'neutral'
                confidence = vader_scores['neu']
            
            return {
                'sentiment': sentiment,
                'confidence': round(confidence, 4),
                'polarity': round(polarity, 4),
                'subjectivity': round(subjectivity, 4),
                'compound_score': round(compound, 4)
            }
        except Exception as e:
            logger.warning(f"Error analyzing sentiment for text: {str(e)}")
            return {
                'sentiment': 'neutral',
                'confidence': 0.0,
                'polarity': 0.0,
                'subjectivity': 0.0,
                'compound_score': 0.0
            }
    
    def analyze_column(self, df: pd.DataFrame, column_name: str) -> pd.DataFrame:
        """
        Analyze sentiment for all entries in a text column.
        
        Args:
            df: DataFrame containing the text column
            column_name: Name of the column to analyze
            
        Returns:
            DataFrame with added sentiment columns
        """
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found in DataFrame")
        
        # Analyze each text entry
        results = []
        for text in df[column_name]:
            result = self.analyze_text(str(text) if pd.notna(text) else "")
            results.append(result)
        
        # Create results dataframe
        results_df = pd.DataFrame(results)
        
        # Add to original dataframe with prefixed column names
        df[f'{column_name}_sentiment'] = results_df['sentiment']
        df[f'{column_name}_confidence'] = results_df['confidence']
        df[f'{column_name}_polarity'] = results_df['polarity']
        df[f'{column_name}_subjectivity'] = results_df['subjectivity']
        
        return df
    
    def get_sentiment_summary(self, df: pd.DataFrame, sentiment_column: str) -> Dict[str, Any]:
        """
        Generate summary statistics for sentiment analysis.
        
        Args:
            df: DataFrame with sentiment column
            sentiment_column: Name of the sentiment column
            
        Returns:
            Dict with sentiment distribution and statistics
        """
        if sentiment_column not in df.columns:
            return {}
        
        sentiment_counts = df[sentiment_column].value_counts().to_dict()
        total = len(df)
        
        # Get confidence stats
        confidence_col = sentiment_column.replace('_sentiment', '_confidence')
        confidence_stats = {}
        if confidence_col in df.columns:
            confidence_stats = {
                'avg_confidence': round(df[confidence_col].mean(), 4),
                'max_confidence': round(df[confidence_col].max(), 4),
                'min_confidence': round(df[confidence_col].min(), 4),
            }
        
        return {
            'total_analyzed': total,
            'distribution': {
                'positive': sentiment_counts.get('positive', 0),
                'negative': sentiment_counts.get('negative', 0),
                'neutral': sentiment_counts.get('neutral', 0),
            },
            'percentages': {
                'positive': round((sentiment_counts.get('positive', 0) / total * 100), 2) if total > 0 else 0,
                'negative': round((sentiment_counts.get('negative', 0) / total * 100), 2) if total > 0 else 0,
                'neutral': round((sentiment_counts.get('neutral', 0) / total * 100), 2) if total > 0 else 0,
            },
            'confidence_stats': confidence_stats
        }
    
    def identify_text_columns(self, df: pd.DataFrame) -> List[str]:
        """
        Identify columns that contain text data suitable for sentiment analysis.
        Uses both dtype heuristics AND column-name keywords for robust detection.
        """
        TEXT_NAME_KEYWORDS = {
            'review', 'comment', 'feedback', 'text', 'description', 'message',
            'note', 'opinion', 'remark', 'response', 'answer', 'content',
            'summary', 'title', 'subject', 'body', 'narrative', 'testimonial',
            'complaint', 'suggestion', 'reason', 'detail', 'tweet', 'post',
        }

        text_columns = []

        for col in df.columns:
            col_lower = col.lower().strip()

            # Skip obviously numeric / datetime types
            if pd.api.types.is_numeric_dtype(df[col]):
                continue
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                continue

            # --- Heuristic 1: column name contains a text-related keyword ---
            if any(kw in col_lower for kw in TEXT_NAME_KEYWORDS):
                # Still verify it has at least some non-null string content
                non_null = df[col].dropna()
                if len(non_null) > 0:
                    # Cast to str to handle any mixed-type remnants from CSV reading
                    str_vals = non_null.astype(str)
                    str_vals = str_vals[str_vals.str.strip() != '']
                    if len(str_vals) > 0 and str_vals.str.len().mean() > 2:
                        text_columns.append(col)
                        continue

            # --- Heuristic 2: object dtype with substantial string content ---
            if df[col].dtype == object:
                non_null = df[col].dropna()
                if len(non_null) == 0:
                    continue

                # Sample up to 20 rows; cast to str to handle mixed types safely
                sample = non_null.head(20).astype(str)
                sample = sample[sample.str.strip() != '']

                if len(sample) == 0:
                    continue

                avg_length = sample.str.len().mean()

                # Require average length > 3 chars (catches even short reviews)
                # And that the column has enough non-null rows (>= 20% of df)
                non_null_ratio = len(non_null) / max(len(df), 1)
                if avg_length > 3 and non_null_ratio >= 0.2:
                    # Extra gate: at least 5 chars on average in first sample
                    if avg_length >= 5:
                        text_columns.append(col)

        return text_columns




def analyze_sentiment_in_dataframe(df: pd.DataFrame, columns: List[str] = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Analyze sentiment for specified or all text columns in a DataFrame.
    
    Args:
        df: DataFrame to analyze
        columns: List of column names to analyze, or None to auto-detect
        
    Returns:
        Tuple of (modified DataFrame with sentiment columns, analysis summary)
    """
    analyzer = SentimentAnalyzer()
    
    # Auto-detect text columns if not specified
    if columns is None:
        columns = analyzer.identify_text_columns(df)
    
    if not columns:
        return df, {}
    
    analysis_summary = {}
    
    for col in columns:
        if col not in df.columns:
            logger.warning(f"Column '{col}' not found, skipping")
            continue
        
        try:
            df = analyzer.analyze_column(df, col)
            sentiment_col = f'{col}_sentiment'
            summary = analyzer.get_sentiment_summary(df, sentiment_col)
            analysis_summary[col] = summary
            logger.info(f"Sentiment analysis completed for column: {col}")
        except Exception as e:
            logger.error(f"Error analyzing sentiment for column '{col}': {str(e)}")
    
    return df, analysis_summary
