import importlib
import json
import os
import sys
import subprocess
import tempfile
import difflib
from bisect import bisect_right
from typing import Dict, Any, List, Optional


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

    def _extract_docx_text(path: str) -> str:
        try:
            from docx import Document  # type: ignore
            doc = Document(path)
            return "\n".join([p.text for p in doc.paragraphs if p.text])
        except Exception:
            return ""

    def _extract_doc_text(path: str) -> str:
        """
        Attempt to extract text from legacy .doc files using textract if available.
        Falls back to empty string when parsing fails or the dependency is missing.
        """
        try:
            textract = importlib.import_module("textract")  # type: ignore
        except ModuleNotFoundError:
            return ""
        try:
            extracted = textract.process(path)
        except Exception:
            return ""
        if isinstance(extracted, bytes):
            return extracted.decode("utf-8", errors="ignore")
        return str(extracted)

    def read_file_text(path: Optional[str]) -> str:
        if not path or not os.path.exists(path):
            return ""
        ext = os.path.splitext(path)[1].lower()
        try:
            if ext == ".docx":
                docx_text = _extract_docx_text(path)
                if docx_text:
                    return docx_text
            if ext == ".doc":
                doc_text = _extract_doc_text(path)
                if doc_text:
                    return doc_text
            # Fallback: treat as text
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""

    text_a = read_file_text(file_a_path)
    text_b_val = read_file_text(file_b_path)
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

    # Process local matches only, merging contiguous spans for clarity
    raw_matches: List[Dict[str, Any]] = list(cpp_result.get("matches", []) or [])

    # Fallback: if C++ binary returns tiny windowed matches, extend them using Python
    def _preprocess_with_map(s: str) -> tuple[str, List[int]]:
        out = []
        idx_map: List[int] = []
        last_space = False
        for i, ch in enumerate(s):
            if ch == "\n":
                out.append("\n")
                idx_map.append(i)
                last_space = False
            elif ch.isspace():
                if not last_space:
                    out.append(" ")
                    idx_map.append(i)
                    last_space = True
            else:
                out.append(ch.lower())
                idx_map.append(i)
                last_space = False
        return ("".join(out), idx_map)

    def _extend_span_list(spans: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        procA, mapA = _preprocess_with_map(text_a)
        procB, mapB = _preprocess_with_map(text_b_val)
        extended: List[Dict[str, Any]] = []
        last_end_b = -1
        for m in sorted(spans, key=lambda x: int(x.get("startB", 0))):
            sa = int(m.get("startA", 0))
            sb = int(m.get("startB", 0))
            ea = int(m.get("endA", 0))
            eb = int(m.get("endB", 0))
            # Backward extend
            while sa > 0 and sb > 0 and procA[sa - 1] == procB[sb - 1]:
                sa -= 1
                sb -= 1
            # Forward extend
            while ea < len(procA) and eb < len(procB) and procA[ea] == procB[eb]:
                ea += 1
                eb += 1
            # Deduplicate overlapping on B
            if last_end_b >= 0 and sb <= last_end_b:
                if extended and eb > int(extended[-1].get("endB", 0)):
                    extended[-1]["endA"] = ea
                    extended[-1]["endB"] = eb
                    # update raw slices/text using maps
                    raw_start_a = mapA[extended[-1]["startA"]]
                    raw_end_a = mapA[min(extended[-1]["endA"] - 1, len(mapA) - 1)] + 1
                    raw_start_b = mapB[extended[-1]["startB"]]
                    raw_end_b = mapB[min(extended[-1]["endB"] - 1, len(mapB) - 1)] + 1
                    extended[-1]["rawStartA"] = raw_start_a
                    extended[-1]["rawEndA"] = raw_end_a
                    extended[-1]["rawStartB"] = raw_start_b
                    extended[-1]["rawEndB"] = raw_end_b
                    extended[-1]["textA"] = text_a[raw_start_a:raw_end_a]
                    extended[-1]["textB"] = text_b_val[raw_start_b:raw_end_b]
                continue
            # map to raw indices
            raw_start_a = mapA[sa]
            raw_end_a = mapA[min(ea - 1, len(mapA) - 1)] + 1
            raw_start_b = mapB[sb]
            raw_end_b = mapB[min(eb - 1, len(mapB) - 1)] + 1
            extended.append({
                "startA": sa, "endA": ea, "startB": sb, "endB": eb,
                "textA": text_a[raw_start_a:raw_end_a],
                "textB": text_b_val[raw_start_b:raw_end_b],
                "rawStartA": raw_start_a,
                "rawEndA": raw_end_a,
                "rawStartB": raw_start_b,
                "rawEndB": raw_end_b,
                "lineA": int(m.get("lineA", 0)),
                "lineB": int(m.get("lineB", 0)),
            })
            last_end_b = max(last_end_b, eb)
        return extended

    if raw_matches:
        raw_matches = _extend_span_list(raw_matches)

    def merge_spans(spans: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        spans = sorted(spans, key=lambda x: (int(x.get("lineB", 0)), int(x.get("startB", 0))))
        merged: List[Dict[str, Any]] = []
        for m in spans:
            if not merged:
                merged.append(dict(m))
                continue
            prev = merged[-1]
            same_lines = int(prev.get("lineA", -1)) == int(m.get("lineA", -2)) and int(prev.get("lineB", -1)) == int(m.get("lineB", -2))
            close = int(m.get("startB", 0)) <= int(prev.get("endB", 0)) + 4 and int(m.get("startA", 0)) <= int(prev.get("endA", 0)) + 4
            if same_lines and close:
                prev["endB"] = max(int(prev.get("endB", 0)), int(m.get("endB", 0)))
                prev["endA"] = max(int(prev.get("endA", 0)), int(m.get("endA", 0)))
                prev["rawStartA"] = min(int(prev.get("rawStartA", prev["startA"])), int(m.get("rawStartA", m.get("startA", prev["startA"]))))
                prev["rawEndA"] = max(int(prev.get("rawEndA", prev["endA"])), int(m.get("rawEndA", m.get("endA", prev["endA"]))))
                prev["rawStartB"] = min(int(prev.get("rawStartB", prev["startB"])), int(m.get("rawStartB", m.get("startB", prev["startB"]))))
                prev["rawEndB"] = max(int(prev.get("rawEndB", prev["endB"])), int(m.get("rawEndB", m.get("endB", prev["endB"]))))
            else:
                merged.append(dict(m))
        return merged

    merged_matches = merge_spans(raw_matches)

    def _compute_line_offsets(text: str) -> List[int]:
        offsets: List[int] = []
        pos = 0
        for line in text.splitlines(True):  # keep newline lengths
            offsets.append(pos)
            pos += len(line)
        if not offsets:
            offsets.append(0)
        return offsets

    line_offsets_a = _compute_line_offsets(text_a)
    line_offsets_b = _compute_line_offsets(text_b_val)

    local_highlights: List[Dict[str, Any]] = []
    file_a_name = os.path.basename(file_a_path) if file_a_path else "fileA"
    file_b_name = os.path.basename(file_b_path) if file_b_path else "fileB"

    def _line_number(offsets: List[int], pos: int) -> int:
        if not offsets:
            return 0
        if pos < 0:
            pos = 0
        idx = bisect_right(offsets, pos) - 1
        if idx < 0:
            idx = 0
        if idx >= len(offsets):
            idx = len(offsets) - 1
        return idx + 1

    def _line_meta(text: str, offsets: List[int], span_start: int, span_end: int) -> tuple[int, str]:
        if not offsets:
            return 0, ""
        if span_start < 0:
            span_start = 0
        if span_end <= span_start:
            span_end = min(len(text), span_start + 1)
        scan_limit = min(len(text), max(span_end, span_start + 1))
        pos = max(0, min(span_start, len(text) - 1))
        while pos < scan_limit and pos < len(text) and text[pos] in ("\r", "\n"):
            pos += 1
        if pos >= len(text):
            pos = len(text) - 1
        idx = bisect_right(offsets, pos) - 1
        if idx < 0:
            idx = 0
        if idx >= len(offsets):
            idx = len(offsets) - 1
        line_no = idx + 1
        line_start = offsets[idx]
        line_end = offsets[idx + 1] if idx + 1 < len(offsets) else len(text)
        line_text = text[line_start:line_end].rstrip("\r\n")
        return line_no, line_text

    for m in merged_matches:
        try:
            startB = int(m.get("startB", 0))
            endB = int(m.get("endB", 0))
            startA = int(m.get("startA", 0)) if "startA" in m else 0
            endA = int(m.get("endA", 0)) if "endA" in m else 0
            raw_startA = int(m.get("rawStartA", startA))
            raw_endA = int(m.get("rawEndA", endA))
            raw_startB = int(m.get("rawStartB", startB))
            raw_endB = int(m.get("rawEndB", endB))

            # Refine using line-level longest matching block
            refined_startA = raw_startA
            refined_endA = raw_endA
            refined_startB = raw_startB
            refined_endB = raw_endB
            lineA, src_line_text = _line_meta(text_a, line_offsets_a, refined_startA, refined_endA)
            lineB, tgt_line_text = _line_meta(text_b_val, line_offsets_b, refined_startB, refined_endB)
            lineStartA = lineA
            lineEndA = _line_number(line_offsets_a, max(refined_endA - 1, refined_startA))
            lineStartB = lineB
            lineEndB = _line_number(line_offsets_b, max(refined_endB - 1, refined_startB))

            single_line_match = (
                src_line_text
                and tgt_line_text
                and lineStartA == lineEndA
                and lineStartB == lineEndB
                and lineStartA > 0
                and lineStartB > 0
            )
            if single_line_match:
                sm = difflib.SequenceMatcher(None, src_line_text, tgt_line_text)
                blocks = sm.get_matching_blocks()
                # choose the longest block with >= 6 chars
                best = max(blocks, key=lambda b: b.size) if blocks else None
                if best and best.size >= 6:
                    # map to global positions
                    offA = line_offsets_a[lineA - 1]
                    offB = line_offsets_b[lineB - 1]
                    refined_startA = offA + best.a
                    refined_endA = offA + best.a + best.size
                    refined_startB = offB + best.b
                    refined_endB = offB + best.b + best.size

            if refined_endA <= refined_startA and raw_endA > raw_startA:
                refined_startA, refined_endA = raw_startA, raw_endA
            if refined_endB <= refined_startB and raw_endB > raw_startB:
                refined_startB, refined_endB = raw_startB, raw_endB

            local_highlights.append({
                "start": refined_startB,
                "end": refined_endB,
                "source": "local",
                "score": cpp_result.get("localScore", 0.0),
                "textA": text_a[refined_startA:refined_endA],
                "textB": text_b_val[refined_startB:refined_endB],
                "lineA": lineA,
                "lineB": lineB,
                "lineStartA": lineStartA,
                "lineEndA": lineEndA,
                "lineStartB": lineStartB,
                "lineEndB": lineEndB,
                "charStartA": refined_startA,
                "charEndA": refined_endA,
                "charStartB": refined_startB,
                "charEndB": refined_endB,
                "lineTextA": src_line_text,
                "lineTextB": tgt_line_text,
                "matchType": "exact" if overall == 100.0 else "partial",
                "sourceFile": file_a_name,
                "targetFile": file_b_name,
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
        "mode": "local",
        "sourceFullText": text_a,
        "targetFullText": text_b_val,
        "sourceFileName": file_a_name,
        "targetFileName": file_b_name,
    }


