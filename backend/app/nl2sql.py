# backend/app/nl2sql.py
# ...existing code...
# backend/app/nl2sql.py
import os, json
from typing import Dict, Any
from dataclasses import dataclass
# ...existing code...
from langgraph.graph import StateGraph, START, END
from groq import Groq

from dotenv import load_dotenv
from pathlib import Path

# --- .env loading (robust) ---
BACKEND_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_ROOT / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

SYSTEM_INSTRUCTIONS = """
You translate natural language about the Northwind database into:
1) A single safe SQL SELECT query for the given schema.
2) A visualization spec for a chart.
3) A short 1-2 sentence summary.

Output STRICT JSON with keys: sql (string), viz (object), summary (string).
The viz object can be: { "type": "bar|line|pie|table", "x": "<col>", "y": "<col>", "title": "<title>" }.
Rules:
- Only SELECT queries. No DDL/DML.
- Use the provided schema snapshot (tables, columns, foreign keys).
- Prefer standard Northwind tables like Orders, Order_Details, Customers, Employees, Products, Categories, Suppliers.
- Use proper joins via the FK relations.
- Aggregate and group when appropriate.
- Return compact, executable SQL that runs on the target dialect.
- Use column aliases that are simple and chart-friendly (e.g., total_sales).
- If unsure, make a reasonable best guess and keep SQL valid.
"""

@dataclass
class State:
    user_query: str
    schema: Dict[str, Any]
    draft: Dict[str, Any] | None = None

# --- Helpers ---
def _require(key: str) -> str:
    v = os.getenv(key)
    if not v:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return v

def _get_groq_client() -> Groq:
    api_key = _require("GROQ_API_KEY")  # read at call time
    return Groq(api_key=api_key)

def _build_prompt(user_query: str, schema: Dict[str, Any]) -> str:
    schema_str = json.dumps(schema.get("tables", {}), indent=2)[:12000]
    return f"""
USER QUESTION:
{user_query}

SCHEMA SNAPSHOT (tables with columns and foreign keys):
{schema_str}

Return STRICT JSON with keys: sql, viz, summary.
SQL must be valid for the target database URL: {schema.get('driver')}
"""

# --- LLM call ---
def _llm_call(prompt: str) -> Dict[str, Any]:
    client = _get_groq_client()
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTIONS},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=800,
        response_format={"type": "json_object"},
    )
    content = resp.choices[0].message.content
    try:
        return json.loads(content)
    except Exception:
        return {
            "sql": "",
            "viz": {"type": "table", "title": "Results"},
            "summary": "I could not parse the model output."
        }

# --- Graph nodes ---
def propose_sql(state: State) -> State:
    prompt = _build_prompt(state.user_query, state.schema)
    state.draft = _llm_call(prompt)
    return state

def validate_or_fix(state: State) -> State:
    d = state.draft or {}
    if not isinstance(d, dict):
        d = {}
    if "sql" not in d or not isinstance(d.get("sql"), str):
        d["sql"] = ""
    if "viz" not in d or not isinstance(d.get("viz"), dict):
        d["viz"] = {"type": "table", "title": "Results"}
    if "summary" not in d or not isinstance(d.get("summary"), str):
        d["summary"] = "Query results."
    state.draft = d
    return state

# --- Pipeline entry ---
def nl2sql_graph(user_query: str, schema: Dict[str, Any]) -> Dict[str, Any]:
    g = StateGraph(State)
    g.add_node("propose_sql", propose_sql)
    g.add_node("validate", validate_or_fix)
    g.add_edge(START, "propose_sql")
    g.add_edge("propose_sql", "validate")
    g.add_edge("validate", END)
    app = g.compile()

    result = app.invoke(State(user_query=user_query, schema=schema))

    # LangGraph may return a dict instead of the dataclass.
    if isinstance(result, dict):
        draft = result.get("draft")
    else:
        draft = getattr(result, "draft", None)

    return draft or {
        "sql": "",
        "viz": {"type": "table", "title": "Results"},
        "summary": ""
    }
