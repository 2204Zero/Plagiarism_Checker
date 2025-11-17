# API Request Flow

1. Client (React) submits form with text and/or file to POST /check
2. FastAPI endpoint saves file (if provided) to Back-end/uploads
3. Orchestrator `run_checks()`:
   - Reads file text (A) and form text (B)
   - Calls the C++ binary with temp files → receives `localScore` + matches
   - Merges contiguous spans and enriches them with metadata
4. Returns JSON: `overallScore`, `localScore`, `highlights`
5. Frontend displays scores and shows highlighted text for both documents








