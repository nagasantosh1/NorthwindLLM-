
import os
from typing import List, Tuple, Dict, Any
from sqlalchemy import create_engine, text, inspect

DB_URL = os.getenv("DB_URL", "sqlite:///data/Northwind.db")

_engine = create_engine(DB_URL, future=True)

def rows_to_dicts(columns: List[str], rows: List[tuple]):
    return [dict(zip(columns, r)) for r in rows]

class DB:
    @staticmethod
    def run_sql(sql: str) -> Tuple[list, list]:
        with _engine.connect() as conn:
            res = conn.execute(text(sql))
            rows = [tuple(r) for r in res.fetchall()]
            columns = list(res.keys())
        return rows, columns

def get_schema_snapshot() -> Dict[str, Any]:
    insp = inspect(_engine)
    tables = {}
    for t in insp.get_table_names():
        cols = []
        for c in insp.get_columns(t):
            cols.append({
                "name": c.get("name"),
                "type": str(c.get("type")),
                "nullable": c.get("nullable"),
                "default": str(c.get("default")) if c.get("default") is not None else None
            })
        fks = []
        for fk in insp.get_foreign_keys(t):
            fks.append({
                "constrained_columns": fk.get("constrained_columns"),
                "referred_table": fk.get("referred_table"),
                "referred_columns": fk.get("referred_columns")
            })
        tables[t] = {"columns": cols, "foreign_keys": fks}
    return {"driver": str(_engine.url), "tables": tables}
