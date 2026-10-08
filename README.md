# DocInsight — Intelligent Information Understanding & Processing

Upload many documents. DocInsight reads them, connects the information across all of them, and shows
**summaries, important dates and amounts, comparisons, conflicts and missing information — with the source of every fact.**
You stay in control: the app points out problems, **you decide** what is correct.

> Extract → Understand → Connect → Compare → Detect → Explain → Let the human decide

---

## 1. Project overview
Most tools summarize one PDF. DocInsight works **across** documents (PDF, Word, Excel, CSV, text, photos).
It finds that "Budget.xlsx says ₹5,00,000 but Contract.pdf says ₹4,50,000", tells you where each value came from, and lets you chat about it.

## 2. Features
- Drag-and-drop upload of many files (limit configurable, default 20), remove files before processing
- Per-file progress; one bad file never blocks the others
- One-click actions: Summarize, Compare, Important Information, Conflicts, Missing Information, Overall Analysis (pick several at once)
- Chat box that remembers the conversation ("Which deadline should I follow?" → "Only the important points")
- Results in tabs: Summary, Important Information, Deadlines, Amounts, Comparison table, Conflicts, Missing Information, Sources
- Sources shown as `File — Page 4`, `Sheet: Budget`, etc. If the location is unknown it says so (nothing is invented)
- Further Proceed / Exit → Save / Don't Save / Cancel flow, and Start New Analysis with an unsaved-work check
- Saved analyses stored in PostgreSQL and re-openable from the home page

## 3. Architecture
```
React (Vite)  ──HTTP/JSON──▶  FastAPI  ──▶  document_processing (text + location markers)
                                  │──────▶  ai/ (Gemini prompts + client)
                                  └──────▶  PostgreSQL (only when the user clicks Save)
```
- While you work, documents live in a temporary server workspace (memory + private `uploads/` folder). **Nothing is written to PostgreSQL until you click Save.** "Don't Save → Yes, Exit" deletes the temporary data.
- Each document's text is tagged with markers like `[[Page 4]]`, `[[Sheet: Budget]]`. The AI must cite only these markers, which is how fake page numbers are avoided.
- If the documents are too big for one request (`MAX_CONTEXT_CHARS`), each is first condensed to a fact sheet that keeps all dates, amounts and markers.
- No vector database: it is not needed at this size.

## 4. Technologies
React 18 + Vite · Python 3.11+ · FastAPI · SQLAlchemy 2 · PostgreSQL · Google Gemini API · pypdf, python-docx, openpyxl, xlrd

## 5. Prerequisites
Node.js 18+, Python 3.11+, PostgreSQL 14+, a free Gemini API key.

## 6. Installation
```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## 7. PostgreSQL setup
```bash
psql -U postgres -c "CREATE DATABASE docinsight;"
psql -U postgres -d docinsight -f database/schema.sql     # run from the project root
```
(The backend also creates the tables automatically on startup, so the second command is optional.)

## 8. Environment variables
Copy `.env.example` to **`backend/.env`** and `frontend/.env.example` to **`frontend/.env`**.

| Variable | Meaning |
|---|---|
| `GEMINI_API_KEY` | Your Gemini key (never commit it) |
| `GEMINI_MODEL` | Model name, default `gemini-2.5-flash` |
| `DATABASE_URL` | `postgresql+psycopg2://USER:PASSWORD@localhost:5432/docinsight` |
| `APP_API_KEY` | Shared key the frontend sends as `X-API-Key`. Must equal `VITE_API_KEY` |
| `MAX_FILES` / `MAX_FILE_MB` | Upload limits (default 20 files, 15 MB each) |
| `MAX_CONTEXT_CHARS` | Above this total text size, documents are condensed first |
| `CORS_ORIGINS` | Allowed frontend URLs |
| `VITE_API_URL` / `VITE_API_KEY` | Backend address and key for the frontend |

## 9. Gemini API setup
1. Open https://aistudio.google.com/app/apikey and create a key.
2. Put it in `backend/.env` as `GEMINI_API_KEY=...`. Restart the backend.

Images and scanned PDFs are read by Gemini (OCR), so no extra OCR software is needed.

## 10–12. Run it
```bash
# Terminal 1 — backend (from backend/)
uvicorn app.main:app --reload --port 8000
# Terminal 2 — frontend (from frontend/)
npm run dev
```
Open http://localhost:5173. API docs: http://localhost:8000/docs. Build for production: `npm run build`.

## 13. API explanation
All endpoints need the header `X-API-Key` (if `APP_API_KEY` is set).

| Method & path | What it does |
|---|---|
| `GET /config` | Limits and allowed file types |
| `POST /workspaces` | Start a temporary workspace |
| `POST /upload` | Upload + validate one file (type, size, empty, real format) |
| `POST /process` | Extract text from one uploaded file |
| `POST /analyze` | Run one or more actions: `summarize, compare, important, conflicts, missing, overall` |
| `POST /compare`, `POST /summarize` | Shortcuts for single actions |
| `POST /ask` | Chat question (+ recent history) |
| `POST /save-session` | Store the analysis in PostgreSQL |
| `GET /sessions`, `GET /sessions/{id}`, `DELETE /sessions/{id}` | List / open / delete saved analyses |
| `DELETE /workspaces/{id}` | "Don't Save": remove temporary files and text |

## 14. Database structure
`users` 1—* `analysis_sessions` 1—* `documents`, and `analysis_sessions` 1—* `analysis_results`
(summary, comparison, important findings, conflicts, missing information as JSONB, plus the full result). See `database/schema.sql`.
There is no login screen yet, so all sessions belong to one demo user.

## 15. Example workflow
1. Upload `Project_Report.pdf`, `Budget.xlsx`, `Contract.pdf`, `Meeting_Notes.txt` → **Process Documents**.
2. Select **Compare** + **Find Missing Information** → **Run**.
3. Read the tabs; open **Conflicts** (e.g. budget ₹5,00,000 vs ₹4,50,000, with sources).
4. Ask in chat: "Which deadline should I follow?"
5. **Exit → Save** (or Don't Save). Reopen it later from "Saved analyses".

## 16. Deployment
- Serve the backend with `uvicorn app.main:app --host 0.0.0.0 --port 8000` behind HTTPS (Nginx, Caddy, or a host such as Render/Railway). Set all variables on the host, never in Git.
- Build the frontend (`npm run build`) and host `frontend/dist` on any static host; set `VITE_API_URL` to your HTTPS backend before building, and add that site to `CORS_ORIGINS`.
- Use a managed PostgreSQL and a strong `APP_API_KEY`. Keep `uploads/` private (the app never serves it).

## 17. Limitations
- `APP_API_KEY` in a browser app is only basic protection (anyone who can open the site can see it). Real user login is the next step.
- Temporary workspaces are kept in server memory: a server restart ends the current analysis, and it will not work with several backend workers.
- Word files have no real page numbers, so sources show paragraph blocks. OCR text can contain mistakes; the app warns about this.
- Very large spreadsheets are limited to the first 2,000 rows per sheet.
- AI can still make mistakes. Always check important numbers against the sources shown.
- This code was syntax-checked and its file readers were tested, but the full app (Gemini + PostgreSQL + browser) must be tried with your own key.

## 18. Future improvements
User accounts and login, Redis/database-backed workspaces, streaming answers, highlighting the exact text in a document viewer, export to PDF/Excel, more languages, comparing a new version against a saved one.

## Project structure
```
backend/app/{api, services, models, schemas, database, ai, document_processing, utils}  main.py  config.py
frontend/src/{components, pages, services, hooks, utils}  App.jsx  main.jsx
database/schema.sql      .env.example      README.md
```
