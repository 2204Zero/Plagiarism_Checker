# Plagiarism Checker

A full‑stack plagiarism detection tool with a React + Vite frontend and a FastAPI backend. It focuses on precise local file comparison using a high‑performance C++ checker.

## 1) Project Overview

- Purpose: Detect overlapping content between two documents and present clear, actionable reports.
- Architecture: `Front-end/` (React, TypeScript, Tailwind, shadcn‑ui) + `Back-end/` (FastAPI, Python, C++ binary).
- Status: Local file comparison implemented end‑to‑end.
- Ports: Frontend on `http://localhost:8080`, backend on `http://localhost:8000`.

## 2) Repository Structure

- `Back-end/`
  - `main.py`: FastAPI app; CORS enabled; endpoints for auth and plagiarism check.
  - `checker.py`: Orchestrates local comparison via C++ binary; returns scores and highlights.
  - `ai_checker.py`: Legacy semantic/web utilities kept for future experimentation (currently unused).
  - `cpp_checker/`: C++ source (`main.cpp`) and a sample compiled artifact; compiled binary is expected at `bin/cpp_checker.exe` (Windows) or `bin/cpp_checker` (Unix).
  - `bin/cpp_checker.exe`: Required by `checker.py` on Windows for fast exact‑match comparisons.
  - `uploads/`: Temporary storage for received files (`fileA`, `fileB`) during checks.
  - `requirements.txt`: Backend Python dependencies (FastAPI, Uvicorn, sentence‑transformers, Torch, Requests, python‑multipart).
  - `Dockerfile`: Containerizes the backend; builds C++ checker on Linux, exposes `8000`.
  - Test fixtures: `test_original.txt`, `test_partial.txt`.
- `Front-end/`
  - `src/App.tsx`: App shell wiring router, toast, tooltip, and react‑query.
  - `src/pages/Index.tsx`: Landing page with CTA.
  - `src/pages/Auth.tsx`: Login/signup via backend endpoints; optional Supabase OAuth.
  - `src/pages/Checker.tsx`: Core UI to upload two files, run the check, and view report.
  - `src/pages/About.tsx`, `src/pages/NotFound.tsx`: Informational and fallback routes.
  - `src/components/`: UI components including `FileUpload`, `PlagiarismGauge`, `DetailedReportDialogue`, and shadcn‑ui primitives (`src/components/ui/*`).
  - `src/services/api.ts`: Typed client for backend (`/check`, health check via `/docs`).
  - `supabase/`: `config.toml` and generated client wiring (if OAuth used).
  - Tooling: Vite (`vite.config.ts`), Tailwind (`tailwind.config.ts`), ESLint, TypeScript configs.
- `docs/`: `api_flow.md` (intended end‑to‑end flow).
- `test_files/`: Sample data to validate comparisons.
- `start-dev.bat` / `start-dev.sh`: Convenience scripts to start both servers.
- `vercel.json`: Static build deployment config for the frontend (`dist`).

## 3) Features

- Local file comparison with exact‑match highlights and an overall score.
- Clean, responsive UI for uploading two documents and viewing results.
- Detailed report dialog with per‑match snippets, positions, and line references (when available).
- Health indicator for backend connectivity.
- Authentication via backend email/password endpoints; optional Supabase OAuth wiring in the UI.

## 4) Backend Details

- Framework: `FastAPI` with CORS enabled for all origins (development convenience).
- Entry point: `Back-end/main.py`; run with `python main.py` from the `Back-end` directory.
- Endpoints:
  - `POST /auth/login`: Accepts JSON `{ email, password }`; returns `{ token, email }` if credentials match the in‑memory store.
  - `POST /auth/signup`: Accepts JSON `{ email, password }`; registers user in the in‑memory store and returns `{ token, email }`.
  - `POST /check`: `multipart/form-data` fields:
    - `mode`: currently `"local"` supported by the orchestrator.
    - `fileA`: first document (required in local mode).
    - `fileB`: second document (required in local mode, unless `textB` provided).
    - `textB`: optional raw text instead of `fileB`.
- Behavior: `checker.run_checks(...)` reads text from `fileA` and `fileB` (UTF‑8), calls the C++ binary for exact matches, and returns a JSON with `overallScore`, `localScore`, and detailed highlight metadata.
- Health check: visit `http://localhost:8000/docs` (FastAPI’s OpenAPI UI) — the frontend probes this for connectivity.
- Important: Only `.txt` uploads are supported end-to-end.

## 5) Frontend Details

- Stack: Vite + React + TypeScript, Tailwind CSS, shadcn‑ui, Radix primitives.
- Routing: `App.tsx` defines routes `"/"`, `"/auth"`, `"/checker"`, `"/about"`, `"*"`.
- Core components:
  - `FileUpload`: Drag‑and‑drop, single file select, accepts `.txt`.
  - `PlagiarismGauge`: Animated circular gauge showing the plagiarism percentage.
  - `DetailedReportDialogue`: Modal showing overall score and clean highlights. Source/Matched cards show only file names and real line numbers; overlap snippets and full‑document views are available below for context.
- Service client: `src/services/api.ts` sets `API_BASE_URL = 'http://localhost:8000'` and implements `checkPlagiarism()` (POST `/check`) and `healthCheck()` that hits `/docs`.

## 6) Setup & Development

1. Prerequisites:
   - Backend: Python `3.10+`, pip, on Windows a bundled `bin/cpp_checker.exe` is already provided; on Linux/macOS you need a C++ compiler (`g++`).
   - Frontend: Node.js `18+` and npm.
2. Backend install:
   - `cd Back-end`
   - `pip install -r requirements.txt`
   - Windows: ensure `bin/cpp_checker.exe` exists (committed). Unix: compile with `g++ -O2 -o bin/cpp_checker cpp_checker/main.cpp`.
   - Run: `python main.py` (serves on `http://localhost:8000`).
3. Frontend install:
   - `cd Front-end`
   - `npm install`
   - `npm run dev` (serves on `http://localhost:8080`).
4. One‑command startup:
   - Windows: double‑click `start-dev.bat` (opens two terminals: backend and frontend).
   - Linux/macOS: `bash ./start-dev.sh` (runs both in background; stop with `Ctrl+C`).
5. Docker (backend):
   - Build: `docker build -t plagiarism-backend -f Back-end/Dockerfile .`
   - Run: `docker run --rm -p 8000:8000 plagiarism-backend`

## 7) Usage Flow

1. Launch the backend, confirm `http://localhost:8000/docs` loads.
2. Launch the frontend, open `http://localhost:8080`.
3. Go to `Checker`, upload two text files (`fileA`, `fileB`).
4. Click “Check for Plagiarism”.
5. View the gauge and open the detailed report to inspect exact matches, positions, and any line metadata.

### Example API call (local mode)

```bash
curl -X POST "http://localhost:8000/check" \
  -F mode=local \
  -F fileA=@test_files/sample1.txt \
  -F fileB=@test_files/sample2.txt
```

Returns JSON with keys: `overallScore`, `localScore`, and `highlights` (array of matches with `start`, `end`, `textA`, `textB`, `lineA`, `lineB`, `matchType`, `sourceFile`, `targetFile`, optional `lineStartA/B`, `lineEndA/B`, `charStartA/B`, `charEndA/B`). Top‑level may include `sourceFullText`, `targetFullText`.

## 8) Configuration

- Frontend API base: edit `src/services/api.ts` (`API_BASE_URL`) when deploying the backend elsewhere.
- Supabase OAuth (optional): set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `Front-end/.env` if using social login. The app otherwise relies on backend email/password.
- CORS: all origins allowed in development; restrict in production via `CORSMiddleware` in `main.py`.

## 9) Implementation Notes

- C++ checker: `checker.py` writes temp files, runs `bin/cpp_checker*`, and parses JSON output. If the binary is missing, the service returns `localScore: 0.0` and an error message.
- Text handling: files are read as UTF‑8 with `errors="ignore"`; only `.txt` uploads are supported.
- Matching engine:
  - C++ checker preserves newlines and computes accurate line starts.
  - Extends and merges contiguous spans; processes all target occurrences for a seed.
  - Python refinement aligns matches to the longest equal block per line, merges equal regions in paragraphs, and performs sentence‑level matching line‑by‑line with spacing normalization.
  - Deduplicates overlapping highlights, keeping the longest/highest‑priority entry.
  - Real line numbers are derived from actual newline offsets for both source and matched positions.
- In‑memory auth: backend stores users/tokens in dictionaries; this is for demo only and not production‑grade.
- Health probe: frontend checks `GET /docs` and toggles a “connected/disconnected” badge in the Checker page.

## 10) Limitations & Roadmap

- Current orchestrator supports only `mode=local`.
- Exact matching only from the C++ tool; no semantic/web scoring is active.
- No persistent database; auth is ephemeral and resets on server restart.
- File format caveat: only `.txt` uploads are supported end-to-end.
- Planned:
  - Replace in‑memory auth with a proper user store.
  - Harden CORS and security policies for production.

## 11) Testing & Validation

- Use `test_files/` samples and the `curl` example above to validate local checks.
- Confirm highlights show up in the detailed report modal.
- Verify backend connectivity indicator in the Checker page reflects server state.

## 12) Deployment

- Frontend:
  - Build: `cd Front-end && npm run build`
  - Output: `Front-end/dist/` — served statically (configured for Vercel via `vercel.json`).
- Backend:
  - Container: build with the provided Dockerfile and run behind a reverse proxy; expose `8000`.
  - Security: configure CORS for allowed origins only; replace demo auth.

## 13) Troubleshooting

- “Backend Disconnected” badge: ensure `python main.py` is running and `http://localhost:8000/docs` is reachable.
- “Failed to check plagiarism”: verify `bin/cpp_checker.exe` exists (Windows) or compile the Unix binary; check file readability and size.
- Empty highlights: ensure files contain overlapping sentences. Matching is line‑by‑line and sentence‑based; spacing is normalized, but actual newlines are used for line numbers.
- Real line numbers: lines are derived from actual `\n` boundaries. Files without newlines will show Line 1.
- Port conflicts: change ports in `vite.config.ts` (frontend `8080`) or `uvicorn.run` in `main.py` (`8000`).

## 14) License & Contributions

- License: Not specified; treat as private unless stated otherwise.
- Contributions: Open issues/PRs with focused changes; please include reproducible steps and test samples.

A comprehensive plagiarism detection system built around precise local comparisons.

## Features

- **Local File Comparison**: Compare two documents directly for similarity
- **Line‑by‑Line Sentence Matching**: Robust sentence detection per real line, spacing normalized
- **Clear Results**: File names and real line numbers in Source/Matched cards; overlap snippets optional
- **Real-time Results**: Get instant plagiarism scores and detailed reports
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Backend API**: FastAPI-based Python backend with C++ performance optimization

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for development and building
- Tailwind CSS for styling
- Shadcn/ui component library
- React Router for navigation
- Supabase for authentication

### Backend
- FastAPI (Python) for API server
- C++ binary for high-performance text comparison
- Sentence Transformers for semantic similarity
- Web scraping for source checking

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Plagiarism
   ```

2. **Install Backend Dependencies**
   ```bash
   cd Back-end
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../Front-end
   npm install
   ```

### Running the Application

#### Option 1: Use the provided scripts
- **Windows**: Run `start-dev.bat`
- **Linux/Mac**: Run `./start-dev.sh`

#### Option 2: Manual startup

1. **Start the Backend Server**
   ```bash
   cd Back-end
   python main.py
   ```
   The backend will be available at `http://localhost:8000`

2. **Start the Frontend Development Server**
   ```bash
   cd Front-end
   npm run dev
   ```
   The frontend will be available at `http://localhost:8080`

## Usage

1. **Authentication**: Sign up or log in to access the plagiarism checker
2. **Upload Files**: Upload your document(s) for checking
3. **Run Check**: Compare with another uploaded file using local analysis
4. **View Results**: Get detailed plagiarism scores and source matches

## API Endpoints

### POST `/check`
Check for plagiarism between documents.

**Parameters:**
- `mode`: `"local"`
- `fileA`: First document file (required)
- `fileB`: Second document file (required unless `textB` is provided)
- `textB`: Text content (alternative to `fileB`)

**Response:**
```json
{
  "overallScore": 85.5,
  "localScore": 90.0,
  "highlights": [...]
}
```

## Configuration

### Backend Environment Variables
- None required for the local comparison workflow.

### Frontend Configuration
- Backend URL can be configured in `Front-end/src/services/api.ts`
- Default: `http://localhost:8000`

## Development

### Frontend Development
```bash
cd Front-end
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Backend Development
```bash
cd Back-end
python main.py       # Start development server
python -m pytest    # Run tests (if available)
```

## Project Structure

```
Plagiarism/
├── Front-end/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── hooks/           # Custom React hooks
│   └── package.json
├── Back-end/                 # Python backend
│   ├── main.py              # FastAPI application
│   ├── checker.py           # Main plagiarism logic
│   ├── ai_checker.py        # Legacy semantic utilities (unused)
│   ├── bin/                 # C++ binary for performance
│   └── requirements.txt
├── docs/                    # Documentation
└── README.md
```

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Ensure Python dependencies are installed
   - Check if port 8000 is available
   - Verify the backend server is running

2. **Frontend Build Errors**
   - Run `npm install` to install dependencies
   - Check Node.js version (requires 18+)
   - Clear node_modules and reinstall if needed

3. **CORS Issues**
   - Backend is configured to allow all origins in development
   - For production, update CORS settings in `main.py`

### Performance Notes

- The C++ binary provides high-performance text comparison.
- Very large `.txt` files may take a bit longer because every character span is analyzed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation at `http://localhost:8000/docs`
3. Create an issue in the repository
### Recent Improvements

- Matching accuracy upgrades:
  - Newline preservation and accurate line mapping in the C++ checker.
  - Multi‑occurrence detection and contiguous span merging for partial matches.
  - Python post‑processing adds line‑by‑line sentence matching and robust deduplication.
- Results clarity in the UI:
  - Source and Matched sections show only file names and real line numbers (clean and scannable).
  - Overlap snippets remain available for visual confirmation.