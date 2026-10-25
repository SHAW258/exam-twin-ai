"""End-to-end integration test exercising the complete Phase 5 -> 6 -> 7 workflow.

Pipeline:
Student Response
  ↓
Phase 5 Error Classifier Inference (Confidence thresholding & uncalibrated probabilities)
  ↓
Phase 6 Persistent Audit Logging (ErrorDiagnosisRecord & Student Profile)
  ↓
Phase 6 Verified Assessment Recording (TopicMasteryState credential-weighted scoring)
  ↓
Phase 6 Error DNA Aggregation (Recurring error categories, affected topics, temporal trends)
  ↓
Phase 7 Multi-Factor Topic Prioritization (Frequency, recency, recurrence, difficulty, recent success)
  ↓
Phase 7 Pedagogical Strategy Selection (Deterministic ErrorType -> InterventionStrategy)
  ↓
Phase 4 Course-Grounded RAG Retrieval (Verified document citations)
  ↓
Final Structured InterventionRecommendation Output Contract
"""

from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.adaptive_intervention.models import InterventionStrategy
from src.adaptive_intervention.schemas import InterventionRecommendation
from src.adaptive_intervention.service import AdaptiveInterventionService
from src.database.connection import DatabaseManager
from src.database.models import Base
from src.error_diagnosis.classifier import ErrorDiagnosisClassifier
from src.error_diagnosis.taxonomy import ErrorType
from src.learner_state.service import LearnerStateService
from src.rag.rag_service import RAGResponse, RAGService, SourceCitation


@pytest.fixture
def isolated_db():
    """Create isolated in-memory test database."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=True, expire_on_commit=False)

    class IsolatedDbManager(DatabaseManager):
        def __init__(self):
            self._engine = engine
            self._session_factory = session_factory

    mgr = IsolatedDbManager()
    yield mgr
    mgr.dispose()


class MockRAGService(RAGService):
    """Synthetic RAG service returning grounded course textbook content and page citations."""

    def __init__(self):
        pass

    def answer_question(self, question, **kwargs):
        return RAGResponse(
            answer=(
                "Binary Search Trees (BST) maintain keys such that for any node, left subtree keys "
                "are strictly smaller and right subtree keys are strictly greater. In contrast, "
                "stacks enforce Last-In-First-Out access."
            ),
            sources=[
                SourceCitation(
                    document_id="doc_dsa_textbook",
                    source="Data_Structures_and_Algorithms_Notes.pdf",
                    page_number=45,
                    similarity_score=0.9124,
                ),
                SourceCitation(
                    document_id="doc_dsa_textbook",
                    source="Data_Structures_and_Algorithms_Notes.pdf",
                    page_number=46,
                    similarity_score=0.8875,
                ),
            ],
            retrieved_chunks=2,
            is_grounded=True,
            question=question,
        )

    def generate_practice_question(self, topic, **kwargs):
        return RAGResponse(
            answer=f"Practice Problem for {topic}: Trace insertion of elements [15, 8, 24, 4] into an empty BST.",
            sources=[
                SourceCitation(
                    document_id="doc_dsa_textbook",
                    source="Data_Structures_and_Algorithms_Notes.pdf",
                    page_number=50,
                    similarity_score=0.8950,
                )
            ],
            retrieved_chunks=1,
            is_grounded=True,
            question=topic,
        )


def test_complete_phase5_to_7_end_to_end_workflow(isolated_db):
    """Execute end-to-end integration: raw answers -> ML diagnosis -> learner state -> Error DNA -> adaptive recommendation."""
    student_id = "student_mca_e2e_2026"

    # Step 1: Initialize services
    # Set min_confidence=0.20 suited for small 7-class baseline softmax distribution
    classifier = ErrorDiagnosisClassifier(min_confidence=0.20)
    learner_service = LearnerStateService(db_manager=isolated_db, classifier=classifier)
    rag_service = MockRAGService()

    adaptive_service = AdaptiveInterventionService(
        learner_state_service=learner_service,
        rag_service=rag_service,
    )

    # Step 2: Student submits response for Question 1 (Data Structures)
    # Flawed mental model: confusing LIFO with FIFO
    q1_text = "What is a stack data structure?"
    s1_ans = "A linear data structure where elements are removed in First-In-First-Out (FIFO) order"
    e1_exp = "A linear data structure following Last-In-First-Out (LIFO) principle"

    rec1 = learner_service.diagnose_and_record(
        external_student_id=student_id,
        question=q1_text,
        student_answer=s1_ans,
        expected_answer=e1_exp,
        topic="Data Structures",
    )

    assert rec1.id.startswith("err_")
    assert rec1.topic == "Data Structures"
    assert rec1.error_category == ErrorType.CONCEPTUAL_MISUNDERSTANDING.value
    assert rec1.confidence_score >= 0.20
    assert rec1.needs_review is False
    assert rec1.is_verified is False

    # Step 3: Student submits second response in Data Structures
    # Another conceptual misunderstanding on AVL trees
    q2_text = "What is the primary characteristic of an AVL tree?"
    s2_ans = "A tree where each node can have any number of children without height balancing"
    e2_exp = "A self-balancing binary search tree where the height difference between left and right subtrees is at most 1"

    rec2 = learner_service.diagnose_and_record(
        external_student_id=student_id,
        question=q2_text,
        student_answer=s2_ans,
        expected_answer=e2_exp,
        topic="Data Structures",
    )
    assert rec2.error_category == ErrorType.CONCEPTUAL_MISUNDERSTANDING.value
    assert rec2.needs_review is False

    # Step 4: Student submits response in Operating Systems with low-confidence / vague answer
    q3_text = "Explain the difference between paging and segmentation."
    s3_ans = "Something with memory"

    rec3 = learner_service.diagnose_and_record(
        external_student_id=student_id,
        question=q3_text,
        student_answer=s3_ans,
        expected_answer="Paging divides memory into fixed frames; segmentation divides into variable logical segments.",
        topic="Operating Systems",
    )
    # Low confidence -> category withheld, needs_review=True
    assert rec3.needs_review is True
    assert rec3.confidence_score < 0.20
    assert rec3.error_category is None

    # Step 5: Record verified assessment results in Data Structures
    # Student attempts 2 verified assessment questions: 1 incorrect, 1 correct
    m_res = learner_service.record_verified_assessment(
        external_student_id=student_id,
        topic="Data Structures",
        is_correct=False,
    )
    m_res2 = learner_service.record_verified_assessment(
        external_student_id=student_id,
        topic="Data Structures",
        is_correct=True,
    )
    assert m_res2.attempts_count == 2
    assert m_res2.correct_attempts == 1
    assert m_res2.incorrect_attempts == 1
    assert m_res2.mastery_score == 0.25

    # Step 6: Verify Phase 6 Error DNA Summary
    dna = learner_service.get_error_dna_summary(external_student_id=student_id)
    assert dna.student_id == student_id
    assert dna.total_diagnoses == 3
    assert dna.confirmed_diagnoses_count == 2
    assert dna.review_required_count == 1
    assert len(dna.recurring_errors) == 1
    assert dna.recurring_errors[0].category == "CONCEPTUAL_MISUNDERSTANDING"
    assert dna.recurring_errors[0].count == 2
    assert dna.recurring_errors[0].percentage == 100.0

    # Step 7: Execute Phase 7 Adaptive Intervention Recommendation with Grounded Content
    recommendation: InterventionRecommendation = adaptive_service.recommend_intervention(
        external_student_id=student_id,
        include_grounded_content=True,
    )

    # 1. Topic prioritization verification
    assert recommendation.student_id == student_id
    assert recommendation.selected_topic == "Data Structures"
    assert recommendation.priority_score > 0.0
    assert 0.0 <= recommendation.priority_score <= 1.0

    # Verify score breakdown
    bd = recommendation.priority_breakdown
    assert bd.frequency_score == 1.0  # highest error frequency
    assert bd.recurrence_score == 0.50  # 2 repeated CONCEPTUAL errors: (2-1)/(3-1) = 0.5
    assert bd.difficulty_score == 0.50  # 1 incorrect / 2 attempts
    assert bd.final_score == recommendation.priority_score

    # 2. Strategy selection verification
    # CONCEPTUAL_MISUNDERSTANDING must map to CONCEPT_EXPLANATION
    assert recommendation.selected_strategy == InterventionStrategy.CONCEPT_EXPLANATION
    assert "CONCEPTUAL_MISUNDERSTANDING" in recommendation.strategy_rationale
    assert "worked example" in recommendation.strategy_rationale

    # 3. Explainability and student-friendly communication
    assert "Data Structures" in recommendation.student_explanation
    assert "Concept Explanation" in recommendation.student_explanation

    # 4. Optional Grounded RAG integration verification
    assert recommendation.grounded_content is not None
    assert "Binary Search Trees" in recommendation.grounded_content
    assert len(recommendation.grounded_citations) == 2
    assert recommendation.grounded_citations[0].document_id == "doc_dsa_textbook"
    assert recommendation.grounded_citations[0].page_number == 45
    assert recommendation.grounded_citations[1].page_number == 46

    # 5. Diagnostic evidence contract verification
    assert recommendation.error_dna_evidence.total_diagnoses == 3
    assert recommendation.error_dna_evidence.dominant_error_category == "CONCEPTUAL_MISUNDERSTANDING"
    assert recommendation.error_dna_evidence.dominant_category_count == 2
    assert recommendation.mastery_evidence is not None
    assert recommendation.mastery_evidence.attempts_count == 2
    assert recommendation.mastery_evidence.mastery_score == 0.25

    # 6. Candidate topic rankings verification
    assert len(recommendation.all_ranked_topics) == 2
    assert recommendation.all_ranked_topics[0].topic == "Data Structures"
    assert recommendation.all_ranked_topics[0].rank == 1
    assert recommendation.all_ranked_topics[1].topic == "Operating Systems"
    assert recommendation.all_ranked_topics[1].rank == 2
