"""Deterministic Text Cleaner for Course Ingestion Pipeline.

Cleans and normalizes extracted PDF text while preserving crucial mathematical
notations, algorithmic complexity formulas, and academic structure.
"""

import re
from typing import List, Optional


# Regex matching hyphenated words split across line breaks (e.g., "algo-\nrithm" -> "algorithm")
_DEHYPHENATION_REGEX = re.compile(r"([A-Za-z]{2,})-\s*\n\s*([A-Za-z]{2,})")

# Regex matching common standalone header/footer page markers (e.g., "Page 12 of 45", "Page 12", "- 12 -")
_PAGE_MARKER_REGEX = re.compile(
    r"(?im)^(?:\s*(?:page\s+\d+(?:\s+of\s+\d+)?|-+\s*\d+\s*-+|\[\s*\d+\s*\]|\d+)\s*)$"
)

# Regex matching non-standard whitespaces (non-breaking spaces, form feeds, vertical tabs)
_IRREGULAR_WHITESPACE_REGEX = re.compile(r"[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\f\v]")


def normalize_line_breaks(text: str) -> str:
    """Normalize Windows (\r\n) and classic Mac (\r) line breaks to standard Unix (\n).

    Args:
        text: Input raw string.

    Returns:
        String with unified '\n' line endings.
    """
    if not text:
        return ""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def dehyphenate_line_breaks(text: str) -> str:
    """Join words severed across line breaks by PDF column layout/justification.

    Preserves mathematical minus signs and expressions like 'x - \n y' or list bullets.

    Example:
        'algo-\\nrithm' -> 'algorithm'
    """
    if not text:
        return ""
    return _DEHYPHENATION_REGEX.sub(r"\1\2", text)


def normalize_whitespace(text: str) -> str:
    """Normalize horizontal whitespace without collapsing intentional paragraph line breaks.

    Replaces non-breaking spaces, tabs, and multi-spaces with single space.
    """
    if not text:
        return ""

    # Replace irregular Unicode spaces
    cleaned = _IRREGULAR_WHITESPACE_REGEX.sub(" ", text)

    # Process line-by-line to preserve line breaks
    normalized_lines = []
    for line in cleaned.split("\n"):
        # Replace tabs and multiple horizontal spaces with a single space
        line = re.sub(r"[ \t]+", " ", line).strip()
        normalized_lines.append(line)

    return "\n".join(normalized_lines)


def remove_excessive_blank_lines(text: str, max_consecutive_newlines: int = 2) -> str:
    """Collapse 3 or more consecutive newlines down to standard paragraph breaks (\n\n).

    Args:
        text: Input string.
        max_consecutive_newlines: Maximum permitted consecutive newlines (default 2).
    """
    if not text:
        return ""
    pattern = r"\n{" + str(max_consecutive_newlines + 1) + r",}"
    return re.sub(pattern, "\n" * max_consecutive_newlines, text).strip()


def remove_standalone_page_markers(text: str) -> str:
    """Strip obvious standalone page footer/header markers (e.g. 'Page 5 of 20', '- 5 -')."""
    if not text:
        return ""
    lines = text.split("\n")
    filtered_lines = [line for line in lines if not _PAGE_MARKER_REGEX.match(line.strip())]
    return "\n".join(filtered_lines)


def clean_text(
    text: str,
    dehyphenate: bool = True,
    remove_page_markers: bool = True,
    max_consecutive_newlines: int = 2,
) -> str:
    """Run full deterministic text cleaning pipeline.

    Preserves mathematical formulas, equations, big-O notations, and computer science symbols.

    Args:
        text: Raw extracted text from PDF or page.
        dehyphenate: Whether to reconstruct words broken by hyphens across linebreaks.
        remove_page_markers: Whether to filter standalone 'Page X of Y' markers.
        max_consecutive_newlines: Cap on consecutive newline sequences.

    Returns:
        Cleaned, normalized string.
    """
    if not text:
        return ""

    # Step 1: Normalize newline representations
    cleaned = normalize_line_breaks(text)

    # Step 2: Reconstruct severed words if requested
    if dehyphenate:
        cleaned = dehyphenate_line_breaks(cleaned)

    # Step 3: Strip standalone page number headers/footers if requested
    if remove_page_markers:
        cleaned = remove_standalone_page_markers(cleaned)

    # Step 4: Normalize horizontal whitespaces per line
    cleaned = normalize_whitespace(cleaned)

    # Step 5: Collapse excessive empty blank lines
    cleaned = remove_excessive_blank_lines(cleaned, max_consecutive_newlines)

    return cleaned
