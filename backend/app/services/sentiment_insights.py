"""
StatsFlow Sentiment Insights Service
-------------------------------------
Provides detailed insights and AI-powered analysis for sentiment data.
Uses Groq LLM (llama-3.3-70b-versatile) for domain-aware text summarization,
workaround generation, and actionable insights based on actual text content.
"""

import json
import asyncio
import pandas as pd
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


def _get_groq_client():
    """Lazily initialize the Groq OpenAI-compatible client."""
    try:
        from openai import AsyncOpenAI
        from app.config import settings

        api_key = (settings.groq_api_key or "").strip()
        base_url = (settings.groq_base_url or "https://api.groq.com/openai/v1").strip()

        if not api_key:
            logger.warning("GROQ_API_KEY not set — AI insights unavailable")
            return None, None

        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        model = (settings.chat_model or "llama-3.3-70b-versatile").strip()
        return client, model
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
        return None, None


async def _call_groq_llm(system_prompt: str, user_prompt: str, max_tokens: int = 900) -> str:
    """
    Call the Groq LLM and return the raw text response.
    Returns empty string on failure.
    """
    client, model = _get_groq_client()
    if client is None:
        return ""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=max_tokens,
            timeout=25,
        )
        result = (response.choices[0].message.content or "").strip()
        logger.info(f"Groq LLM response (first 300 chars): {result[:300]}")
        return result
    except Exception as e:
        logger.error(f"Groq LLM call failed: {e}")
        return ""


class SentimentInsightsGenerator:
    """Generates AI insights for sentiment analysis results using Groq LLM."""

    def __init__(self):
        pass

    def extract_flagged_rows(
        self,
        df: pd.DataFrame,
        column_name: str,
        sentiment_type: str,
    ) -> List[Dict[str, Any]]:
        """
        Extract rows matching a specific sentiment type.

        Args:
            df: DataFrame with sentiment analysis columns
            column_name: Text column name analyzed
            sentiment_type: 'positive', 'negative', or 'neutral'

        Returns:
            List of rows with text and sentiment data
        """
        try:
            sentiment_col = f"{column_name}_sentiment"
            confidence_col = f"{column_name}_confidence"

            logger.info(f"Extracting rows for {column_name}: looking for {sentiment_col}")
            logger.info(f"Available columns: {df.columns.tolist()}")

            if sentiment_col not in df.columns:
                logger.warning(f"Sentiment column '{sentiment_col}' not found in DataFrame")
                return []

            filtered = df[df[sentiment_col].astype(str).str.lower() == sentiment_type.lower()].copy()
            logger.info(f"Found {len(filtered)} rows with sentiment '{sentiment_type}'")

            rows = []
            for idx, row in filtered.iterrows():
                text = row[column_name]
                if pd.isna(text) or not str(text).strip():
                    continue
                rows.append({
                    "index": int(idx),
                    "text": str(text),
                    "sentiment": row[sentiment_col],
                    "confidence": float(row[confidence_col])
                    if confidence_col in row and pd.notna(row[confidence_col])
                    else 0.0,
                })

            logger.info(f"Extracted {len(rows)} valid rows")
            return rows

        except Exception as e:
            logger.error(f"Error extracting flagged rows: {str(e)}", exc_info=True)
            return []

    # ------------------------------------------------------------------
    # Public synchronous wrapper — called from the FastAPI router (sync)
    # ------------------------------------------------------------------
    async def analyze_by_category_async(
        self,
        texts: List[str],
        sentiment_type: str,
        data_context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Async version — called directly from FastAPI async routes via await.
        Uses Groq LLM for domain-aware, content-specific analysis.
        """
        if not texts:
            return {
                "summary": "No data available.",
                "count": 0,
                "workarounds": [],
                "themes": [],
                "strengths": [],
                "why_satisfied": "",
                "actionable_insights": [],
            }
        try:
            return await self._async_analyze(texts, sentiment_type, data_context)
        except Exception as e:
            logger.error(f"analyze_by_category_async failed: {e}", exc_info=True)
            return self._fallback_analysis(texts, sentiment_type)

    def analyze_by_category(
        self,
        texts: List[str],
        sentiment_type: str,
        data_context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Sync wrapper — uses keyword-based fallback only.
        The async version is preferred; call analyze_by_category_async from async contexts.
        """
        return self._fallback_analysis(texts, sentiment_type)

    # ------------------------------------------------------------------
    # Internal async AI analysis pipeline
    # ------------------------------------------------------------------
    async def _async_analyze(
        self,
        texts: List[str],
        sentiment_type: str,
        data_context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Core async method that calls the LLM for rich analysis."""

        # Sample up to 15 texts, each capped at 200 chars, to stay within token limits
        sample_texts = [str(t)[:200] for t in texts[:15]]
        combined = "\n".join(f"- {t}" for t in sample_texts)
        total = len(texts)

        system_prompt = (
            "You are an expert data analyst specializing in text analysis and actionable business insights. "
            "You analyze user-provided textual data (reviews, comments, feedback, survey responses, etc.) "
            "and produce structured JSON insights. "
            "Always infer the domain (e-commerce, HR, hospitality, software, healthcare, etc.) "
            "from the actual text content — do NOT assume a domain. "
            "Be specific and reference actual words/phrases from the texts. "
            "Return ONLY valid JSON. No markdown, no explanation outside JSON."
        )

        if sentiment_type == "negative":
            user_prompt = f"""Analyze these {total} NEGATIVE feedback entries and return a JSON object with these keys:

"domain": (string) inferred domain/industry (e.g., "e-commerce product reviews", "hotel reviews", "software feedback", "HR survey")
"summary": (string) 2-3 sentence overview of the main complaints. Be specific — reference actual problems mentioned.
"themes": (array of strings) up to 5 distinct recurring problem themes found in the texts
"problems": (array of objects) each with "issue" (specific problem), "frequency_hint" (how common it seems), "example_quote" (short quote from actual text)
"workarounds": (array of strings) 4-6 concrete, actionable improvement suggestions directly based on the complaints
"actionable_insights": (array of strings) 3-5 immediate action items for the team/business

Texts to analyze:
{combined}

Return ONLY the JSON object."""

        elif sentiment_type == "positive":
            user_prompt = f"""Analyze these {total} POSITIVE feedback entries and return a JSON object with these keys:

"domain": (string) inferred domain/industry
"summary": (string) 2-3 sentence overview of what customers/users love. Reference specific things mentioned.
"themes": (array of strings) up to 5 recurring positive themes
"strengths": (array of strings) 4-6 specific strengths or aspects being praised (from actual text)
"why_satisfied": (string) 1-2 sentence explanation of the core reason for satisfaction
"standout_quotes": (array of strings) 2-3 short representative positive quotes from the texts

Texts to analyze:
{combined}

Return ONLY the JSON object."""

        else:  # neutral
            user_prompt = f"""Analyze these {total} NEUTRAL feedback entries and return a JSON object with these keys:

"domain": (string) inferred domain/industry
"summary": (string) 2-3 sentence overview of what these neutral responses indicate
"themes": (array of strings) up to 5 recurring themes
"mixed_signals": (array of strings) aspects where opinion seems divided
"opportunities": (array of strings) 3-4 areas that could be improved to convert neutral to positive

Texts to analyze:
{combined}

Return ONLY the JSON object."""

        raw = await _call_groq_llm(system_prompt, user_prompt, max_tokens=1000)

        if not raw:
            logger.warning("LLM returned empty response — using fallback")
            return self._fallback_analysis(texts, sentiment_type)

        parsed = self._parse_llm_json(raw)
        if not parsed:
            logger.warning(f"Failed to parse LLM JSON: {raw[:200]}")
            return self._fallback_analysis(texts, sentiment_type)

        # Normalize output to a consistent shape
        return self._normalize_parsed(parsed, sentiment_type, len(texts))

    def _parse_llm_json(self, raw: str) -> Dict[str, Any]:
        """Attempt to parse JSON from LLM response, handling common edge cases."""
        text = raw.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last fence lines
            inner = []
            in_block = False
            for line in lines:
                if line.startswith("```"):
                    in_block = not in_block
                    continue
                if in_block or not line.startswith("```"):
                    inner.append(line)
            text = "\n".join(inner).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON object from text
            import re
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
        return {}

    def _normalize_parsed(
        self, parsed: Dict[str, Any], sentiment_type: str, count: int
    ) -> Dict[str, Any]:
        """Normalize LLM output to a consistent structure."""
        base = {
            "count": count,
            "domain": parsed.get("domain", ""),
            "summary": parsed.get("summary", ""),
            "themes": parsed.get("themes", [])[:5],
        }

        if sentiment_type == "negative":
            base["workarounds"] = parsed.get("workarounds", [])
            base["actionable_insights"] = parsed.get("actionable_insights", [])
            base["problems"] = parsed.get("problems", [])
            base["strengths"] = []
            base["why_satisfied"] = ""
        elif sentiment_type == "positive":
            base["strengths"] = parsed.get("strengths", [])
            base["why_satisfied"] = parsed.get("why_satisfied", "")
            base["standout_quotes"] = parsed.get("standout_quotes", [])
            base["workarounds"] = []
            base["actionable_insights"] = []
        else:
            base["mixed_signals"] = parsed.get("mixed_signals", [])
            base["opportunities"] = parsed.get("opportunities", [])
            base["workarounds"] = []
            base["actionable_insights"] = []
            base["strengths"] = []
            base["why_satisfied"] = ""

        return base

    def _fallback_analysis(self, texts: List[str], sentiment_type: str) -> Dict[str, Any]:
        """Keyword-based fallback when LLM is unavailable."""
        all_text = " ".join(texts).lower()

        themes = self._extract_themes(texts)
        base = {
            "count": len(texts),
            "domain": "General",
            "summary": f"Analysis of {len(texts)} {sentiment_type} entries. "
            f"Key topics: {', '.join(themes[:3]) if themes else 'various subjects'}.",
            "themes": themes,
        }

        if sentiment_type == "negative":
            base["workarounds"] = self._keyword_workarounds(all_text)
            base["actionable_insights"] = self._keyword_workarounds(all_text)[:3]
            base["problems"] = []
            base["strengths"] = []
            base["why_satisfied"] = ""
        elif sentiment_type == "positive":
            base["strengths"] = self._keyword_strengths(all_text)
            base["why_satisfied"] = "Customers are generally satisfied with the product/service."
            base["standout_quotes"] = []
            base["workarounds"] = []
            base["actionable_insights"] = []
        else:
            base["mixed_signals"] = ["Mixed opinions detected"]
            base["opportunities"] = ["Gather more detailed feedback"]
            base["workarounds"] = []
            base["actionable_insights"] = []
            base["strengths"] = []
            base["why_satisfied"] = ""

        return base

    # ------------------------------------------------------------------
    # Legacy keyword-based helpers (used as fallback)
    # ------------------------------------------------------------------
    def _extract_themes(self, texts: List[str]) -> List[str]:
        try:
            all_text = " ".join(texts).lower()
            theme_keywords = {
                "Quality": ["quality", "durable", "material", "build", "solid"],
                "Performance": ["fast", "slow", "speed", "lag", "responsive", "performance"],
                "Design": ["design", "look", "aesthetic", "beautiful", "ugly", "appearance"],
                "Usability": ["easy", "simple", "complicated", "intuitive", "confusing"],
                "Price": ["price", "expensive", "cheap", "affordable", "cost", "value"],
                "Support": ["support", "help", "service", "customer", "assistance"],
                "Durability": ["break", "broke", "lasted", "durable", "wear"],
            }
            return [t for t, kws in theme_keywords.items() if any(k in all_text for k in kws)][:5]
        except Exception:
            return []

    def _keyword_workarounds(self, all_text: str) -> List[str]:
        problem_solutions = {
            ("poor quality", "low quality", "cheap", "breaks", "broken"): [
                "Improve material quality and durability",
                "Enhance manufacturing quality control processes",
                "Add warranty or quality guarantee",
            ],
            ("slow", "lag", "freeze", "crash"): [
                "Optimize performance and response speed",
                "Reduce memory usage and resource consumption",
                "Release stability patches",
            ],
            ("expensive", "overpriced", "too much", "not worth"): [
                "Review pricing strategy or offer discounts",
                "Provide better value-added features",
                "Create tiered pricing options",
            ],
            ("confusing", "complicated", "hard to use", "difficult"): [
                "Improve user interface and onboarding",
                "Provide better documentation and tutorials",
                "Simplify setup process",
            ],
        }
        workarounds = []
        for problems, solutions in problem_solutions.items():
            if any(p in all_text for p in problems):
                workarounds.extend(solutions)
        return list(dict.fromkeys(workarounds))[:5] or [
            "Gather more detailed feedback on specific pain points",
            "Conduct user research to identify root causes",
            "Prioritize improvements based on complaint frequency",
        ]

    def _keyword_strengths(self, all_text: str) -> List[str]:
        strength_map = {
            "Excellent Quality": ["excellent", "great quality", "high quality", "durable"],
            "Fast Performance": ["fast", "quick", "responsive", "smooth"],
            "Great Design": ["design", "beautiful", "elegant", "looks great"],
            "Easy to Use": ["easy", "simple", "intuitive", "user-friendly"],
            "Good Value": ["value", "worth", "affordable", "good price"],
        }
        return [s for s, kws in strength_map.items() if any(k in all_text for k in kws)][:5]

    # ------------------------------------------------------------------
    # Legacy public methods (kept for backward compatibility)
    # ------------------------------------------------------------------
    def summarize_texts(self, texts: List[str]) -> str:
        result = self._fallback_analysis(texts, "neutral")
        return result.get("summary", "No summary available.")

    def generate_workarounds(self, texts: List[str], data_context=None) -> List[str]:
        all_text = " ".join(texts).lower()
        return self._keyword_workarounds(all_text)
