import requests
import logging
import re
import urllib.parse

logger = logging.getLogger(__name__)

def perform_web_search(query: str, max_results: int = 3) -> str:
    """
    Performs a lightweight web search using DuckDuckGo HTML Lite version.
    Returns a concatenated string of the top search result snippets.
    """
    try:
        url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        data = {
            "q": query,
            "b": ""
        }
        
        response = requests.post(url, headers=headers, data=data, timeout=5)
        if response.status_code != 200:
            return ""
            
        # Extract snippets using regex since bs4 is not installed
        html = response.text
        # Find all a tags with class result__snippet
        pattern = re.compile(r'<a class="result__snippet[^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
        matches = pattern.findall(html)
        
        snippets = []
        for match in matches[:max_results]:
            # Remove bold tags and HTML entities
            clean_text = re.sub(r'<[^>]+>', '', match)
            clean_text = clean_text.replace('<b>', '').replace('</b>', '')
            clean_text = clean_text.replace('&#x27;', "'").replace('&quot;', '"')
            snippets.append(clean_text.strip())
        
        if not snippets:
            return ""
            
        return " | ".join(snippets)
    except Exception as e:
        logger.warning(f"Web search failed for query '{query}': {e}")
        return ""
