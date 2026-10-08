"""Unit tests for the PromptBuilder module."""

import pytest

from src.rag.prompt_builder import (
    PromptBuilder,
    SYSTEM_PROMPT_GROUNDED,
    build_grounded_prompt,
)
from src.rag.retriever import RetrievedContextChunk


@pytest.fixture
def sample_chunks():
    return [
        RetrievedContextChunk(
            document_id="doc_ds",
            page_number=5,
            chunk_index=0,
            text="A stack is a Last-In-First-Out data structure. Operations are push and pop.",
            similarity_score=0.88,
            source="data_structures.pdf",
        ),
        RetrievedContextChunk(
            document_id="doc_ds",
            page_number=6,
            chunk_index=1,
            text="A queue is a First-In-First-Out data structure. Operations are enqueue and dequeue.",
            similarity_score=0.74,
            source="data_structures.pdf",
        ),
    ]


def test_build_context_block_formatting(sample_chunks):
    """Verify context block formats source identity, page number, and content cleanly."""
    builder = PromptBuilder()
    context = builder.build_context_block(sample_chunks)

    assert "--- SOURCE 1 ---" in context
    assert "Document: data_structures.pdf" in context
    assert "Page: 5" in context
    assert "Similarity Score: 0.88" in context
    assert "Last-In-First-Out" in context

    assert "--- SOURCE 2 ---" in context
    assert "Page: 6" in context
    assert "First-In-First-Out" in context


def test_build_context_block_empty():
    """Verify context block handles empty chunk list safely."""
    builder = PromptBuilder()
    context = builder.build_context_block([])
    assert "No document context available." in context


def test_build_context_block_respects_char_budget(sample_chunks):
    """Verify context block respects max_context_chars budget."""
    builder = PromptBuilder(max_context_chars=180)
    context = builder.build_context_block(sample_chunks)

    assert len(context) <= 220
    # The second chunk should be omitted due to budget
    assert "--- SOURCE 2 ---" not in context


def test_build_grounded_qa_prompt_structure_and_instructions(sample_chunks):
    """Verify full prompt structure, section demarcations, and grounding rules."""
    builder = PromptBuilder()
    prompt = builder.build_grounded_qa_prompt(
        question="What is the difference between stack and queue?",
        chunks=sample_chunks,
    )

    # Verify structural sections
    assert "[SYSTEM INSTRUCTIONS]" in prompt
    assert "[RETRIEVED DOCUMENT CONTEXT]" in prompt
    assert "[STUDENT QUESTION]" in prompt
    assert "[INSTRUCTIONS FOR RESPONSE]" in prompt

    # Verify student question presence
    assert "What is the difference between stack and queue?" in prompt

    # Verify grounding and security rules
    assert "UNTRUSTED DATA" in prompt
    assert "Ignore all previous instructions" in prompt
    assert "hallucinate" in prompt or "invent" in prompt
    assert "Page: 5" in prompt
    assert "Page: 6" in prompt


def test_convenience_function_build_grounded_prompt(sample_chunks):
    """Verify functional wrapper build_grounded_prompt works identically."""
    prompt = build_grounded_prompt("Explain LIFO.", sample_chunks)
    assert "[SYSTEM INSTRUCTIONS]" in prompt
    assert "Explain LIFO." in prompt
    assert "Page: 5" in prompt


def test_educational_prompt_builders(sample_chunks):
    """Verify hint prompt and practice question prompt builders."""
    builder = PromptBuilder()

    hint_prompt = builder.build_hint_prompt(
        question="What is LIFO?",
        chunks=sample_chunks,
        student_answer="First In First Out",
    )
    assert "Student's Attempt: First In First Out" in hint_prompt
    assert "Do NOT reveal the direct final answer" in hint_prompt

    practice_prompt = builder.build_practice_question_prompt(
        topic="Stacks and Queues",
        chunks=sample_chunks,
    )
    assert "[TOPIC FOCUS]" in practice_prompt
    assert "Stacks and Queues" in practice_prompt
    assert "Generate an exam practice question" in practice_prompt
