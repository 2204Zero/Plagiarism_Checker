import json
import os
import sys
import subprocess
import tempfile
from typing import Dict, Any, List


CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
	sys.path.append(CURRENT_DIR)

BIN_DIR = os.path.join(CURRENT_DIR, "bin")
CPP_BIN = os.path.join(BIN_DIR, "cpp_checker.exe" if os.name == "nt" else "cpp_checker")


def _run_cpp_checker(text_a: str, text_b: str) -> Dict[str, Any]:
	"""Compile-time dependency: expects C++ checker binary present in bin/"""
	# Write temporary files for the C++ checker
	with tempfile.NamedTemporaryFile(delete=False, suffix="_a.txt", mode="w", encoding="utf-8") as fa:
		fa.write(text_a)
		path_a = fa.name
	with tempfile.NamedTemporaryFile(delete=False, suffix="_b.txt", mode="w", encoding="utf-8") as fb:
		fb.write(text_b)
		path_b = fb.name

	try:
		if not os.path.exists(CPP_BIN):
			return {"localScore": 0.0, "error": f"C++ binary not found at {CPP_BIN}"}
		proc = subprocess.run([CPP_BIN, path_a, path_b], capture_output=True, text=True, check=False)
		stdout = proc.stdout.strip()
		# Expected output: {"localScore": <number>, "matches": [...], ...}
		try:
			parsed = json.loads(stdout) if stdout else {"localScore": 0.0}
		except json.JSONDecodeError:
			parsed = {"localScore": 0.0, "raw": stdout}
		return parsed
	finally:
		for p in (path_a, path_b):
			try:
				os.remove(p)
			except OSError:
				pass


def run_checks(*, file_a_path: str, file_b_path: str, text_b: str, mode: str) -> Dict[str, Any]:
    """
    Compare two files using local comparison and AI semantic analysis.
    Returns a unified JSON with scores and highlights.
    """
    # Only support local mode now
    if mode != "local":
        return {"error": "Only local mode is supported"}

    text_a = ""
    if file_a_path and os.path.exists(file_a_path):
        with open(file_a_path, "r", encoding="utf-8", errors="ignore") as f:
            text_a = f.read()
    text_b_val = ""
    if file_b_path and os.path.exists(file_b_path):
        with open(file_b_path, "r", encoding="utf-8", errors="ignore") as f:
            text_b_val = f.read()
    if not text_b_val:
        text_b_val = text_b or ""

    if not text_a or not text_b_val:
        return {"error": "Both files are required for comparison"}

    cpp_result: Dict[str, Any] = {"localScore": 0.0, "matches": []}

    try:
        # Run C++ checker for exact matches only
        cpp_result = _run_cpp_checker(text_a, text_b_val)
    except Exception as e:
        return {"error": f"Check failed: {str(e)}"}

    # Use only local score (no AI)
    overall = float(cpp_result.get("localScore", 0.0))

    # Process local matches only
    local_highlights: List[Dict[str, Any]] = []
    
    for m in cpp_result.get("matches", []) or []:
        try:
            local_highlights.append({
                "start": int(m.get("startB", 0)),
                "end": int(m.get("endB", 0)),
                "source": "local",
                "score": cpp_result.get("localScore", 0.0),
                "textA": m.get("textA", ""),
                "textB": m.get("textB", ""),
                "lineA": int(m.get("lineA", 0)),
                "lineB": int(m.get("lineB", 0)),
                "matchType": "exact"
            })
        except Exception:
            pass

    return {
        "overallScore": overall,
        "localScore": cpp_result.get("localScore", 0.0),
        "aiScore": 0.0,  # No AI
        "webScore": 0.0,  # No web checking
        "webSources": [],  # No web sources
        "highlights": local_highlights,
        "localHighlights": local_highlights,
        "aiHighlights": [],  # No AI highlights
        "webHighlights": [],  # No web highlights
        "mode": "local"
    }


