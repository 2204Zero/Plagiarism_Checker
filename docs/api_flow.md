# API Request Flow

1. Client (React) submits form with text and/or file to POST /check
2. FastAPI endpoint saves file (if provided) to Back-end/uploads
3. Orchestrator run_checks():
   - Reads file text (A) and form text (B)
   - Calls C++ binary with temp files → receives localScore + matches
   - Calls semantic_similarity(A, B) → aiScore + AI highlights
   - Calls check_web_sources(B) → webSources + web highlights
   - Merges scores (weighted) and highlights
4. Returns JSON: overallScore, localScore, aiScore, webScore, webSources, highlights
5. Frontend displays scores, shows highlighted text with tooltips linking to sources








