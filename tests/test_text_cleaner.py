"""Unit tests for deterministic text cleaning and mathematical expression preservation."""

import pytest

from src.ingestion.text_cleaner import (
    clean_text,
    dehyphenate_line_breaks,
    normalize_line_breaks,
    normalize_whitespace,
    remove_excessive_blank_lines,
    remove_standalone_page_markers,
)


def test_normalize_line_breaks():
    """Verify that CRLF (\r\n) and legacy CR (\r) are converted to standard LF (\n)."""
    raw = "Line 1\r\nLine 2\rLine 3\nLine 4"
    expected = "Line 1\nLine 2\nLine 3\nLine 4"
    assert normalize_line_breaks(raw) == expected


def test_dehyphenate_line_breaks():
    """Verify that split words are reconstructed while mathematical subtractions remain intact."""
    text = "The dynamic program-\nming algo-\nrithm runs in polynomial time."
    cleaned = dehyphenate_line_breaks(text)
    assert "programming" in cleaned
    assert "algorithm" in cleaned

    # Check math expression with minus sign is NOT corrupted
    math_text = "Compute x - y for values x and y."
    assert dehyphenate_line_breaks(math_text) == math_text


def test_normalize_whitespace():
    """Verify tabs, irregular spaces, and multi-spaces within lines are collapsed cleanly."""
    raw = "Binary\t\tSearch   Tree \u00a0with   elements."
    cleaned = normalize_whitespace(raw)
    assert cleaned == "Binary Search Tree with elements."


def test_remove_excessive_blank_lines():
    """Verify sequences of 3+ consecutive newlines are clamped to standard double newlines."""
    raw = "Paragraph 1\n\n\n\n\nParagraph 2\n\nParagraph 3"
    cleaned = remove_excessive_blank_lines(raw)
    assert cleaned == "Paragraph 1\n\nParagraph 2\n\nParagraph 3"


def test_remove_standalone_page_markers():
    """Verify standalone headers and footers matching page formats are stripped."""
    raw = "Header content\nPage 14 of 50\nMain educational text\n- 14 -\nSummary text"
    cleaned = remove_standalone_page_markers(raw)
    lines = [line.strip() for line in cleaned.split("\n") if line.strip()]
    assert "Page 14 of 50" not in lines
    assert "- 14 -" not in lines
    assert "Header content" in lines
    assert "Main educational text" in lines
    assert "Summary text" in lines


def test_preserve_mathematical_content():
    """Verify formulas, complex notations, and Big-O expressions are strictly preserved."""
    math_examples = [
        "Time Complexity: O(log n) auxiliary space: O(1).",
        "Tree height formula: 2^(h+1) - 1 nodes.",
        "Shannon Capacity: C = B * log2(1 + S/N).",
        "Conditions: (a <= b) && (c != d) || (x >= y).",
        "Combinations formula: n * (n - 1) / 2.",
    ]
    for expr in math_examples:
        cleaned = clean_text(expr)
        assert expr in cleaned, f"Cleaned text corrupted math expression: '{expr}' -> '{cleaned}'"


def test_clean_text_full_pipeline():
    """Verify the integrated clean_text pipeline produces clean, well-formatted text."""
    raw = (
        "Course: Data Struc-\r\ntures\r\n\r\n\r\n"
        "Page 5 of 20\r\n\r\n"
        "A stack is a   LIFO   collection.\r\n"
        "Operations:  push(x)  and pop().\r\n"
    )
    cleaned = clean_text(raw)
    assert "Data Structures" in cleaned
    assert "Page 5 of 20" not in cleaned
    assert "A stack is a LIFO collection." in cleaned
    assert "push(x) and pop()." in cleaned
    assert "\r" not in cleaned
