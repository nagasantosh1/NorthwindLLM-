
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from .nl2sql import nl2sql_graph
from .db import DB, rows_to_dicts, get_schema_snapshot
from .sql_safety import ensure_safe_sql
from .viz import infer_viz_from_result
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env", override=True)

app = FastAPI(title="Northwind Sales Insights API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/schema")
def schema():
    return get_schema_snapshot()

@app.post("/chat")
def chat(req: ChatRequest):
    if not req.message or not req.message.strip():
        raise HTTPException(400, "Empty message")
    # Build schema snapshot for the LLM prompt
    schema = get_schema_snapshot()
    # Run LangGraph pipeline (Groq LLM) to get SQL + viz suggestion + summary
    draft = nl2sql_graph(user_query=req.message, schema=schema)
    sql = draft.get("sql", "").strip()
    viz = draft.get("viz", {})
    summary = draft.get("summary", "")

    if not sql:
        raise HTTPException(500, "LLM failed to produce SQL")

    ensure_safe_sql(sql, schema)

    rows, columns = DB.run_sql(sql)
    # If model didn't propose a viz, infer a simple one
    if not viz:
        viz = infer_viz_from_result(columns, rows)

    return {
        "sql": sql,
        "rows": rows,
        "columns": columns,
        "viz": viz,
        "summary": summary or "Here's what I found from your query.",
    }
