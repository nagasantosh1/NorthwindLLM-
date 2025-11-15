
from typing import List, Dict

def infer_viz_from_result(columns: List[str], rows: list) -> Dict:
    # Very simple heuristic: if two columns and first is categorical-like, use bar
    if len(columns) >= 2 and rows:
        x, y = columns[0], columns[1]
        if isinstance(rows[0][1], (int, float)) or _is_numeric_str(rows[0][1]):
            return {"type": "bar", "x": x, "y": y, "title": f"{y} by {x}"}
    # fallback
    return {"type": "table", "title": "Results"}

def _is_numeric_str(v):
    try:
        float(v)
        return True
    except Exception:
        return False
