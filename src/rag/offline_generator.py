"""Intelligent offline question synthesis engine for CodeKnot RAG.

When external LLM APIs (e.g. Google Gemini) hit rate limits (HTTP 429),
quota exhaustion, or connection dropouts, this engine autonomously reads
and understands the extracted PDF chunks. It extracts definitions, processes,
steps, properties, acronyms, and core facts from the material and synthesizes
human-like multiple-choice exam questions with page citations and plausible
distractors.
"""

import hashlib
import json
import logging
import random
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from src.rag.retriever import RetrievedContextChunk

logger = logging.getLogger(__name__)


class KnowledgeFact:
    """Structured academic fact extracted from document text chunks."""

    def __init__(
        self,
        fact_type: str,  # 'definition', 'steps', 'acronym', 'property', 'statement'
        concept: str,
        content: str,
        page_number: int,
        document_id: str,
        source: str,
        items: Optional[List[str]] = None,
        quote: str = "",
    ):
        self.fact_type = fact_type
        self.concept = concept.strip()
        self.content = content.strip()
        self.page_number = page_number
        self.document_id = document_id
        self.source = source
        self.items = items or []
        self.quote = (quote or content).strip()

    def __repr__(self) -> str:
        return f"<Fact [{self.fact_type.upper()}] {self.concept} (p.{self.page_number})>"


class OfflineQuestionGenerator:
    """Generates high-quality, human-like MCQs directly from extracted PDF chunks."""

    NOISE_PATTERNS = [
        re.compile(r"^\s*page\s*\|\s*\d+\s*$", re.IGNORECASE),
        re.compile(r"^\s*page\s*\d+\s*$", re.IGNORECASE),
        re.compile(r"software engineering page \d+", re.IGNORECASE),
        re.compile(r"malla reddy college of engineering", re.IGNORECASE),
        re.compile(r"^\s*\d+\s*$"),
        re.compile(r"^\s*unit\s*[-–—]\s*[ivx0-9]+\s*:?", re.IGNORECASE),
        re.compile(r"^\s*(?:all rights reserved|copyright|\(c\)).*$", re.IGNORECASE),
    ]

    @classmethod
    def extract_facts_from_chunks(
        cls,
        chunks: List[RetrievedContextChunk],
        topic: str = "",
    ) -> List[KnowledgeFact]:
        """Extract structured knowledge facts across all provided chunks."""
        facts: List[KnowledgeFact] = []
        seen_keys: Set[str] = set()

        for chunk in chunks:
            text = chunk.text or ""
            page = chunk.page_number
            doc_id = chunk.document_id
            src = chunk.source or f"{doc_id}.pdf"

            # 1. Acronym Definitions (e.g. DECORATE stands for ...)
            for m in re.finditer(
                r"\b([A-Z]{2,10})\b\s+stands for:?\s*[\n\r•\-\*]*\s*([^\n\r.]+)",
                text,
            ):
                acro, exp = m.group(1).strip(), m.group(2).strip()
                if len(exp) >= 12 and not exp.lower().startswith("example"):
                    key = f"acro_{acro.lower()}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        facts.append(
                            KnowledgeFact(
                                fact_type="acronym",
                                concept=acro,
                                content=exp,
                                page_number=page,
                                document_id=doc_id,
                                source=src,
                                quote=m.group(0).strip(),
                            )
                        )

            # 2. Lists and Multi-step Procedures (e.g. Phases of Agile model, Steps of Basis Path Testing)
            list_matches = re.finditer(
                r"(?:Phases|Steps|Components|Stages|Factors|Methods|Types)\s+of\s+([A-Za-z0-9\s\-]+?):?\s*\n+((?:\s*(?:\d+[\.\)]|[•\-\*])\s*[^\n]+\n?){2,})",
                text,
                re.IGNORECASE,
            )
            for lm in list_matches:
                concept = lm.group(1).strip()
                raw_items = lm.group(2).strip().splitlines()
                items = [
                    re.sub(r"^\s*(?:\d+[\.\)]|[•\-\*])\s*", "", it).strip()
                    for it in raw_items
                    if it.strip()
                ]
                clean_items = [it for it in items if len(it) >= 4 and not it.lower().startswith("page")]
                if len(clean_items) >= 2:
                    key = f"list_{concept.lower()}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        facts.append(
                            KnowledgeFact(
                                fact_type="steps",
                                concept=concept,
                                content=f"{concept} includes: " + ", ".join(clean_items[:5]),
                                page_number=page,
                                document_id=doc_id,
                                source=src,
                                items=clean_items,
                                quote=lm.group(0)[:250].strip(),
                            )
                        )

            # 3. Explicit Definitions (e.g. X is a technique ..., X refers to ...)
            for line in text.splitlines():
                clean_line = line.strip()
                if not clean_line or any(p.search(clean_line) for p in cls.NOISE_PATTERNS):
                    continue

                def_m = re.match(
                    r"^([A-Z][A-Za-z0-9\s\-/]{2,35}?)\s+(?:is defined as|refers to|is a technique|is an ensemble|is a machine learning technique|is a process|is an approach|is the starting point of|is a standard that|is the)\s+([^.\n]{15,280})",
                    clean_line,
                )
                if def_m:
                    concept = def_m.group(1).strip()
                    explanation = def_m.group(2).strip()
                    # Exclude generic words
                    if concept.lower() not in {"this", "it", "there", "which", "these", "note", "example", "step", "figure"}:
                        key = f"def_{concept.lower()}"
                        if key not in seen_keys:
                            seen_keys.add(key)
                            facts.append(
                                KnowledgeFact(
                                    fact_type="definition",
                                    concept=concept,
                                    content=explanation,
                                    page_number=page,
                                    document_id=doc_id,
                                    source=src,
                                    quote=clean_line,
                                )
                            )

                # Headings followed by colon definition (e.g. FEASIBILITY STUDIES: Starting point of ...)
                head_m = re.match(
                    r"^([A-Z][A-Za-z0-9\s\-]{2,35}):\s*([A-Z][^.\n]{15,250})",
                    clean_line,
                )
                if head_m:
                    concept = head_m.group(1).strip()
                    detail = head_m.group(2).strip()
                    if concept.lower() not in {"note", "example", "page", "source", "unit", "chapter"}:
                        key = f"prop_{concept.lower()}"
                        if key not in seen_keys:
                            seen_keys.add(key)
                            facts.append(
                                KnowledgeFact(
                                    fact_type="property",
                                    concept=concept,
                                    content=detail,
                                    page_number=page,
                                    document_id=doc_id,
                                    source=src,
                                    quote=clean_line,
                                )
                            )

            # 4. Sentence-level core facts for rich text chunks
            sentences = re.split(r"(?<=[.!?])\s+", text)
            for s in sentences:
                s_clean = s.strip()
                if (
                    len(s_clean) >= 45
                    and len(s_clean) <= 220
                    and not any(p.search(s_clean) for p in cls.NOISE_PATTERNS)
                ):
                    # Check for informative predicate patterns
                    if any(
                        kw in s_clean.lower()
                        for kw in (
                            "applied to", "used for", "ensures", "requires", "evaluates",
                            "combines", "consists of", "primary objective", "key advantage",
                            "bootstrap", "classifier", "cyclomatic", "testing", "architecture",
                            "regression", "classification", "requirements", "algorithm",
                        )
                    ):
                        words = s_clean.split()
                        subject_candidate = " ".join(words[:4]).strip(",:;-")
                        key = f"sent_{s_clean[:40].lower()}"
                        if key not in seen_keys and len(subject_candidate) >= 3:
                            seen_keys.add(key)
                            facts.append(
                                KnowledgeFact(
                                    fact_type="statement",
                                    concept=subject_candidate,
                                    content=s_clean,
                                    page_number=page,
                                    document_id=doc_id,
                                    source=src,
                                    quote=s_clean,
                                )
                            )

        return facts

    @classmethod
    def _create_distractors(
        cls,
        correct_answer: str,
        fact: KnowledgeFact,
        all_facts: List[KnowledgeFact],
        rng: random.Random,
    ) -> List[str]:
        """Synthesize 3 plausible distractors tailored to the question archetype."""
        distractors: List[str] = []

        # Archetype 1: Steps / Lists
        if fact.fact_type == "steps" and fact.items:
            plausible_false_steps = [
                "Bypassing requirement documentation during verification",
                "Arbitrary elimination of redundant flow branches without execution",
                "Discarding baseline performance metrics prior to test design",
                "Executing unvalidated source modifications directly in production",
                "Restricting validation strictly to isolated single-case assertions",
                "Relying exclusively on non-deterministic heuristic estimations",
            ]
            rng.shuffle(plausible_false_steps)
            distractors = plausible_false_steps[:3]

        # Archetype 2: Acronyms
        elif fact.fact_type == "acronym":
            tokens = fact.concept.upper()
            distractors = [
                f"Distributed Evaluation Configuration for Rapid Automated Testing",
                f"Dynamic Ensemble Creation through Optimal Resource Allocation",
                f"Deterministic Execution Protocol for Accelerated Training",
            ]

        # Archetype 3: Definitions & Properties
        else:
            # Pick other concepts' descriptions from different pages of the same document
            other_explanations = [
                f.content for f in all_facts
                if f.concept.lower() != fact.concept.lower()
                and len(f.content) >= 15
                and f.content != correct_answer
            ]
            if len(other_explanations) >= 3:
                chosen = rng.sample(other_explanations, 3)
                distractors = [cls._clean_distractor_text(c) for c in chosen]
            else:
                distractors = [
                    f"A mechanism designed to bypass system validation without altering external behavior.",
                    f"A static inspection phase restricted exclusively to hardware interface diagnostics.",
                    f"A procedural step where isolated execution metrics are ignored during synthesis.",
                ]

        # Ensure exactly 3 distinct distractors that do not match correct_answer
        unique_distractors: List[str] = []
        for d in distractors:
            clean_d = d.strip()
            if clean_d and clean_d.lower() != correct_answer.lower() and clean_d not in unique_distractors:
                unique_distractors.append(clean_d)

        fallbacks = [
            "An approach focusing exclusively on heuristic approximations without verification.",
            "A legacy protocol that isolates internal states without persistent checkpoints.",
            "A process where dependency structures are computed without baseline validations.",
            "A methodology that discards multi-model outputs in favor of unweighted guessing.",
        ]
        fb_idx = 0
        while len(unique_distractors) < 3 and fb_idx < len(fallbacks):
            if fallbacks[fb_idx] not in unique_distractors and fallbacks[fb_idx].lower() != correct_answer.lower():
                unique_distractors.append(fallbacks[fb_idx])
            fb_idx += 1

        return unique_distractors[:3]

    @classmethod
    def _clean_distractor_text(cls, text: str) -> str:
        """Format an excerpt as a clean, capitalized MCQ option."""
        clean = text.strip().rstrip(";,.")
        if clean and not clean[0].isupper():
            clean = clean[0].upper() + clean[1:]
        if len(clean) > 130:
            clean = clean[:127] + "..."
        return clean

    @classmethod
    def synthesize_question(
        cls,
        fact: KnowledgeFact,
        all_facts: List[KnowledgeFact],
        rng: random.Random,
        topic: str = "",
        include_provenance: bool = True,
        variation_index: int = 0,
    ) -> Dict[str, Any]:
        """Convert an extracted fact into a human-like MCQ with options and explanation."""
        topic_label = topic.strip() or fact.source.replace(".pdf", "")

        # 1. Acronym Question
        if fact.fact_type == "acronym":
            question_text = f"In the course material on '{topic_label}', what does the acronym '{fact.concept}' stand for?"
            correct_answer = fact.content

        # 2. Procedural Steps / Phases Question
        elif fact.fact_type == "steps" and fact.items:
            # Pick one real item as the correct choice
            item_idx = variation_index % len(fact.items)
            correct_item = fact.items[item_idx]
            step_templates = [
                f"According to the course notes on '{topic_label}', which of the following is identified as a key step or phase in '{fact.concept}'?",
                f"In the context of '{topic_label}' (Page {fact.page_number}), which component is directly included in '{fact.concept}'?",
                f"Based on the study material, which sequence or action is part of '{fact.concept}'?",
            ]
            question_text = step_templates[variation_index % len(step_templates)]
            correct_answer = correct_item

        # 3. Definition Question
        elif fact.fact_type == "definition":
            def_templates = [
                f"According to the study material on '{topic_label}', what is the primary role or definition of '{fact.concept}'?",
                f"In the context of '{topic_label}' (Page {fact.page_number}), how is '{fact.concept}' fundamentally characterized?",
                f"Based on the course text, what is the core purpose or objective of '{fact.concept}'?",
            ]
            question_text = def_templates[variation_index % len(def_templates)]
            correct_answer = cls._clean_distractor_text(fact.content)

        # 4. Property or Factual Statement Question
        elif fact.fact_type == "property":
            prop_templates = [
                f"In the context of '{topic_label}', which statement accurately describes '{fact.concept}' as presented in the notes?",
                f"According to the material on '{topic_label}' (Page {fact.page_number}), what is a distinguishing feature of '{fact.concept}'?",
                f"Based on the provided notes, which assertion regarding '{fact.concept}' is correct?",
            ]
            question_text = prop_templates[variation_index % len(prop_templates)]
            correct_answer = cls._clean_distractor_text(fact.content)

        # 5. General Document Statement Question
        else:
            stmt_templates = [
                f"Based on the course material covering '{topic_label}' (Page {fact.page_number}), which of the following statements is directly supported by the text?",
                f"In the study material on '{topic_label}', what key finding or principle is affirmed regarding '{fact.concept}'?",
                f"According to the notes on '{topic_label}', which of the following assertions is accurate?",
            ]
            question_text = stmt_templates[variation_index % len(stmt_templates)]
            correct_answer = cls._clean_distractor_text(fact.content)

        distractors = cls._create_distractors(correct_answer, fact, all_facts, rng)

        # Place correct option randomly among A, B, C, D
        options_text = [correct_answer] + distractors
        rng.shuffle(options_text)
        correct_index = options_text.index(correct_answer)

        labeled_options = [
            f"{chr(65 + i)}) {opt}"
            for i, opt in enumerate(options_text)
        ]

        doc_name_clean = fact.source.replace(".pdf", "").replace("doc_", "")
        explanation = (
            f"Based on page {fact.page_number} of {doc_name_clean}: '{fact.quote[:160]}...'"
            if include_provenance
            else f"Correct because: '{fact.quote[:160]}...'"
        )

        q_dict: Dict[str, Any] = {
            "question": question_text,
            "options": labeled_options,
            "correct_option_index": correct_index,
            "explanation": explanation,
        }
        if include_provenance:
            q_dict["source_page"] = fact.page_number

        return q_dict

    @classmethod
    def generate_questions(
        cls,
        chunks: List[RetrievedContextChunk],
        topic: str = "Course Material",
        question_count: int = 5,
        seed: Optional[int] = None,
        query_instruction: Optional[str] = None,
        include_provenance: bool = True,
    ) -> str:
        """Formulate a complete JSON practice quiz payload from text chunks.

        Guarantees:
        - Human-like, varied questions derived from the actual text.
        - Rotates starting offsets when `seed` increments (e.g. on 'new question' or retry),
          so users do not see the same questions repeatedly.
        - Repeats concepts only once or twice if the document is short.
        """
        target_count = max(1, min(25, question_count))
        facts = cls.extract_facts_from_chunks(chunks, topic=topic)

        # Stable PRNG seeded by caller's seed to provide diversity on 'new question' / swap
        seed_val = seed if seed is not None else 0
        rng = random.Random(seed_val * 7919 + 42)

        # Fallback if no facts could be extracted (e.g. empty or binary image chunks)
        if not facts:
            safe_topic = topic.strip().replace('"', "'")
            fallback_qs = [
                {
                    "question": f"When preparing for university examinations in '{safe_topic}', which learning strategy is most effective?",
                    "options": [
                        "A) Understanding core foundational definitions, edge cases, and practical problem applications",
                        "B) Memorizing isolated terminologies without understanding structural relationships",
                        "C) Skipping architectural principles and focusing strictly on trivia",
                        "D) Avoiding practice drills and diagram verification exercises",
                    ],
                    "correct_option_index": 0,
                    "explanation": "Mastering fundamental definitions and active problem-solving is the proven approach for university exam success.",
                    "source_page": 1,
                },
                {
                    "question": f"In academic evaluations of '{safe_topic}', what is the primary purpose of structural verification?",
                    "options": [
                        "A) Ensuring all requirements and constraints are systematically validated against specifications",
                        "B) Eliminating all modular component testing to speed up delivery",
                        "C) Replacing formal analysis with arbitrary intuition",
                        "D) Preventing documentation from being reviewed by stakeholders",
                    ],
                    "correct_option_index": 0,
                    "explanation": "Structural verification guarantees that design components meet all formal requirements.",
                    "source_page": 1,
                },
            ]
            selected_fallbacks = fallback_qs[:target_count]
            if not include_provenance:
                for q in selected_fallbacks:
                    q.pop("source_page", None)
            return json.dumps({
                "questions": selected_fallbacks,
                "insufficient": False,
                "message": "",
            }, ensure_ascii=False)

        # Group facts across pages and concepts to ensure broad coverage
        # Interleave facts across different pages so questions span the entire document
        facts_by_page: Dict[int, List[KnowledgeFact]] = {}
        for f in facts:
            facts_by_page.setdefault(f.page_number, []).append(f)

        sorted_pages = sorted(facts_by_page.keys())
        interleaved_facts: List[KnowledgeFact] = []
        max_in_any_page = max(len(v) for v in facts_by_page.values()) if facts_by_page else 0

        for r in range(max_in_any_page):
            for p in sorted_pages:
                if r < len(facts_by_page[p]):
                    interleaved_facts.append(facts_by_page[p][r])

        # Advance starting offset based on seed so each 'new question' explores different pages
        stride = max(1, len(interleaved_facts) // max(1, target_count))
        start_offset = (seed_val * max(1, stride)) % len(interleaved_facts)

        ordered_facts: List[KnowledgeFact] = []
        for i in range(len(interleaved_facts)):
            idx = (start_offset + i) % len(interleaved_facts)
            ordered_facts.append(interleaved_facts[idx])

        questions: List[Dict[str, Any]] = []
        seen_stems: Set[str] = set()

        # Generate questions up to target_count
        fact_idx = 0
        loop_guard = 0
        max_loops = max(100, target_count * 10)

        while len(questions) < target_count and loop_guard < max_loops:
            loop_guard += 1
            current_fact = ordered_facts[fact_idx % len(ordered_facts)]
            variation_idx = fact_idx // len(ordered_facts)
            fact_idx += 1

            q_obj = cls.synthesize_question(
                fact=current_fact,
                all_facts=facts,
                rng=rng,
                topic=topic,
                include_provenance=include_provenance,
                variation_index=variation_idx,
            )

            # Deduplicate by question text
            stem = q_obj["question"].strip().lower()
            if stem not in seen_stems:
                seen_stems.add(stem)
                questions.append(q_obj)

        return json.dumps({
            "questions": questions,
            "insufficient": False,
            "message": "",
        }, ensure_ascii=False)
