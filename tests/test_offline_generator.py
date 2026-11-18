"""Unit tests for the OfflineQuestionGenerator module."""

import json
import pytest

from src.rag.retriever import RetrievedContextChunk
from src.rag.offline_generator import OfflineQuestionGenerator


@pytest.fixture
def sample_academic_chunks():
    return [
        RetrievedContextChunk(
            document_id="doc_se",
            page_number=18,
            chunk_index=0,
            text=(
                "Software Engineering Page 18\n"
                "Phases of Agile model:\n"
                "1. Requirements gathering\n"
                "2. Design the requirements\n"
                "3. Construction iteration\n"
                "4. Testing Quality assurance\n"
                "5. Deployment\n"
                "6. Feedback\n\n"
                "Requirements gathering: In this phase, you must define the requirements."
            ),
            similarity_score=0.92,
            source="Software_Engineering.pdf",
        ),
        RetrievedContextChunk(
            document_id="doc_se",
            page_number=25,
            chunk_index=1,
            text=(
                "FEASIBILITY STUDIES: Starting point of the requirements engineering process.\n"
                "Input: Set of preliminary business requirements and an outline description.\n"
                "Ensemble Learning is a machine learning technique in which multiple models are combined to produce a single reliable prediction."
            ),
            similarity_score=0.88,
            source="Software_Engineering.pdf",
        ),
        RetrievedContextChunk(
            document_id="doc_se",
            page_number=13,
            chunk_index=2,
            text=(
                "DECORATE stands for: Diverse Ensemble Creation by Oppositional Relabeling of Artificial Training Examples.\n"
                "It is designed to create a diverse collection of classifiers.\n"
                "ISO 9001: This standard applies to the organizations engaged in design and development."
            ),
            similarity_score=0.84,
            source="Software_Engineering.pdf",
        ),
    ]


def test_offline_generator_synthesizes_questions_from_chunks(sample_academic_chunks):
    """Verify offline engine understands chunks and outputs valid JSON questions."""
    raw_json = OfflineQuestionGenerator.generate_questions(
        chunks=sample_academic_chunks,
        topic="Software Engineering",
        question_count=3,
        seed=0,
    )

    data = json.loads(raw_json)
    assert data["insufficient"] is False
    assert len(data["questions"]) == 3

    for q in data["questions"]:
        assert "question" in q and len(q["question"]) > 10
        assert "options" in q and len(q["options"]) == 4
        assert 0 <= q["correct_option_index"] <= 3
        assert "explanation" in q and len(q["explanation"]) > 10
        assert "source_page" in q
        assert q["source_page"] in [13, 18, 25]


def test_offline_generator_rotates_on_seed(sample_academic_chunks):
    """Verify different seeds yield diverse questions across attempts on 'new question'."""
    raw_0 = OfflineQuestionGenerator.generate_questions(
        chunks=sample_academic_chunks,
        topic="Software Engineering",
        question_count=2,
        seed=0,
    )
    raw_1 = OfflineQuestionGenerator.generate_questions(
        chunks=sample_academic_chunks,
        topic="Software Engineering",
        question_count=2,
        seed=1,
    )

    q0 = json.loads(raw_0)["questions"]
    q1 = json.loads(raw_1)["questions"]

    stems_0 = {q["question"].strip() for q in q0}
    stems_1 = {q["question"].strip() for q in q1}

    # At least one question stem should differ due to seed rotation
    assert stems_0 != stems_1


def test_offline_generator_handles_empty_chunks_gracefully():
    """Verify empty chunks list falls back to grounded study strategy questions."""
    raw = OfflineQuestionGenerator.generate_questions(
        chunks=[],
        topic="Operating Systems",
        question_count=2,
    )
    data = json.loads(raw)
    assert data["insufficient"] is False
    assert len(data["questions"]) == 2
    assert "Operating Systems" in data["questions"][0]["question"]


def test_offline_generator_generates_exact_count(sample_academic_chunks):
    """Verify target_count is honored accurately."""
    raw = OfflineQuestionGenerator.generate_questions(
        chunks=sample_academic_chunks,
        topic="Software Engineering",
        question_count=5,
        seed=42,
    )
    data = json.loads(raw)
    assert len(data["questions"]) == 5
