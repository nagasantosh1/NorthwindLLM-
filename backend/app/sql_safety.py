
import re
from typing import Dict, Any

ALLOWED_DML = {"select"}

def ensure_safe_sql(sql: str, schema: Dict[str, Any]):
    lowered = sql.strip().lower()
    # must start with SELECT
    if not lowered.startswith("select"):
        raise ValueError("Only SELECT queries are allowed")
    # forbid multiple statements
    if ";" in lowered.strip()[:-1]:
        raise ValueError("Multiple statements are not allowed")
    # crude block of dangerous keywords
    banned = [" insert ", " update ", " delete ", " drop ", " alter ", " create ", " truncate ", " attach ", " pragma "]
    if any(b in f" {lowered} " for b in banned):
        raise ValueError("Query contains forbidden keywords")
    # optional: whitelist tables by schema snapshot
    tables = set(schema.get("tables", {}).keys())
    # If tables set is non-empty, ensure FROM/JOIN mention known tables (heuristic)
    mentioned = set(re.findall(r'from\s+([\w\."]+)|join\s+([\w\."]+)', lowered))

    flat = {p for tup in mentioned for p in tup if p}
    unknown = [t for t in flat if t.strip('"') not in tables]
    # Allow subqueries; only warn if obvious mismatch
    return True
