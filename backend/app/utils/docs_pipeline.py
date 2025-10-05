import os
from .glossary_enforcer import enforce_glossary

def run_docx_to_docx(input_path: str, output_path: str, glossary: dict[str, str]) -> dict:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    metrics = enforce_glossary(input_path, output_path, glossary)
    metrics["pipeline"] = "docx->docx"
    return metrics