
# Northwind Sales Insights Chatbot (POC)

An end‑to‑end proof‑of‑concept that lets users ask natural‑language questions about the **Northwind** dataset and see answers as **tables and charts**.

**Tech stack**
- Frontend: React + Vite + Recharts (chat UI + chart rendering)
- Backend: FastAPI + LangGraph + Groq LLM (NL → SQL) + SQLite (Northwind.db)
- Docker: Containerized frontend & backend with `docker-compose`

---

## Quick Start

### 1) Prerequisites
- Docker & Docker Compose
- A Groq API key (set `GROQ_API_KEY`)

### 2) Project layout
```
.
├─ backend/
├─ frontend/
├─ docker/
└─ docker-compose.yml
```

### 3) Environment
Copy sample envs and fill values:
```bash
cp backend/.env.example backend/.env
```

- `GROQ_API_KEY`: your Groq key (required)
- `DB_URL`: defaults to `sqlite:///data/Northwind.db`

### 4) Build & run with Docker
```bash
docker compose up --build
```
- Backend: http://localhost:8000/docs
- Frontend: http://localhost:5173

### 5) Try queries
Examples you can type into the chat:
- *Total sales by category in 1997*
- *Top 10 customers by revenue*
- *Monthly order counts for 1996*
- *Sales by employee (bar chart)*

### 6) Local (without Docker)
**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # add your GROQ_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## How it works

1. The user enters a question.
2. The backend builds a **schema snapshot** (tables/columns/joins) from the Northwind database.
3. A **LangGraph** pipeline prompts a **Groq LLM** to:
   - Propose a safe **SQL SELECT** query and a **viz spec** (chart type + x/y fields).
   - Output strict JSON.
4. Backend **validates & sanitizes** the SQL (SELECT-only, whitelisted tables).
5. SQL executes; results + viz spec returned to the frontend.
6. Frontend renders: **table + Recharts chart** and a short textual summary.

---

## API

### `POST /chat`
Request:
```json
{
  "message": "total sales by category in 1997"
}
```
Response:
```json
{
  "sql": "SELECT ...",
  "rows": [[...]],
  "columns": ["category", "total_sales"],
  "viz": {"type": "bar", "x": "category", "y": "total_sales", "title": "Sales by Category (1997)"},
  "summary": "Category 'Beverages' led with ..."
}
```

### `GET /schema`
Returns a snapshot of tables/columns for the LLM and debugging.

---

## Notes
- This is a POC. In production you’d add auth, caching, stricter SQL parsing, and better rate limiting.
- Supports SQLite out of the box. You can switch to Postgres by setting `DB_URL=postgresql+psycopg2://...` and adding the driver.
# NorthwindLLM-
