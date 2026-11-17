import { api } from '../api/client'
import type {
  AssessmentResponse,
  AssessmentSubmissionPayload,
  AssessmentType,
  MeasurementResponse,
} from '../types/api'

/**
 * Assessment types that can act as a valid "before" baseline for a retest.
 * FORMATIVE is included because early quiz submissions were recorded with it.
 */
const BASELINE_TYPES: AssessmentType[] = ['PRE_INTERVENTION', 'FORMATIVE']

export interface QuizProgressResult {
  assessment: AssessmentResponse
  measurement: MeasurementResponse | null
  phase: 'baseline' | 'retest'
  measurementError: string | null
}

/**
 * Pick the most recent compatible assessment that has not already been paired
 * into a learning measurement. Both assessments must share the same topic and
 * learning objective for the backend comparability rules to accept the pair.
 */
export function findUnpairedBaseline(
  assessments: AssessmentResponse[],
  measurements: MeasurementResponse[],
  topic: string,
  learningObjectiveId: string,
): AssessmentResponse | null {
  const alreadyPaired = new Set<string>()
  measurements.forEach((m) => {
    alreadyPaired.add(m.pre_assessment_id)
    alreadyPaired.add(m.post_assessment_id)
  })

  return (
    assessments
      .filter((a) => a.topic === topic && a.learning_objective_id === learningObjectiveId)
      .filter((a) => BASELINE_TYPES.includes(a.assessment_type))
      .filter((a) => !alreadyPaired.has(a.id))
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return bTime - aTime
      })[0] ?? null
  )
}

/**
 * Record a quiz attempt as either a baseline or a retest.
 *
 * The first attempt on a topic/objective is saved as a PRE_INTERVENTION
 * baseline. The next attempt is saved as POST_INTERVENTION and is immediately
 * paired into a learning measurement, which is what populates the Analytics
 * and Topic Mastery pages (topic mastery is updated by the measurement call,
 * not by submitting an assessment alone).
 */
export async function recordQuizAttempt(
  payload: AssessmentSubmissionPayload,
): Promise<QuizProgressResult> {
  const [assessmentsResult, measurementsResult] = await Promise.allSettled([
    api.assessments.list(),
    api.measurements.list(),
  ])

  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : []
  const measurements = measurementsResult.status === 'fulfilled' ? measurementsResult.value : []

  const baseline = findUnpairedBaseline(
    assessments,
    measurements,
    payload.topic,
    payload.learning_objective_id,
  )

  const assessment = await api.assessments.submit({
    ...payload,
    assessment_type: baseline ? 'POST_INTERVENTION' : 'PRE_INTERVENTION',
    intervention_id: baseline?.intervention_id ?? payload.intervention_id,
  })

  if (!baseline) {
    return { assessment, measurement: null, phase: 'baseline', measurementError: null }
  }

  try {
    const measurement = await api.measurements.create({
      pre_assessment_id: baseline.id,
      post_assessment_id: assessment.id,
      intervention_id: assessment.intervention_id ?? baseline.intervention_id,
      require_verified: true,
      update_topic_mastery: true,
      notes: 'Automatically paired baseline and retest from quiz practice.',
    })
    return { assessment, measurement, phase: 'retest', measurementError: null }
  } catch (err) {
    // The assessment is still saved. A failed measurement must not make it look
    // like the quiz submission failed; report it separately to the student.
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { assessment, measurement: null, phase: 'retest', measurementError: message }
  }
}
