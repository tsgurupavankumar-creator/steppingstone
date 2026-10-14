import io
import pandas as pd
from typing import List, Dict, Any

def generate_results_csv(records: List[Dict[str, Any]]) -> bytes:
    """
    Generates CSV export of exam results for all 4 participants.
    """
    df = pd.DataFrame(records)
    output = io.StringIO()
    df.to_csv(output, index=False)
    return output.getvalue().encode("utf-8")

def generate_results_excel(records: List[Dict[str, Any]], sheet_name: str = "Exam Results") -> bytes:
    """
    Generates styled Excel (.xlsx) export using openpyxl.
    """
    df = pd.DataFrame(records)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
    return output.getvalue()
