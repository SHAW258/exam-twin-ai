"""Unit tests for PDF document extraction and page metadata preservation."""

import pytest
from pathlib import Path
from pypdf import PdfWriter

from src.ingestion.pdf_loader import (
    ExtractedPage,
    PDFLoader,
    PDFLoadingError,
    load_pdf,
)


def _generate_synthetic_pdf(pages_text: list[str]) -> bytes:
    """Generate a valid binary PDF-1.4 stream with embedded text for deterministic testing."""
    num_pages = len(pages_text)
    font_id = 3 + num_pages * 2
    out = bytearray(b"%PDF-1.4\n")
    offsets = {}

    def add_obj(obj_id: int, content: bytes):
        offsets[obj_id] = len(out)
        out.extend(f"{obj_id} 0 obj\n".encode("ascii"))
        out.extend(content)
        out.extend(b"\nendobj\n")

    # Catalog & Pages dictionary
    add_obj(1, b"<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{3 + i * 2} 0 R" for i in range(num_pages))
    add_obj(2, f"<< /Type /Pages /Kids [{kids}] /Count {num_pages} >>".encode("ascii"))

    for i, text in enumerate(pages_text):
        page_id = 3 + i * 2
        content_id = page_id + 1
        escaped_text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_bytes = f"BT /F1 12 Tf 50 700 Td ({escaped_text}) Tj ET".encode("latin1")
        stream_len = len(stream_bytes)

        add_obj(
            page_id,
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>".encode("ascii"),
        )
        add_obj(
            content_id,
            f"<< /Length {stream_len} >>\nstream\n".encode("ascii") + stream_bytes + b"\nendstream",
        )

    # Standard Type 1 Font
    add_obj(font_id, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    # Xref table and trailer
    xref_offset = len(out)
    total_objs = font_id + 1
    out.extend(f"xref\n0 {total_objs}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for oid in range(1, total_objs):
        off = offsets[oid]
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(f"trailer\n<< /Size {total_objs} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii"))
    return bytes(out)


@pytest.fixture
def sample_pdf_path(tmp_path) -> Path:
    """Fixture providing a 2-page sample PDF with known content."""
    pdf_bytes = _generate_synthetic_pdf([
        "Introduction to Data Structures: Stacks and Queues.",
        "Algorithm Analysis: Asymptotic Big-O notation.",
    ])
    file_path = tmp_path / "data_structures_01.pdf"
    file_path.write_bytes(pdf_bytes)
    return file_path


def test_pdf_extraction_page_by_page(sample_pdf_path):
    """Verify that text is extracted page by page with full text retention."""
    pages = load_pdf(sample_pdf_path)
    assert len(pages) == 2
    assert "Stacks and Queues" in pages[0].text
    assert "Big-O notation" in pages[1].text


def test_page_number_preservation(sample_pdf_path):
    """Verify that page numbers are 1-indexed and correctly sequential."""
    pages = load_pdf(sample_pdf_path)
    assert pages[0].page_number == 1
    assert pages[1].page_number == 2
    assert pages[0].total_pages == 2
    assert pages[1].total_pages == 2


def test_document_id_preservation(sample_pdf_path):
    """Verify default derivation of document_id and explicit override."""
    default_pages = load_pdf(sample_pdf_path)
    assert default_pages[0].document_id == "data_structures_01"

    custom_pages = load_pdf(sample_pdf_path, document_id="CS_COURSE_2026")
    assert custom_pages[0].document_id == "CS_COURSE_2026"
    assert custom_pages[1].document_id == "CS_COURSE_2026"


def test_empty_page_handling(tmp_path):
    """Verify empty/blank pages are handled gracefully without losing page numbering."""
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)  # Blank page 1
    writer.add_blank_page(width=100, height=100)  # Blank page 2
    blank_pdf = tmp_path / "blank_doc.pdf"
    with open(blank_pdf, "wb") as f:
        writer.write(f)

    loader = PDFLoader(preserve_empty_pages=True)
    pages = loader.load(blank_pdf)
    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert pages[0].is_empty is True
    assert pages[0].text == ""
    assert pages[1].page_number == 2
    assert pages[1].is_empty is True


def test_file_not_found_raises():
    """Verify FileNotFoundError is raised for non-existent paths."""
    with pytest.raises(FileNotFoundError):
        load_pdf("non_existent_document.pdf")


def test_non_pdf_file_raises(tmp_path):
    """Verify ValueError is raised if target file does not have .pdf extension."""
    txt_file = tmp_path / "notes.txt"
    txt_file.write_text("Hello world", encoding="utf-8")
    with pytest.raises(ValueError):
        load_pdf(txt_file)


from src.ingestion.pdf_loader import (
    DEFAULT_MAX_PDF_SIZE_BYTES,
    ExtractedPage,
    InvalidPDFSignatureError,
    PDFEmptyFileError,
    PDFLoader,
    PDFLoadingError,
    PDFSizeLimitExceededError,
    PDFValidationError,
    load_pdf,
)


def test_empty_zero_byte_file_raises(tmp_path):
    """Verify PDFEmptyFileError (and PDFLoadingError) is raised when file is zero bytes."""
    empty_pdf = tmp_path / "empty.pdf"
    empty_pdf.touch()
    with pytest.raises(PDFEmptyFileError) as exc_info:
        load_pdf(empty_pdf)
    assert "0 bytes / empty" in str(exc_info.value)
    # Also verify backward compatibility (inherits from PDFLoadingError)
    assert isinstance(exc_info.value, PDFLoadingError)


def test_invalid_pdf_signature_raises(tmp_path):
    """Verify InvalidPDFSignatureError is raised when file lacks %PDF- magic bytes."""
    bad_sig_pdf = tmp_path / "fake.pdf"
    bad_sig_pdf.write_bytes(b"NOT_A_PDF_STREAM_HEADER_DATA")
    with pytest.raises(InvalidPDFSignatureError) as exc_info:
        load_pdf(bad_sig_pdf)
    assert "magic bytes" in str(exc_info.value)
    assert isinstance(exc_info.value, PDFValidationError)


def test_oversized_pdf_raises_size_limit_exceeded(tmp_path):
    """Verify PDFSizeLimitExceededError is raised when file exceeds max_file_size_bytes."""
    # Create a 2000-byte file starting with valid %PDF- magic bytes
    large_pdf = tmp_path / "oversized.pdf"
    large_pdf.write_bytes(b"%PDF-1.4\n" + b"X" * 1990)

    # Set custom loader limit to 1000 bytes
    loader = PDFLoader(max_file_size_bytes=1000)
    with pytest.raises(PDFSizeLimitExceededError) as exc_info:
        loader.load(large_pdf)
    assert "exceeds maximum allowed limit" in str(exc_info.value)
    assert "1000 bytes" in str(exc_info.value)
    assert isinstance(exc_info.value, PDFValidationError)


def test_corrupt_pdf_file_raises(tmp_path):
    """Verify PDFLoadingError is raised for unreadable corrupt PDF streams with valid magic bytes."""
    corrupt_pdf = tmp_path / "corrupt.pdf"
    # Starts with valid magic bytes to pass signature check, but subsequent stream is corrupt
    corrupt_pdf.write_bytes(b"%PDF-1.4\nMalformed corrupted stream data without xref or trailer %%EOF")
    with pytest.raises(PDFLoadingError):
        load_pdf(corrupt_pdf)


def test_extracted_page_to_dict(sample_pdf_path):
    """Verify page model serialization to dict matching expected RAG contract."""
    pages = load_pdf(sample_pdf_path)
    d = pages[0].to_dict()
    assert d["document_id"] == "data_structures_01"
    assert d["page_number"] == 1
    assert "Stacks and Queues" in d["text"]
    assert d["total_pages"] == 2
    assert "source_path" in d


def test_pdf_metadata_access_failure_raises_pdf_loading_error(sample_pdf_path, monkeypatch):
    """Verify PDFLoadingError is raised cleanly when file metadata access or stat fails."""
    from pathlib import Path

    def fake_stat(self, *args, **kwargs):
        raise OSError("Simulated I/O permission or filesystem metadata failure")

    monkeypatch.setattr(Path, "stat", fake_stat)
    loader = PDFLoader()
    with pytest.raises(PDFLoadingError) as exc_info:
        loader.load(sample_pdf_path)
    assert "Failed to access file metadata" in str(exc_info.value)
