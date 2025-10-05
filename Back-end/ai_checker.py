from typing import Tuple, List, Dict, Any
import os
import math
import re

_model = None


def _lazy_model():
	global _model
	if _model is None:
		try:
			from sentence_transformers import SentenceTransformer  # type: ignore
			_model = SentenceTransformer('all-MiniLM-L6-v2')
		except Exception as e:
			_model = None
	return _model


def _chunk_text(text: str, max_chars: int = 500):
	text = text or ""
	if len(text) <= max_chars:
		return [text]
	# Split on sentence boundaries where possible
	sentences = re.split(r"(?<=[.!?])\s+", text)
	chunks = []
	current = ""
	for s in sentences:
		if len(current) + len(s) + 1 <= max_chars:
			current = (current + " " + s).strip() if current else s
		else:
			if current:
				chunks.append(current)
			current = s
	if current:
		chunks.append(current)
	return chunks


def semantic_similarity(text1: str, text2: str) -> Tuple[float, List[Dict[str, Any]]]:
	"""
	Compute chunked semantic similarity using sentence-transformers.
	Returns (score_percent, highlights) where highlights contain start-end ranges of suspected matches in text2.
	"""
	model = _lazy_model()
	if model is None:
		return 0.0, []
	chunks1 = _chunk_text(text1)
	chunks2 = _chunk_text(text2)
	if not chunks1 or not chunks2:
		return 0.0, []
	from sentence_transformers import util  # type: ignore
	emb1 = model.encode(chunks1, convert_to_tensor=True, normalize_embeddings=True)
	emb2 = model.encode(chunks2, convert_to_tensor=True, normalize_embeddings=True)
	sim = util.cos_sim(emb1, emb2).cpu().numpy()  # shape: [len(chunks1), len(chunks2)]

	# For each chunk in text1, find best match in text2
	best_scores = []
	highlights = []
	pos_map = []
	# map chunk2 indexes to char ranges in text2
	start = 0
	for ch in chunks2:
		end = start + len(ch)
		pos_map.append((start, end))
		# assume 1 char separator added in chunking
		start = end + 1
	for i in range(len(chunks1)):
		row = sim[i]
		j = int(row.argmax())
		score = float(row[j])
		best_scores.append(score)
		start2, end2 = pos_map[j]
		# Extract the actual text for this chunk
		chunk_text = chunks2[j] if j < len(chunks2) else ""
		highlights.append({
			"start": start2,
			"end": end2,
			"score": max(0.0, min(100.0, score * 100.0)),
			"source": "ai",
			"textA": chunks1[i] if i < len(chunks1) else "",
			"textB": chunk_text,
			"lineA": 0,  # AI doesn't track line numbers
			"lineB": 0,
			"matchType": "semantic"
		})
	avg = sum(best_scores) / max(1, len(best_scores))
	return max(0.0, min(100.0, avg * 100.0)), highlights


def check_web_sources(text: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
	"""
	Search web via SerpAPI or Bing and compute semantic similarity per result.
	Requires SERPAPI_KEY or BING_API_KEY in environment. Returns (sources, highlights).
	"""
	api_key = os.getenv("SERPAPI_KEY") or os.getenv("BING_API_KEY")
	if not api_key or not text:
		return [], []
	import requests
	results = []
	try:
		if os.getenv("SERPAPI_KEY"):
			params = {"engine": "google", "q": text[:128], "api_key": os.getenv("SERPAPI_KEY"), "num": 5}
			resp = requests.get("https://serpapi.com/search.json", params=params, timeout=15)
			data = resp.json()
			for item in (data.get("organic_results") or [])[:5]:
				results.append({"title": item.get("title"), "url": item.get("link")})
		elif os.getenv("BING_API_KEY"):
			headers = {"Ocp-Apim-Subscription-Key": os.getenv("BING_API_KEY")}
			params = {"q": text[:128], "count": 5}
			resp = requests.get("https://api.bing.microsoft.com/v7.0/search", headers=headers, params=params, timeout=15)
			data = resp.json()
			for item in (data.get("webPages", {}).get("value", []))[:5]:
				results.append({"title": item.get("name"), "url": item.get("url")})
	except Exception:
		return [], []

	# Fetch and score
	sources = []
	highlights = []
	for r in results:
		try:
			page = requests.get(r["url"], timeout=15)
			content = re.sub(r"<[^>]+>", " ", page.text)
			score, hl = semantic_similarity(text, content)
			if score > 0:
				sources.append({"title": r.get("title"), "url": r.get("url"), "score": score})
				for h in hl:
					h_copy = dict(h)
					h_copy["source"] = r.get("url")
					highlights.append(h_copy)
		except Exception:
			continue
	return sources, highlights


