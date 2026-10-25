// ==========================================
// ExamTwin Frontend API Types
// Contract-aligned with FastAPI backend schemas
// ==========================================

// ==========================================
// Authentication
// ==========================================
export interface StudentRegisterPayload {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}

export interface StudentLoginPayload {
  username: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  student_id: string;
  expires_in_minutes: number;
}

export interface StudentProfile {
  id: string;
  external_student_id: string;
  email?: string;
  full_name?: string;
  is_active: boolean;
  total_diagnoses_count: number;
  topics_tracked_count: number;
  created_at?: string;
}

// ==========================================
// Documents & Study Materials
// ==========================================
export interface DocumentListItem {
  id: string;
  title: string;
  access_level: 'PRIVATE' | 'COURSE_SHARED';
  pages_count: number;
  chunks_count: number;
  created_at?: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  pages_count: number;
  chunks_count: number;
  status: string;
  message: string;
}

// ==========================================
// AI Tutor
// ==========================================
export type TutorMode = 'qa' | 'hint' | 'practice';

export interface TutorAskPayload {
  question: string;
  document_ids?: string[];
  topic?: string;
  mode?: TutorMode;
}

export interface SourceCitation {
  source_path: string;
  document_id: string;
  page_number: number;
  similarity_score: number;
  snippet: string;
}

export interface TutorAskResponse {
  question: string;
  answer: string;
  mode: TutorMode;
  citations: SourceCitation[];
  grounded: boolean;
}

// ==========================================
// Diagnostics & Error DNA
// ==========================================
export interface DiagnosisPayload {
  question: string;
  student_answer: string;
  expected_answer?: string;
  topic?: string;
  context?: string;
}

export interface DiagnosisResponse {
  id: string;
  student_id: string;
  topic: string;
  error_category?: string;
  confidence_score: number;
  needs_review: boolean;
  is_verified: boolean;
  model_version: string;
  created_at?: string;
}

export interface RecurringError {
  category: string;
  count: number;
  percentage: number;
}

export interface TopicMastery {
  topic: string;
  attempts_count: number;
  correct_attempts: number;
  incorrect_attempts: number;
  mastery_score: number;
}

export interface ErrorDNASummary {
  student_id: string;
  total_diagnoses: number;
  review_required_count: number;
  confirmed_diagnoses_count: number;
  recurring_errors: RecurringError[];
  most_affected_topics: { topic: string; count: number; primary_error_category?: string }[];
  temporal_trend: {
    recent_window_days: number;
    recent_diagnoses_count: number;
    historical_diagnoses_count: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
  topic_masteries: TopicMastery[];
  revision_recommendations: { topic: string; days_since_last_attempt: number; reason: string }[];
}

export interface InterventionRecommendation {
  student_id: string;
  selected_topic: string;
  priority_score: number;
  selected_strategy: string;
  strategy_rationale: string;
  student_explanation: string;
  grounded_content?: string | null;
  is_uncertain: boolean;
  review_required: boolean;
  is_cold_start: boolean;
}

// ==========================================
// Assessments & Quizzes
// ==========================================
export type AssessmentType = 'PRE_INTERVENTION' | 'POST_INTERVENTION' | 'FORMATIVE' | 'SUMMATIVE';

export interface AssessmentSubmissionPayload {
  topic: string;
  learning_objective_id: string;
  assessment_type?: AssessmentType;
  obtained_score: number;
  max_score: number;
  evidence: string;
  intervention_id?: string;
}

export interface AssessmentResponse {
  id: string;
  student_id: string;
  topic: string;
  learning_objective_id: string;
  assessment_type: AssessmentType;
  obtained_score: number;
  max_score: number;
  normalized_score: number;
  verification_status: 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
  evidence: string;
  intervention_id?: string;
  timestamp?: string;
}

// ==========================================
// Learning Measurements
// ==========================================
export interface MeasurementPayload {
  pre_assessment_id: string;
  post_assessment_id: string;
  intervention_id?: string;
  require_verified?: boolean;
  update_topic_mastery?: boolean;
  notes?: string;
}

export interface MeasurementResponse {
  measurement_id: string;
  student_id: string;
  topic: string;
  learning_objective_id: string;
  pre_assessment_id: string;
  post_assessment_id: string;
  intervention_id?: string;
  pre_normalized_score: number;
  post_normalized_score: number;
  normalized_gain: number | null;
  absolute_gain: number;
  gain_classification: 'POSITIVE' | 'ZERO' | 'NEGATIVE' | 'PERFECT_PRETEST' | 'UNAVAILABLE';
  is_verified: boolean;
  summary_explanation: string;
  measured_at?: string;
}

// ==========================================
// Error Problem Detail
// ==========================================
export interface ApiErrorResponse {
  detail: string | Array<{ loc: (string | number)[]; msg: string; type: string }>;
  error_type?: string;
}
