# CodeKnot — Test Report / Verification README

This file records the test suite names, use cases, expected behavior, and the actual result obtained
for the PDF-grounded quiz work. It was generated from the verbose pytest and Vitest runs.

## 1. Run summary

| Suite | Command | Tests | Got | Expected |
|---|---|---:|---|---|
| Backend (pytest) | `.venv\Scripts\python.exe -m pytest -v` | 249 | 249 passed, 0 failed | All pass |
| Frontend (Vitest) | `npm test -- --reporter=verbose` | 18 | 18 passed, 0 failed | All pass |
| Frontend build | `npm run build` | 1 | Passed | Passed |
| Frontend lint | `npm run lint` | 1 | Passed (existing warnings only) | Passed |
| **Total tests** | | **267** | **267 passed, 0 failed** | **All pass** |

> `Expected` for every individual test below means: the documented behavior in the use-case/expected
> column holds and the test completes without an assertion failure or exception. `Got` is the actual
> status captured from the verbose test run (all `PASSED`).

## 2. Database cleanup performed

| Item | Before | After |
|---|---:|---:|
| MySQL database | `exam_twin` (development) | `exam_twin` (development) |
| Tables | 12 | 12 (dropped and recreated) |
| Total rows | 7 | 0 |

Tables recreated: `ai_practice_records`, `assessment_records`, `document_chunks`, `document_pages`,
`documents`, `error_history`, `learning_measurement_records`, `registration_otps`, `students`,
`support_tickets`, `topic_mastery_states`, `tutor_chat_messages`.

Commands used:

```powershell
.venv\Scripts\python.exe -c "from src.database.schema import drop_tables, create_tables; drop_tables(); create_tables()"
```

## 3. Backend tests (249)

### tests/test_adaptive_intervention.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_priority_score_normalization_and_boundaries` | Priority score normalization and boundaries | Verify all component scores and final score are strictly bounded in [0.0, 1.0]. | PASSED |
| 2 | `test_priority_configurable_weights` | Priority configurable weights | Verify scorer respects custom weights and rejects invalid bounds. | PASSED |
| 3 | `test_priority_recency_decay` | Priority recency decay | Verify linear decay of recency score over the configured time window. | PASSED |
| 4 | `test_priority_recurrence_saturation` | Priority recurrence saturation | Verify recurrence score scales and saturates appropriately. | PASSED |
| 5 | `test_priority_difficulty_score` | Priority difficulty score | Verify empirical difficulty proxy derived only from verified assessment attempts. | PASSED |
| 6 | `test_priority_recent_success_reduces_score` | Priority recent success reduces score | Verify verified recent success appropriately lowers priority score. | PASSED |
| 7 | `test_deterministic_topic_ranking_and_tie_breaking` | Deterministic topic ranking and tie breaking | Verify deterministic multi-tier tie-breaking across topics. | PASSED |
| 8 | `test_strategy_selector_all_canonical_mappings[CONCEPTUAL_MISUNDERSTANDING-CONCEPT_EXPLANATION]` | Strategy selector all canonical mappings[CONCEPTUAL MISUNDERSTANDING-CONCEPT EXPLANATION] | Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy. | PASSED |
| 9 | `test_strategy_selector_all_canonical_mappings[RECALL_FAILURE-DEFINITION_RECALL]` | Strategy selector all canonical mappings[RECALL FAILURE-DEFINITION RECALL] | Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy. | PASSED |
| 10 | `test_strategy_selector_all_canonical_mappings[FORMULA_RULE_ERROR-FORMULA_REVISION]` | Strategy selector all canonical mappings[FORMULA RULE ERROR-FORMULA REVISION] | Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy. | PASSED |
| 11 | `test_strategy_selector_all_canonical_mappings[CALCULATION_EXECUTION_ERROR-CALCULATION_DRILL]` | Strategy selector all canonical mappings[CALCULATION EXECUTION ERROR-CALCULATION DRILL] | Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy. | PASSED |
| 12 | `test_strategy_selector_all_canonical_mappings[REASONING_LOGICAL_ERROR-STEP_BY_STEP_REASONING]` | Strategy selector all canonical mappings[REASONING LOGICAL ERROR-STEP BY STEP REASONING] | Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy. | PASSED |
| 13 | `test_strategy_selector_all_canonical_mappings[QUESTION_MISREADING-QUESTION_INTERPRETATION]` | Strategy selector all canonical mappings[QUESTION MISREADING-QUESTION INTERPRETATION] | Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy. | PASSED |
| 14 | `test_strategy_selector_all_canonical_mappings[PARTIAL_KNOWLEDGE-GUIDED_PRACTICE]` | Strategy selector all canonical mappings[PARTIAL KNOWLEDGE-GUIDED PRACTICE] | Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy. | PASSED |
| 15 | `test_strategy_selector_uncertain_diagnosis_handling` | Strategy selector uncertain diagnosis handling | Verify diagnoses requiring review return CLARIFICATION_REQUIRED. | PASSED |
| 16 | `test_strategy_selector_tied_categories_fallback` | Strategy selector tied categories fallback | Verify equal frequency across multiple categories falls back to MIXED_REVIEW. | PASSED |
| 17 | `test_strategy_selector_no_errors_defaults_to_guided_practice` | Strategy selector no errors defaults to guided practice | Verify unobserved topic or topic with zero errors defaults to GUIDED_PRACTICE. | PASSED |
| 18 | `test_service_cold_start_behavior` | Service cold start behavior | Verify a student with no prior history receives a transparent cold-start recommendation. | PASSED |
| 19 | `test_service_student_isolation` | Service student isolation | Verify student records are completely isolated and do not leak across recommendations. | PASSED |
| 20 | `test_service_read_only_guarantee` | Service read only guarantee | Verify recommendation generation does NOT alter Phase 6 history or mastery records. | PASSED |
| 21 | `test_service_invalid_student_id_handling` | Service invalid student id handling | Verify blank or invalid student identifiers raise InvalidStudentIdentifierError. | PASSED |
| 22 | `test_service_optional_rag_integration_and_fallback` | Service optional rag integration and fallback | Verify RAG content retrieval succeeds when available and falls back gracefully on failure. | PASSED |
| 23 | `test_pydantic_schema_serialization_and_validation` | Pydantic schema serialization and validation | Verify recommendation model validates constraints and serializes cleanly. | PASSED |

Subtotal: 23 tests, all passed.

### tests/test_api_auth_and_endpoints.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_health_check` | Health check | Verify GET /health returns 200 OK and system status. | PASSED |
| 2 | `test_root_endpoint` | Root endpoint | Verify GET / returns API welcome and docs link. | PASSED |
| 3 | `test_scrypt_password_hashing_and_verification` | Scrypt password hashing and verification | Verify scrypt hashing produces non-reversible salt-hash format. | PASSED |
| 4 | `test_registration_success` | Registration success | Verify successful student registration returns JWT bearer token. | PASSED |
| 5 | `test_registration_duplicate_username_fails` | Registration duplicate username fails | Verify registering an existing username returns 400 Bad Request. | PASSED |
| 6 | `test_registration_short_password_fails` | Registration short password fails | Verify registering with password &lt; 8 characters fails with 422. | PASSED |
| 7 | `test_login_success` | Login success | Verify valid login returns signed JWT bearer access token. | PASSED |
| 8 | `test_login_wrong_password_fails` | Login wrong password fails | Verify wrong password returns 401 Unauthorized. | PASSED |
| 9 | `test_login_nonexistent_user_fails` | Login nonexistent user fails | Verify login with unknown user returns 401 Unauthorized. | PASSED |
| 10 | `test_current_student_me_success` | Current student me success | Verify GET /api/v1/auth/me returns student profile for valid JWT token. | PASSED |
| 11 | `test_current_student_me_unauthenticated_fails` | Current student me unauthenticated fails | Verify GET /api/v1/auth/me without token returns 401 Unauthorized. | PASSED |
| 12 | `test_current_student_me_invalid_token_fails` | Current student me invalid token fails | Verify GET /api/v1/auth/me with corrupted token signature returns 401. | PASSED |
| 13 | `test_current_student_me_expired_token_fails` | Current student me expired token fails | Verify expired JWT token returns 401 Unauthorized. | PASSED |
| 14 | `test_upload_valid_pdf_stream` | Upload valid pdf stream | Verify uploading valid PDF binary via raw binary stream. | PASSED |
| 15 | `test_upload_empty_0_byte_pdf_fails` | Upload empty 0 byte pdf fails | Verify uploading 0-byte file returns 400 Bad Request. | PASSED |
| 16 | `test_upload_invalid_signature_pdf_fails` | Upload invalid signature pdf fails | Verify uploading file lacking %PDF- header returns 400 Bad Request. | PASSED |
| 17 | `test_upload_oversized_pdf_returns_413` | Upload oversized pdf returns 413 | Verify uploading file exceeding maximum allowed size returns 413 Payload Too Large. | PASSED |
| 18 | `test_list_and_get_document_details` | List and get document details | Verify listing documents returns ingested documents. | PASSED |
| 19 | `test_tutor_ask_qa_mode` | Tutor ask qa mode | Verify asking question in QA mode returns answer and citations list. | PASSED |
| 20 | `test_tutor_ask_hint_mode` | Tutor ask hint mode | Verify asking question in hint mode. | PASSED |
| 21 | `test_tutor_ask_practice_mode` | Tutor ask practice mode | Verify generating a practice question. | PASSED |
| 22 | `test_diagnose_error_endpoint` | Diagnose error endpoint | Verify automated ML error diagnosis persists and returns classified event. | PASSED |
| 23 | `test_learning_state_endpoint` | Learning state endpoint | Verify retrieving persistent Error DNA summary for authenticated student. | PASSED |
| 24 | `test_adaptive_interventions_endpoint` | Adaptive interventions endpoint | Verify generating prioritized adaptive intervention recommendation. | PASSED |
| 25 | `test_submit_assessment_success` | Submit assessment success | Verify submitting an assessment normalizes score (15/20 = 0.75). | PASSED |
| 26 | `test_submit_assessment_score_exceeding_max_rejected` | Submit assessment score exceeding max rejected | Verify score &gt; max_score is rejected with 422 Unprocessable Entity. | PASSED |
| 27 | `test_list_and_get_single_assessment` | List and get single assessment | Verify listing assessments and fetching single assessment by ID. | PASSED |
| 28 | `test_compute_learning_measurement_endpoint_success` | Compute learning measurement endpoint success | Verify paired pre- and post-tests compute normalized learning gain via API. | PASSED |
| 29 | `test_cross_student_data_isolation` | Cross student data isolation | Verify Student Bob cannot access Student Alice's assessments or compute gain on them. | PASSED |
| 30 | `test_openapi_schema_contains_all_16_api_endpoints` | Openapi schema contains all 16 api endpoints | Verify OpenAPI JSON schema specifies all 16 endpoints and Bearer security. | PASSED |
| 31 | `test_cors_preflight_headers` | Cors preflight headers | Verify CORS OPTIONS preflight response permits whitelisted React development origin. | PASSED |
| 32 | `test_negative_score_assessment_rejected_with_422` | Negative score assessment rejected with 422 | Verify negative assessment scores are rejected with 422 Unprocessable Entity. | PASSED |
| 33 | `test_unknown_document_id_returns_404` | Unknown document id returns 404 | Verify querying non-existent document ID returns 404 Not Found. | PASSED |

Subtotal: 33 tests, all passed.

### tests/test_chunker.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_chunk_generation_and_metadata_preservation` | Chunk generation and metadata preservation | Verify chunks preserve page provenance, source metadata, and valid structure. | PASSED |
| 2 | `test_sequential_chunk_indices` | Sequential chunk indices | Verify chunk_index is strictly monotonically increasing from 0. | PASSED |
| 3 | `test_configurable_chunk_size_and_overlap` | Configurable chunk size and overlap | Verify chunk size constraint is respected. | PASSED |
| 4 | `test_no_empty_chunks` | No empty chunks | Verify pages with empty or whitespace-only content generate no empty chunks. | PASSED |
| 5 | `test_chunker_validation_errors` | Chunker validation errors | Verify chunker rejects invalid chunk_size and chunk_overlap combinations. | PASSED |
| 6 | `test_chunk_model_dict_format` | Chunk model dict format | Verify chunk output dict matches expected ExamTwin RAG citation contract. | PASSED |

Subtotal: 6 tests, all passed.

### tests/test_database.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_database_manager_initialization` | Database manager initialization | Verify DatabaseManager initializes engine and session factory properly. | PASSED |
| 2 | `test_document_model_creation_and_fields` | Document model creation and fields | Verify Document model persists with required fields and defaults. | PASSED |
| 3 | `test_document_page_and_chunk_relationships_and_cascade` | Document page and chunk relationships and cascade | Verify Document -&gt; Pages -&gt; Chunks relationships and cascade deletion. | PASSED |
| 4 | `test_chunk_embedding_and_metadata_property_helpers` | Chunk embedding and metadata property helpers | Verify helper property getters and setters on DocumentChunk. | PASSED |
| 5 | `test_processing_status_and_access_level_enums` | Processing status and access level enums | Verify supported enum constants. | PASSED |

Subtotal: 5 tests, all passed.

### tests/test_database_integration.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_all_models_registered_on_metadata` | All models registered on metadata | Verify all 6 core tables across Phases 1-6 are registered on Base.metadata. | PASSED |
| 2 | `test_transaction_rollback_preserves_database_integrity` | Transaction rollback preserves database integrity | Verify that unhandled exceptions roll back all session changes safely. | PASSED |
| 3 | `test_student_scoped_queries_and_cascading` | Student scoped queries and cascading | Verify queries strictly isolate students and cascade deletes cleanly. | PASSED |
| 4 | `test_diagnosis_history_persistence_and_immutability` | Diagnosis history persistence and immutability | Verify immutable audit persistence of diagnosis records. | PASSED |
| 5 | `test_verified_assessment_mastery_updates` | Verified assessment mastery updates | Verify only verified assessment attempts update TopicMasteryState. | PASSED |
| 6 | `test_phase7_recommendation_does_not_modify_database_state` | Phase7 recommendation does not modify database state | Verify Phase 7 recommendation generation is strictly read-only on the database. | PASSED |

Subtotal: 6 tests, all passed.

### tests/test_dataset.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_dataset_files_exist` | Dataset files exist | Verify that train, validation, and test CSV files exist. | PASSED |
| 2 | `test_dataset_columns_and_non_empty` | Dataset columns and non empty | Verify each split has the exact required columns and no null entries. | PASSED |
| 3 | `test_dataset_error_type_validity_and_coverage` | Dataset error type validity and coverage | Verify all labels are valid taxonomy members and all 7 classes are covered. | PASSED |

Subtotal: 3 tests, all passed.

### tests/test_embedding_service.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_mock_embedding_service_initialization` | Mock embedding service initialization | Verify service initializes with custom and default dimensions. | PASSED |
| 2 | `test_embed_text_dimension_and_normalization` | Embed text dimension and normalization | Verify single text embedding produces unit-normalized float vector. | PASSED |
| 3 | `test_embed_texts_batch_processing` | Embed texts batch processing | Verify batch embedding preserves input ordering and lengths. | PASSED |
| 4 | `test_embed_empty_or_whitespace_raises` | Embed empty or whitespace raises | Verify appropriate errors are raised on blank text inputs. | PASSED |
| 5 | `test_embedding_determinism_and_semantic_separation` | Embedding determinism and semantic separation | Verify identical text produces identical vector, and related texts have higher similarity. | PASSED |
| 6 | `test_get_embedding_service_factory` | Get embedding service factory | Verify factory returns BaseEmbeddingService conforming instance. | PASSED |
| 7 | `test_gemini_embedding_service_requires_api_key` | Gemini embedding service requires api key | Verify Gemini service raises meaningful error when API key is missing. | PASSED |
| 8 | `test_gemini_embedding_service_batches_over_100_items` | Gemini embedding service batches over 100 items | Verify Gemini service splits batches of &gt;100 chunks into safe sub-batches. | PASSED |

Subtotal: 8 tests, all passed.

### tests/test_error_classifier.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_classifier_is_loaded_property` | Classifier is loaded property | Verify is_loaded reflects pipeline availability. | PASSED |
| 2 | `test_predict_error_valid_prediction` | Predict error valid prediction | Verify prediction output schema on typical student error. | PASSED |
| 3 | `test_predict_error_empty_student_answer` | Predict error empty student answer | Verify empty or whitespace student answer returns needs_review=True and None category. | PASSED |
| 4 | `test_predict_error_missing_optional_fields` | Predict error missing optional fields | Verify prediction functions when expected_answer and context are omitted. | PASSED |
| 5 | `test_predict_error_low_confidence_threshold_behavior` | Predict error low confidence threshold behavior | Verify that when top probability is below min_confidence, category is withheld. | PASSED |
| 6 | `test_predict_error_unloaded_model_raises` | Predict error unloaded model raises | Verify ModelNotLoadedError is raised when trying to predict with unloaded classifier. | PASSED |
| 7 | `test_diagnose_convenience_method` | Diagnose convenience method | Verify diagnose() returns a valid Pydantic DiagnosisResult. | PASSED |

Subtotal: 7 tests, all passed.

### tests/test_error_dataset.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_validate_dataset_valid_df` | Validate dataset valid df | Verify validation passes on clean conforming DataFrame. | PASSED |
| 2 | `test_validate_dataset_missing_column` | Validate dataset missing column | Verify error is raised when a required column is missing. | PASSED |
| 3 | `test_validate_dataset_missing_values` | Validate dataset missing values | Verify error is raised when required columns contain null entries. | PASSED |
| 4 | `test_validate_dataset_blank_text` | Validate dataset blank text | Verify error is raised when text entries are empty strings or whitespace. | PASSED |
| 5 | `test_validate_dataset_unknown_labels` | Validate dataset unknown labels | Verify error is raised when an unapproved error label is present. | PASSED |
| 6 | `test_validate_dataset_empty_df` | Validate dataset empty df | Verify error is raised on zero-row DataFrame unless allow_empty is set. | PASSED |
| 7 | `test_validate_dataset_none_raises` | Validate dataset none raises | Verify error is raised if DataFrame is None. | PASSED |
| 8 | `test_load_dataset_split_non_existent` | Load dataset split non existent | Verify FileNotFoundError is raised for non-existent split. | PASSED |
| 9 | `test_load_all_splits_loads_three_splits` | Load all splits loads three splits | Verify load_all_splits returns 3 valid DataFrames. | PASSED |
| 10 | `test_get_dataset_inspection_summary` | Get dataset inspection summary | Verify dataset summary aggregates all splits properly. | PASSED |

Subtotal: 10 tests, all passed.

### tests/test_error_evaluation.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_evaluate_predictions_perfect_case` | Evaluate predictions perfect case | Verify metrics calculation for perfect predictions. | PASSED |
| 2 | `test_evaluate_predictions_imperfect_case` | Evaluate predictions imperfect case | Verify metrics calculation for mismatched predictions. | PASSED |
| 3 | `test_evaluate_predictions_empty_raises` | Evaluate predictions empty raises | Verify error is raised when prediction list is empty. | PASSED |
| 4 | `test_evaluate_predictions_mismatched_lengths_raises` | Evaluate predictions mismatched lengths raises | Verify error is raised when true and pred lengths differ. | PASSED |
| 5 | `test_format_confusion_matrix_ascii` | Format confusion matrix ascii | Verify ASCII formatting utility returns non-empty structured text. | PASSED |
| 6 | `test_evaluate_model_on_splits` | Evaluate model on splits | Verify evaluate_model_on_splits runs across all 3 splits. | PASSED |

Subtotal: 6 tests, all passed.

### tests/test_error_training.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_build_feature_text` | Build feature text | Verify structured feature formatting with optional fields. | PASSED |
| 2 | `test_extract_features_no_target_or_reason_leakage` | Extract features no target or reason leakage | Verify strictly no target label or post-hoc explanation leakage into feature text. | PASSED |
| 3 | `test_train_model_produces_fitted_pipeline` | Train model produces fitted pipeline | Verify training returns a valid, fitted scikit-learn pipeline. | PASSED |
| 4 | `test_model_training_reproducibility` | Model training reproducibility | Verify that identical random_state generates identical model predictions. | PASSED |
| 5 | `test_save_and_load_model_artifacts` | Save and load model artifacts | Verify model pipeline and metadata roundtrip via joblib and JSON. | PASSED |

Subtotal: 5 tests, all passed.

### tests/test_gemini_service.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_mock_llm_successful_generation` | Mock llm successful generation | Verify MockLLMService returns configured default response. | PASSED |
| 2 | `test_mock_llm_custom_response_and_generator` | Mock llm custom response and generator | Verify custom default response and dynamic response generator function. | PASSED |
| 3 | `test_mock_llm_empty_response_handling` | Mock llm empty response handling | Verify MockLLMService raises LLMEmptyResponseError when return_empty=True. | PASSED |
| 4 | `test_mock_llm_api_error_handling` | Mock llm api error handling | Verify MockLLMService raises LLMAPIError when configured with error. | PASSED |
| 5 | `test_llm_empty_prompt_raises` | Llm empty prompt raises | Verify empty prompt raises LLMError. | PASSED |
| 6 | `test_gemini_service_requires_api_key` | Gemini service requires api key | Verify GeminiService raises LLMError if initialized without API key. | PASSED |
| 7 | `test_get_llm_service_factory` | Get llm service factory | Verify get_llm_service returns a valid BaseLLMService instance. | PASSED |

Subtotal: 7 tests, all passed.

### tests/test_learner_state.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_student_creation_and_fields` | Student creation and fields | Verify Student model persists with required fields and defaults. | PASSED |
| 2 | `test_unique_external_student_id_constraint` | Unique external student id constraint | Verify attempting to create duplicate external_student_id raises IntegrityError. | PASSED |
| 3 | `test_student_cascade_deletion` | Student cascade deletion | Verify deleting a student cascades deletion to error history and topic masteries. | PASSED |
| 4 | `test_duplicate_topic_state_constraint` | Duplicate topic state constraint | Verify unique constraint on (student_id, topic) prevents duplicates. | PASSED |
| 5 | `test_diagnose_and_record_valid_flow` | Diagnose and record valid flow | Verify diagnose_and_record persists diagnosis and preserves Phase 5 metadata. | PASSED |
| 6 | `test_diagnose_and_record_low_confidence_marks_review` | Diagnose and record low confidence marks review | Verify low-confidence predictions are flagged as needs_review=True. | PASSED |
| 7 | `test_invalid_student_id_raises_error` | Invalid student id raises error | Verify empty or whitespace student identifier raises InvalidStudentIdentifierError. | PASSED |
| 8 | `test_diagnose_does_not_mutate_topic_mastery` | Diagnose does not mutate topic mastery | Verify academic requirement: predicted error does NOT automatically alter topic mastery. | PASSED |
| 9 | `test_verify_diagnosis_record_audit` | Verify diagnosis record audit | Verify educator or ground truth review can verify a diagnosis event. | PASSED |
| 10 | `test_mastery_no_attempts_behavior` | Mastery no attempts behavior | Verify zero attempts produces 0.0 mastery score. | PASSED |
| 11 | `test_mastery_formula_sample_size_credentialing` | Mastery formula sample size credentialing | Verify credential factor scales with sample size while bounding between 0 and 1. | PASSED |
| 12 | `test_record_verified_assessment_updates_state` | Record verified assessment updates state | Verify recording verified attempts properly updates attempt counts and mastery score. | PASSED |
| 13 | `test_error_dna_summary_empty_history` | Error dna summary empty history | Verify Error DNA summary for student with no recorded history. | PASSED |
| 14 | `test_error_dna_recurring_errors_and_affected_topics` | Error dna recurring errors and affected topics | Verify error counts, recurring category percentages, and affected topics. | PASSED |
| 15 | `test_error_dna_student_isolation` | Error dna student isolation | Verify Student A's diagnoses are completely isolated from Student B. | PASSED |
| 16 | `test_error_dna_forgetting_and_revision_recommendations` | Error dna forgetting and revision recommendations | Verify elapsed days and high error rate trigger revision recommendations. | PASSED |

Subtotal: 16 tests, all passed.

### tests/test_learning_measurement.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_valid_assessment_creation_and_score_normalization` | Valid assessment creation and score normalization | Verify normal assessment creation and correct normalized score calculation (16/20 = 0.8). | PASSED |
| 2 | `test_score_normalization_formula[0.0-100.0-0.0]` | Score normalization formula[0.0-100.0-0.0] | Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]. | PASSED |
| 3 | `test_score_normalization_formula[25.0-100.0-0.25]` | Score normalization formula[25.0-100.0-0.25] | Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]. | PASSED |
| 4 | `test_score_normalization_formula[50.0-100.0-0.5]` | Score normalization formula[50.0-100.0-0.5] | Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]. | PASSED |
| 5 | `test_score_normalization_formula[75.0-100.0-0.75]` | Score normalization formula[75.0-100.0-0.75] | Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]. | PASSED |
| 6 | `test_score_normalization_formula[100.0-100.0-1.0]` | Score normalization formula[100.0-100.0-1.0] | Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]. | PASSED |
| 7 | `test_score_normalization_formula[7.5-10.0-0.75]` | Score normalization formula[7.5-10.0-0.75] | Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]. | PASSED |
| 8 | `test_score_normalization_formula[35.0-50.0-0.7]` | Score normalization formula[35.0-50.0-0.7] | Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]. | PASSED |
| 9 | `test_negative_score_rejection` | Negative score rejection | Verify reject negative obtained scores with AssessmentValidationError. | PASSED |
| 10 | `test_invalid_maximum_score_rejection` | Invalid maximum score rejection | Verify reject zero or negative maximum scores with AssessmentValidationError. | PASSED |
| 11 | `test_score_exceeding_maximum_rejection` | Score exceeding maximum rejection | Verify reject obtained score exceeding maximum possible score. | PASSED |
| 12 | `test_missing_or_blank_evidence_rejection` | Missing or blank evidence rejection | Verify reject empty or whitespace-only evidence strings. | PASSED |
| 13 | `test_blank_student_id_rejection` | Blank student id rejection | Verify reject empty or whitespace student identifiers. | PASSED |
| 14 | `test_positive_normalized_learning_gain` | Positive normalized learning gain | Verify positive gain: pre=0.40, post=0.70 =&gt; g = (0.70 - 0.40)/(1 - 0.40) = 0.50 (+50%). | PASSED |
| 15 | `test_zero_normalized_learning_gain` | Zero normalized learning gain | Verify zero gain: pre=0.50, post=0.50 =&gt; g = 0.0. | PASSED |
| 16 | `test_negative_normalized_learning_gain` | Negative normalized learning gain | Verify negative gain: pre=0.80, post=0.50 =&gt; g = (0.50 - 0.80)/(1 - 0.80) = -1.50 (-150%). | PASSED |
| 17 | `test_perfect_pretest_handling_avoids_division_by_zero` | Perfect pretest handling avoids division by zero | Verify perfect pre-test (1.0) returns None for normalized_gain without division by zero. | PASSED |
| 18 | `test_different_maximum_scores_comparability` | Different maximum scores comparability | Verify normalization enables comparison across different max_scores (pre: 6/10=0.6, post: 40/50=0.8). | PASSED |
| 19 | `test_incompatible_learning_objectives_rejected` | Incompatible learning objectives rejected | Verify reject comparison when pre- and post-tests evaluate different learning objectives. | PASSED |
| 20 | `test_incompatible_topics_rejected` | Incompatible topics rejected | Verify reject comparison when assessments evaluate different topics. | PASSED |
| 21 | `test_duplicate_assessment_rejected` | Duplicate assessment rejected | Verify reject comparing an assessment with itself. | PASSED |
| 22 | `test_chronological_timestamp_inconsistency_rejected` | Chronological timestamp inconsistency rejected | Verify reject if post-assessment timestamp is earlier than pre-assessment. | PASSED |
| 23 | `test_unverified_assessment_evidence_rejected` | Unverified assessment evidence rejected | Verify reject unverified assessment evidence when require_verified=True. | PASSED |
| 24 | `test_missing_assessment_record_raises_not_found` | Missing assessment record raises not found | Verify missing assessment IDs raise AssessmentNotFoundError. | PASSED |
| 25 | `test_authorization_rejects_identity_mismatch_on_record` | Authorization rejects identity mismatch on record | Verify student Alice cannot record an assessment under Student Bob's identity. | PASSED |
| 26 | `test_cross_learner_measurement_attempt_rejected` | Cross learner measurement attempt rejected | Verify reject computing learning gain between Student Alice's pre-test and Student Bob's post-test. | PASSED |
| 27 | `test_get_student_assessments_and_measurements_strictly_isolated` | Get student assessments and measurements strictly isolated | Verify Student Alice cannot retrieve or leak Student Bob's assessment history. | PASSED |
| 28 | `test_verified_post_test_updates_topic_mastery` | Verified post test updates topic mastery | Verify verified post-assessment achievement updates TopicMasteryState for the student. | PASSED |
| 29 | `test_intervention_linkage_preservation` | Intervention linkage preservation | Verify intervention recommendation identifier is preserved in measurement audit record. | PASSED |
| 30 | `test_full_learning_measurement_lifecycle` | Full learning measurement lifecycle | Verify exercise full learner cycle: 1. Student exhibits misconception in 'Tree Traversal' (Phase 5 classifier). 2. Diagnosis is persisted and Error DNA is aggregated (Phase 6). 3. Adaptive Intervention engine recommends CONCEPT_EXPLANATION (Phase 7). 4. Pre-test records baseline knowledge score of 30% (Phase 8). 5. Student undergoes intervention and completes post-test scoring 80% (Phase 8). 6. Normalized learning gain is calculated: +71.4% gain (Phase 8). 7. Verified mastery updates persistent student state (Phase 6/8). | PASSED |

Subtotal: 30 tests, all passed.

### tests/test_pdf_loader.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_pdf_extraction_page_by_page` | Pdf extraction page by page | Verify that text is extracted page by page with full text retention. | PASSED |
| 2 | `test_page_number_preservation` | Page number preservation | Verify that page numbers are 1-indexed and correctly sequential. | PASSED |
| 3 | `test_document_id_preservation` | Document id preservation | Verify default derivation of document_id and explicit override. | PASSED |
| 4 | `test_empty_page_handling` | Empty page handling | Verify empty/blank pages are handled gracefully without losing page numbering. | PASSED |
| 5 | `test_file_not_found_raises` | File not found raises | Verify FileNotFoundError is raised for non-existent paths. | PASSED |
| 6 | `test_non_pdf_file_raises` | Non pdf file raises | Verify ValueError is raised if target file does not have .pdf extension. | PASSED |
| 7 | `test_empty_zero_byte_file_raises` | Empty zero byte file raises | Verify PDFEmptyFileError (and PDFLoadingError) is raised when file is zero bytes. | PASSED |
| 8 | `test_invalid_pdf_signature_raises` | Invalid pdf signature raises | Verify InvalidPDFSignatureError is raised when file lacks %PDF- magic bytes. | PASSED |
| 9 | `test_oversized_pdf_raises_size_limit_exceeded` | Oversized pdf raises size limit exceeded | Verify PDFSizeLimitExceededError is raised when file exceeds max_file_size_bytes. | PASSED |
| 10 | `test_corrupt_pdf_file_raises` | Corrupt pdf file raises | Verify PDFLoadingError is raised for unreadable corrupt PDF streams with valid magic bytes. | PASSED |
| 11 | `test_extracted_page_to_dict` | Extracted page to dict | Verify page model serialization to dict matching expected RAG contract. | PASSED |
| 12 | `test_pdf_metadata_access_failure_raises_pdf_loading_error` | Pdf metadata access failure raises pdf loading error | Verify PDFLoadingError is raised cleanly when file metadata access or stat fails. | PASSED |

Subtotal: 12 tests, all passed.

### tests/test_phase5_7_e2e_workflow.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_complete_phase5_to_7_end_to_end_workflow` | Complete phase5 to 7 end to end workflow | Verify execute end-to-end integration: raw answers -&gt; ML diagnosis -&gt; learner state -&gt; Error DNA -&gt; adaptive recommendation. | PASSED |

Subtotal: 1 tests, all passed.

### tests/test_production_mock_isolation.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_production_disallows_mock_embedding_service` | Production disallows mock embedding service | Verify production environment rejects explicit mock embedding requests. | PASSED |
| 2 | `test_production_requires_gemini_api_key_for_embeddings` | Production requires gemini api key for embeddings | Verify production environment raises error if GEMINI_API_KEY is missing. | PASSED |
| 3 | `test_production_disallows_mock_llm_service` | Production disallows mock llm service | Verify production environment rejects explicit mock LLM requests. | PASSED |
| 4 | `test_production_requires_gemini_api_key_for_llm` | Production requires gemini api key for llm | Verify production environment raises error if GEMINI_API_KEY is missing for LLM. | PASSED |
| 5 | `test_production_disallows_mock_rag_service` | Production disallows mock rag service | Verify production environment rejects mock LLM or mock embedding in RAG factory. | PASSED |
| 6 | `test_production_disables_silent_fallback_in_gemini_services` | Production disables silent fallback in gemini services | Verify GeminiService and GeminiEmbeddingService disable fallback to mock in production. | PASSED |
| 7 | `test_non_production_permits_mock_for_test_fixtures` | Non production permits mock for test fixtures | Verify non-production environments retain mock service access for automated testing. | PASSED |

Subtotal: 7 tests, all passed.

### tests/test_prompt_builder.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_build_context_block_formatting` | Build context block formatting | Verify context block formats source identity, page number, and content cleanly. | PASSED |
| 2 | `test_build_context_block_empty` | Build context block empty | Verify context block handles empty chunk list safely. | PASSED |
| 3 | `test_build_context_block_respects_char_budget` | Build context block respects char budget | Verify context block respects max_context_chars budget. | PASSED |
| 4 | `test_build_grounded_qa_prompt_structure_and_instructions` | Build grounded qa prompt structure and instructions | Verify full prompt structure, section demarcations, and grounding rules. | PASSED |
| 5 | `test_convenience_function_build_grounded_prompt` | Convenience function build grounded prompt | Verify functional wrapper build_grounded_prompt works identically. | PASSED |
| 6 | `test_educational_prompt_builders` | Educational prompt builders | Verify hint prompt and practice question prompt builders. | PASSED |

Subtotal: 6 tests, all passed.

### tests/test_rag_service.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_answer_question_end_to_end_grounding` | Answer question end to end grounding | Verify end-to-end grounded Q&A flow with citations and LLM prompt construction. | PASSED |
| 2 | `test_answer_question_no_result_handling` | Answer question no result handling | Verify controlled response when no matching chunks exist (LLM is not called). | PASSED |
| 3 | `test_answer_question_security_isolation` | Answer question security isolation | Verify with the global database disabled, Bob cannot query Alice's private OS document. | PASSED |
| 4 | `test_generate_hint_and_practice_question` | Generate hint and practice question | Verify educational hint and practice question workflows. | PASSED |
| 5 | `test_rag_service_empty_question_raises` | Rag service empty question raises | Verify empty question raises ValueError. | PASSED |

Subtotal: 5 tests, all passed.

### tests/test_rag_source_priority.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_students_own_pdf_is_searched_first_with_citations` | Students own pdf is searched first with citations | Verify own PDF wins over another user's PDF and keeps normal page citations. | PASSED |
| 2 | `test_global_pdf_answer_hides_all_source_details` | Global pdf answer hides all source details | Verify other users' PDFs may answer, but no filename, page or similarity may be exposed. | PASSED |
| 3 | `test_global_practice_drill_has_no_source_page` | Global practice drill has no source page | Verify a PDF-grounded drill served from the global pool never carries source_page. | PASSED |
| 4 | `test_no_pdf_drill_stays_interactive_and_is_marked_ai_practice` | No pdf drill stays interactive and is marked ai practice | Verify with no PDF anywhere the drill is still a valid interactive quiz, labelled AI practice. | PASSED |
| 5 | `test_global_search_can_be_disabled_for_strict_isolation` | Global search can be disabled for strict isolation | Test assertions complete successfully with no error. | PASSED |
| 6 | `test_ai_practice_record_is_persisted` | Ai practice record is persisted | Verify no-PDF practice is recorded in the database for later reporting. | PASSED |

Subtotal: 6 tests, all passed.

### tests/test_retriever.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_retrieve_successful_ranking_and_metadata` | Retrieve successful ranking and metadata | Verify retrieval returns ranked results with correct metadata and citation info. | PASSED |
| 2 | `test_retrieve_user_access_isolation` | Retrieve user access isolation | Verify user Alice cannot retrieve user Bob's private algorithms document. | PASSED |
| 3 | `test_retrieve_document_id_filtering` | Retrieve document id filtering | Verify explicit document_ids restrict search scope. | PASSED |
| 4 | `test_retrieve_empty_question_raises` | Retrieve empty question raises | Verify empty or whitespace query raises RetrieverError. | PASSED |
| 5 | `test_retrieve_invalid_top_k_raises` | Retrieve invalid top k raises | Verify invalid top_k raises RetrieverError. | PASSED |
| 6 | `test_retrieve_high_similarity_threshold_filters_out` | Retrieve high similarity threshold filters out | Verify setting high min_similarity filters out loosely matching chunks. | PASSED |

Subtotal: 6 tests, all passed.

### tests/test_settings.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_settings_default_instantiation` | Settings default instantiation | Verify settings loads with valid defaults. | PASSED |
| 2 | `test_settings_path_resolution` | Settings path resolution | Verify path helper properties point to valid project directories. | PASSED |
| 3 | `test_adaptive_weights_within_bounds` | Adaptive weights within bounds | Verify adaptive scoring weights are non-negative and properly initialized. | PASSED |
| 4 | `test_get_settings_caching` | Get settings caching | Verify get_settings returns the cached singleton. | PASSED |
| 5 | `test_pdf_upload_security_settings` | Pdf upload security settings | Verify PDF security defaults: 25 MB max size and signature validation enabled. | PASSED |

Subtotal: 5 tests, all passed.

### tests/test_student_authorization.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_enforce_student_authorization_accepts_valid_matching_principal` | Enforce student authorization accepts valid matching principal | Verify when request ID matches authenticated principal, it is accepted. | PASSED |
| 2 | `test_enforce_student_authorization_allows_none_principal_for_internal_service` | Enforce student authorization allows none principal for internal service | Verify when authenticated_student_id is None, internal service calls succeed. | PASSED |
| 3 | `test_enforce_student_authorization_rejects_identity_mismatch` | Enforce student authorization rejects identity mismatch | Verify when request parameter attempts to target another student, raise UnauthorizedStudentAccessError. | PASSED |
| 4 | `test_register_or_get_student_rejects_unauthorized_override` | Register or get student rejects unauthorized override | Verify student Alice cannot register or access Student Bob's profile. | PASSED |
| 5 | `test_diagnose_and_record_rejects_unauthorized_override` | Diagnose and record rejects unauthorized override | Verify student Alice cannot submit a diagnosis under Student Bob's identity. | PASSED |
| 6 | `test_record_verified_assessment_rejects_unauthorized_override` | Record verified assessment rejects unauthorized override | Verify student Alice cannot record an assessment attempt for Student Bob. | PASSED |
| 7 | `test_get_error_dna_summary_rejects_unauthorized_override` | Get error dna summary rejects unauthorized override | Verify student Alice cannot read Student Bob's Error DNA summary. | PASSED |
| 8 | `test_get_student_history_rejects_unauthorized_override` | Get student history rejects unauthorized override | Verify student Alice cannot inspect Student Bob's diagnosis history. | PASSED |
| 9 | `test_adaptive_intervention_rejects_unauthorized_override` | Adaptive intervention rejects unauthorized override | Verify student Alice cannot request an intervention recommendation for Student Bob. | PASSED |
| 10 | `test_blank_or_invalid_student_id_rejected` | Blank or invalid student id rejected | Verify blank or whitespace student IDs must raise InvalidStudentIdentifierError. | PASSED |
| 11 | `test_students_cannot_read_or_leak_each_others_data` | Students cannot read or leak each others data | Verify complete isolation between Student A and Student B. | PASSED |
| 12 | `test_session_rollback_on_database_error` | Session rollback on database error | Verify that an exception inside a session rolls back uncommitted changes. | PASSED |

Subtotal: 12 tests, all passed.

### tests/test_support_endpoints.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_create_and_list_support_tickets` | Create and list support tickets | Test assertions complete successfully with no error. | PASSED |

Subtotal: 1 tests, all passed.

### tests/test_taxonomy.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_canonical_error_types_exist` | Canonical error types exist | Verify that all 7 required error taxonomy categories are present. | PASSED |
| 2 | `test_all_categories_have_descriptions_and_interventions` | All categories have descriptions and interventions | Verify every error type has an associated documentation string and remediation plan. | PASSED |
| 3 | `test_diagnosis_result_valid_instantiation` | Diagnosis result valid instantiation | Verify DiagnosisResult validates correctly with typical diagnostic payload. | PASSED |
| 4 | `test_diagnosis_result_correct_answer` | Diagnosis result correct answer | Verify DiagnosisResult handles non-error/correct states gracefully. | PASSED |
| 5 | `test_diagnosis_result_confidence_bounds` | Diagnosis result confidence bounds | Verify confidence must be bounded in [0.0, 1.0]. | PASSED |
| 6 | `test_diagnosis_result_serialization` | Diagnosis result serialization | Verify DiagnosisResult serializes to and from dict/JSON cleanly. | PASSED |

Subtotal: 6 tests, all passed.

### tests/test_text_cleaner.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_normalize_line_breaks` | Normalize line breaks | Verify that CRLF ( ) and legacy CR ( ) are converted to standard LF ( ). | PASSED |
| 2 | `test_dehyphenate_line_breaks` | Dehyphenate line breaks | Verify that split words are reconstructed while mathematical subtractions remain intact. | PASSED |
| 3 | `test_normalize_whitespace` | Normalize whitespace | Verify tabs, irregular spaces, and multi-spaces within lines are collapsed cleanly. | PASSED |
| 4 | `test_remove_excessive_blank_lines` | Remove excessive blank lines | Verify sequences of 3+ consecutive newlines are clamped to standard double newlines. | PASSED |
| 5 | `test_remove_standalone_page_markers` | Remove standalone page markers | Verify standalone headers and footers matching page formats are stripped. | PASSED |
| 6 | `test_preserve_mathematical_content` | Preserve mathematical content | Verify formulas, complex notations, and Big-O expressions are strictly preserved. | PASSED |
| 7 | `test_clean_text_full_pipeline` | Clean text full pipeline | Verify the integrated clean_text pipeline produces clean, well-formatted text. | PASSED |

Subtotal: 7 tests, all passed.

### tests/test_tutor_websocket.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_tutor_chat_history_lifecycle` | Tutor chat history lifecycle | Test getting and clearing chat history via HTTP. | PASSED |
| 2 | `test_practice_drills_stay_out_of_tutor_chat` | Practice drills stay out of tutor chat | Verify practice MCQs must never appear in tutor chat history; no-PDF practice is logged instead. | PASSED |
| 3 | `test_tutor_websocket_connection_and_interaction` | Tutor websocket connection and interaction | Test WebSocket connection, history reception, and ping/pong. | PASSED |

Subtotal: 3 tests, all passed.

### tests/test_vector_store.py

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `test_cosine_similarity_computation` | Cosine similarity computation | Verify mathematical properties of cosine similarity calculation. | PASSED |
| 2 | `test_add_and_retrieve_document_chunks` | Add and retrieve document chunks | Verify adding chunks and fetching them by document ID. | PASSED |
| 3 | `test_delete_document` | Delete document | Verify document deletion removes all associated chunks. | PASSED |
| 4 | `test_similarity_search_and_top_k` | Similarity search and top k | Verify similarity search ranks the most semantically relevant chunk highest. | PASSED |
| 5 | `test_user_ownership_and_security_boundaries` | User ownership and security boundaries | Verify security isolation: User A cannot retrieve User B's PRIVATE document. | PASSED |
| 6 | `test_document_id_filtering` | Document id filtering | Verify document_ids parameter restricts search to designated documents. | PASSED |
| 7 | `test_end_to_end_pipeline_integration` | End to end pipeline integration | Verify end-to-end flow: synthetic PDF -&gt; pipeline -&gt; MySQL/SQLite vector store -&gt; search. | PASSED |

Subtotal: 7 tests, all passed.

## 4. Frontend tests (18)

### src/tests/App.test.tsx

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `renders marketing landing page at root URL with exact brand and heading` | CodeKnot Frontend Application | Renders marketing landing page at root URL with exact brand and heading | PASSED |
| 2 | `renders interactive hero preview with grounded learning example` | CodeKnot Frontend Application | Renders interactive hero preview with grounded learning example | PASSED |

Subtotal: 2 tests, all passed.

### src/tests/api_client.test.ts

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `manages auth token in memory and sessionStorage` | API Client & Token Management | Manages auth token in memory and sessionStorage | PASSED |
| 2 | `injects Bearer token into outgoing authenticated requests` | API Client & Token Management | Injects Bearer token into outgoing authenticated requests | PASSED |
| 3 | `automatically clears token on 401 Unauthorized response` | API Client & Token Management | Automatically clears token on 401 Unauthorized response | PASSED |
| 4 | `correctly maps HTTP base URL to WebSocket URL` | API Client & Token Management | Correctly maps HTTP base URL to WebSocket URL | PASSED |
| 5 | `fetches chat history via api.tutor.getHistory` | API Client & Token Management | Fetches chat history via api.tutor.getHistory | PASSED |

Subtotal: 5 tests, all passed.

### src/tests/assessment_flow.test.ts

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `returns null when there are no assessments` | findUnpairedBaseline | Returns null when there are no assessments | PASSED |
| 2 | `picks the most recent compatible baseline` | findUnpairedBaseline | Picks the most recent compatible baseline | PASSED |
| 3 | `treats FORMATIVE assessments as valid baselines` | findUnpairedBaseline | Treats FORMATIVE assessments as valid baselines | PASSED |
| 4 | `excludes assessments already used as either side of a measurement` | findUnpairedBaseline | Excludes assessments already used as either side of a measurement | PASSED |
| 5 | `ignores assessments from other topics, objectives, and retests` | findUnpairedBaseline | Ignores assessments from other topics, objectives, and retests | PASSED |

Subtotal: 5 tests, all passed.

### src/tests/auth_and_empty_states.test.tsx

| # | Test name | Use case / scenario | Expected | Got |
|---:|---|---|---|---|
| 1 | `verifies SignInPage fields start completely empty with proper placeholders` | PHASE 2: Authentication Form Field Verification | SignInPage fields start completely empty with proper placeholders | PASSED |
| 2 | `verifies SignUpPage fields start completely empty with proper placeholders` | PHASE 2: Authentication Form Field Verification | SignUpPage fields start completely empty with proper placeholders | PASSED |
| 3 | `verifies DashboardPage renders 0 counts and onboarding state when user has no records` | PHASE 3 & 9: Real Empty States for Zero-Record State | DashboardPage renders 0 counts and onboarding state when user has no records | PASSED |
| 4 | `verifies StudyMaterialsPage renders clean empty state when no documents exist` | PHASE 3 & 9: Real Empty States for Zero-Record State | StudyMaterialsPage renders clean empty state when no documents exist | PASSED |
| 5 | `verifies AssessmentHistoryPage renders clean empty state when no tests exist` | PHASE 3 & 9: Real Empty States for Zero-Record State | AssessmentHistoryPage renders clean empty state when no tests exist | PASSED |
| 6 | `verifies ErrorDNAPage renders 0 evaluated and clean empty state when no diagnoses exist` | PHASE 3 & 9: Real Empty States for Zero-Record State | ErrorDNAPage renders 0 evaluated and clean empty state when no diagnoses exist | PASSED |

Subtotal: 6 tests, all passed.

## 5. Manual scenarios (not executed in this report)

The automated suites above do not drive the browser end-to-end. The following manual cases were
documented for verification; their in-app results were **not** captured in this run.

| Scenario | Expected | Status |
|---|---|---|
| Own PDF priority | Specific PDF selected → From Course Material badge, page tags may appear | Not executed |
| Anonymous shared PDF fallback | Auto source, no matching own PDF → Shared Course Data badge, no filename/page/uploader/similarity | Not executed |
| Explicit PDF hard boundary | Specific PDF without topic → not enough matching course material, no global widening | Not executed |
| No-PDF Gemini practice | Auto source, no PDF anywhere → AI Practice badge and entry in AI Practice Log | Not executed |
| Tutor chat isolation | No Practice Drill tab; legacy drill JSON hidden with a plain notice; Focus Mode clean | Not executed |

## 6. Environment

- Backend: `http://localhost:8000` (`/health` → 200 OK)
- Frontend: `http://localhost:3000` (Vite is configured on port 3000)
- Branch: `development`; commits `aa7d34c`, `d0cad7e`

