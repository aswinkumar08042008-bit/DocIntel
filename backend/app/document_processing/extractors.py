"""
Turns each file type into plain text.
Text is tagged with location markers like [[Page 3]] or [[Sheet: Budget]]
so the AI can tell the user where information came from (and never has to guess).
"""
import csv
import io
from app.config import get_settings
from app.errors import AppError

MIN_TEXT_FOR_REAL_PDF = 20   # fewer characters than this = probably a scanned PDF


def extract(path, ext: str, ocr_function=None) -> tuple[str, int | None, str]:
    """Returns (text, page_count, warning). ocr_function(bytes, mime) -> text is used for images/scans."""
    try:
        if ext == ".pdf":
            return _pdf(path, ocr_function)
        if ext == ".docx":
            return _docx(path)
        if ext == ".txt":
            return _txt(path)
        if ext == ".csv":
            return _csv(path)
        if ext == ".xlsx":
            return _xlsx(path)
        if ext == ".xls":
            return _xls(path)
        if ext in (".jpg", ".jpeg", ".png"):
            return _image(path, ext, ocr_function)
    except AppError:
        raise
    except Exception:
        raise AppError("We couldn't read this document. It may be damaged or protected.")
    raise AppError("This file type is not supported.")


def _read_bytes(path) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _decode(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return data.decode("utf-8", errors="ignore")


def _pdf(path, ocr_function):
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        raise AppError("This PDF is password protected.")
    parts = []
    for number, page in enumerate(reader.pages, start=1):
        page_text = (page.extract_text() or "").strip()
        if page_text:
            parts.append(f"[[Page {number}]]\n{page_text}")
    text = "\n\n".join(parts)
    if len(text) >= MIN_TEXT_FOR_REAL_PDF:
        return text, len(reader.pages), ""
    # Scanned PDF: ask the AI to read it like an image
    if ocr_function:
        scanned = ocr_function(_read_bytes(path), "application/pdf", pages=True)
        if scanned.strip():
            return scanned, len(reader.pages), "Scanned PDF read with OCR. Please double-check important numbers."
    raise AppError("No readable text found in this PDF.")


def _docx(path):
    from docx import Document
    doc = Document(str(path))
    lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    parts, block = [], 1
    for i in range(0, len(lines), 15):                    # DOCX has no pages, so we number blocks
        parts.append(f"[[Paragraphs {i + 1}-{min(i + 15, len(lines))}]]\n" + "\n".join(lines[i:i + 15]))
        block += 1
    for t_number, table in enumerate(doc.tables, start=1):
        rows = [" | ".join(cell.text.strip() for cell in row.cells) for row in table.rows]
        parts.append(f"[[Table {t_number}]]\n" + "\n".join(rows))
    text = "\n\n".join(parts)
    if not text.strip():
        raise AppError("This document has no readable text.")
    return text, None, "Word files have no fixed pages, so sources show paragraph numbers."


def _txt(path):
    text = _decode(_read_bytes(path)).strip()
    if not text:
        raise AppError("This file has no readable text.")
    lines = text.splitlines()
    parts = [f"[[Lines {i + 1}-{min(i + 40, len(lines))}]]\n" + "\n".join(lines[i:i + 40])
             for i in range(0, len(lines), 40)]
    return "\n\n".join(parts), None, ""


def _csv(path):
    max_rows = get_settings().max_sheet_rows
    rows = list(csv.reader(io.StringIO(_decode(_read_bytes(path)))))
    if not rows:
        raise AppError("This file has no readable data.")
    warning = f"Only the first {max_rows} rows were read." if len(rows) > max_rows else ""
    rows = rows[:max_rows]
    parts = []
    for i in range(0, len(rows), 50):
        chunk = [" | ".join(r) for r in rows[i:i + 50]]
        parts.append(f"[[Rows {i + 1}-{min(i + 50, len(rows))}]]\n" + "\n".join(chunk))
    return "\n\n".join(parts), None, warning


def _xlsx(path):
    from openpyxl import load_workbook
    max_rows = get_settings().max_sheet_rows
    workbook = load_workbook(str(path), read_only=True, data_only=True)
    parts, warning = [], ""
    for sheet in workbook.worksheets:
        lines = []
        for index, row in enumerate(sheet.iter_rows(values_only=True), start=1):
            if index > max_rows:
                warning = f"Only the first {max_rows} rows of each sheet were read."
                break
            if any(c is not None for c in row):
                lines.append(f"Row {index}: " + " | ".join("" if c is None else str(c) for c in row))
        if lines:
            parts.append(f"[[Sheet: {sheet.title}]]\n" + "\n".join(lines))
    if not parts:
        raise AppError("This spreadsheet has no readable data.")
    return "\n\n".join(parts), None, warning


def _xls(path):
    import xlrd
    max_rows = get_settings().max_sheet_rows
    book = xlrd.open_workbook(str(path))
    parts = []
    for sheet in book.sheets():
        lines = [f"Row {r + 1}: " + " | ".join(str(c) for c in sheet.row_values(r))
                 for r in range(min(sheet.nrows, max_rows))]
        if lines:
            parts.append(f"[[Sheet: {sheet.name}]]\n" + "\n".join(lines))
    if not parts:
        raise AppError("This spreadsheet has no readable data.")
    return "\n\n".join(parts), None, ""


def _image(path, ext, ocr_function):
    if not ocr_function:
        raise AppError("Image reading is not available right now.")
    mime = "image/png" if ext == ".png" else "image/jpeg"
    text = ocr_function(_read_bytes(path), mime, pages=False)
    if len(text.strip()) < 5:
        raise AppError("We couldn't find readable text in this image.")
    return f"[[Image]]\n{text}", None, "Text was read from an image. Please double-check important numbers."
