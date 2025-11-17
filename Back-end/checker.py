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
    Compare two files using local comparison and return structured highlights.
    """
    # Only support local mode now
    if mode != "local":
        return {"error": "Only local mode is supported"}

    allowed_extensions = {".txt"}
    unsupported_formats: List[str] = []

    def read_file_text(path: Optional[str]) -> str:
        if not path or not os.path.exists(path):
            return ""
        ext = os.path.splitext(path)[1].lower()
        if ext and ext not in allowed_extensions:
            unsupported_formats.append(ext)
            return ""
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""

    text_a = read_file_text(file_a_path)
    text_b_val = read_file_text(file_b_path)
    if not text_b_val:
        text_b_val = text_b or ""

    if unsupported_formats:
        return {"error": "Only .txt files are currently supported"}

    if not text_a or not text_b_val:
        return {"error": "Both files are required for comparison"}

    cpp_result: Dict[str, Any] = {"localScore": 0.0, "matches": []}

    try:
        # Run C++ checker for exact matches only
        cpp_result = _run_cpp_checker(text_a, text_b_val)
    except Exception as e:
        return {"error": f"Check failed: {str(e)}"}

    # Use only local score
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

            # drop low-quality overlaps
            if refined_endB - refined_startB < 6:
                continue
            try:
                sm2 = difflib.SequenceMatcher(None, text_a[refined_startA:refined_endA], text_b_val[refined_startB:refined_endB])
                if sm2.ratio() < 0.5:
                    continue
            except Exception:
                pass

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

    def _paragraph_spans(text: str) -> List[Dict[str, int]]:
        spans: List[Dict[str, int]] = []
        pos = 0
        start = 0
        gap = False
        for line in text.splitlines(True):
            if line.strip() == "":
                if not gap:
                    gap = True
            else:
                if gap and pos > start:
                    spans.append({"start": start, "end": pos})
                    start = pos
                gap = False
            pos += len(line)
        if pos > start:
            spans.append({"start": start, "end": pos})
        return spans

    para_a = _paragraph_spans(text_a)
    para_b = _paragraph_spans(text_b_val)

    def _overlaps(a1: int, a2: int, b1: int, b2: int) -> bool:
        return not (a2 <= b1 or a1 >= b2)

    for pa in para_a:
        sa = pa["start"]
        ea = pa["end"]
        ta = text_a[sa:ea]
        merged_eq_segments: List[tuple[int,int,int,int]] = []
        def _is_noise_gap(seg: str) -> bool:
            if not seg:
                return True
            return all(not ch.isalnum() for ch in seg)
        for pb in para_b:
            sb = pb["start"]
            eb = pb["end"]
            tb = text_b_val[sb:eb]
            if not ta.strip() or not tb.strip():
                continue
            smp = difflib.SequenceMatcher(None, ta, tb)
            for tag, a0, a1, b0, b1 in smp.get_opcodes():
                if tag != 'equal':
                    continue
                size = a1 - a0
                if size < 20:
                    continue
                rsa = sa + a0
                rea = sa + a1
                rsb = sb + b0
                reb = sb + b1
                if merged_eq_segments:
                    lsA0, lsA1, lsB0, lsB1 = merged_eq_segments[-1]
                    gapA = rsa - lsA1
                    gapB = rsb - lsB1
                    gapAtext = text_a[lsA1:rsa]
                    gapBtext = text_b_val[lsB1:rsb]
                    if gapA <= 10 and gapB <= 10 and _is_noise_gap(gapAtext) and _is_noise_gap(gapBtext):
                        # merge into last
                        merged_eq_segments[-1] = (lsA0, rea, lsB0, reb)
                    else:
                        merged_eq_segments.append((rsa, rea, rsb, reb))
                else:
                    merged_eq_segments.append((rsa, rea, rsb, reb))
        for rsa, rea, rsb, reb in merged_eq_segments:
            if any(_overlaps(rsb, reb, h.get("start", 0), h.get("end", 0)) for h in local_highlights):
                continue
            la, lta = _line_meta(text_a, line_offsets_a, rsa, rea)
            lb, ltb = _line_meta(text_b_val, line_offsets_b, rsb, reb)
            lsa = _line_number(line_offsets_a, max(rsa - 1, rsa))
            lea = _line_number(line_offsets_a, max(rea - 1, rsa))
            lsb = _line_number(line_offsets_b, max(rsb - 1, rsb))
            leb = _line_number(line_offsets_b, max(reb - 1, rsb))
            local_highlights.append({
                "start": rsb,
                "end": reb,
                "source": "local",
                "score": cpp_result.get("localScore", 0.0),
                "textA": text_a[rsa:rea],
                "textB": text_b_val[rsb:reb],
                "lineA": la,
                "lineB": lb,
                "lineStartA": lsa,
                "lineEndA": lea,
                "lineStartB": lsb,
                "lineEndB": leb,
                "charStartA": rsa,
                "charEndA": rea,
                "charStartB": rsb,
                "charEndB": reb,
                "lineTextA": lta,
                "lineTextB": ltb,
                "matchType": "paragraph",
                "sourceFile": file_a_name,
                "targetFile": file_b_name,
            })

    def _overlap_ratio(s1: int, e1: int, s2: int, e2: int) -> float:
        inter = max(0, min(e1, e2) - max(s1, s2))
        uni = max(e1, e2) - min(s1, s2)
        return (inter / uni) if uni > 0 else 0.0

    def _dedup_highlights(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        items_sorted = sorted(items, key=lambda x: (int(x.get("lineB", 0)), int(x.get("start", 0))))
        result: List[Dict[str, Any]] = []
        for h in items_sorted:
            if not result:
                result.append(h)
                continue
            last = result[-1]
            rB = _overlap_ratio(int(h.get("start", 0)), int(h.get("end", 0)), int(last.get("start", 0)), int(last.get("end", 0)))
            rA = _overlap_ratio(int(h.get("charStartA", 0)), int(h.get("charEndA", 0)), int(last.get("charStartA", 0)), int(last.get("charEndA", 0)))
            same_lines = int(h.get("lineA", 0)) == int(last.get("lineA", -1)) and int(h.get("lineB", 0)) == int(last.get("lineB", -1))
            if rB >= 0.6 and rA >= 0.4 and same_lines:
                len_h = (int(h.get("end", 0)) - int(h.get("start", 0))) + (int(h.get("charEndA", 0)) - int(h.get("charStartA", 0)))
                len_last = (int(last.get("end", 0)) - int(last.get("start", 0))) + (int(last.get("charEndA", 0)) - int(last.get("charStartA", 0)))
                prio_h = 2 if h.get("matchType") == "paragraph" else 1
                prio_last = 2 if last.get("matchType") == "paragraph" else 1
                if prio_h > prio_last or (prio_h == prio_last and len_h > len_last):
                    result[-1] = h
                else:
                    pass
            else:
                result.append(h)
        return result

    local_highlights = _dedup_highlights(local_highlights)

    return {
        "overallScore": overall,
        "localScore": cpp_result.get("localScore", 0.0),
        "highlights": local_highlights,
        "localHighlights": local_highlights,
        "mode": "local",
        "sourceFullText": text_a,
        "targetFullText": text_b_val,
        "sourceFileName": file_a_name,
        "targetFileName": file_b_name,
    }


