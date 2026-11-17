import { describe, expect, it } from 'vitest'
import { findUnpairedBaseline } from '../utils/assessmentFlow'
import type { AssessmentResponse, MeasurementResponse } from '../types/api'

const assessment = (
  id: string,
  overrides: Partial<AssessmentResponse> = {},
): AssessmentResponse => ({
  id,
  student_id: 'student_1',
  topic: 'Data Structures',
  learning_objective_id: 'LO-DATASTR',
  assessment_type: 'PRE_INTERVENTION',
  obtained_score: 40,
  max_score: 100,
  normalized_score: 0.4,
  verification_status: 'VERIFIED',
  evidence: 'quiz',
  timestamp: '2026-11-17T10:00:00',
  ...overrides,
})

const measurement = (
  id: string,
  pre: string,
  post: string,
): MeasurementResponse => ({
  measurement_id: id,
  student_id: 'student_1',
  topic: 'Data Structures',
  learning_objective_id: 'LO-DATASTR',
  pre_assessment_id: pre,
  post_assessment_id: post,
  pre_normalized_score: 0.4,
  post_normalized_score: 0.8,
  normalized_gain: 0.66,
  absolute_gain: 0.4,
  gain_classification: 'POSITIVE',
  is_verified: true,
  summary_explanation: 'improved',
})

describe('findUnpairedBaseline', () => {
  it('returns null when there are no assessments', () => {
    expect(findUnpairedBaseline([], [], 'Data Structures', 'LO-DATASTR')).toBeNull()
  })

  it('picks the most recent compatible baseline', () => {
    const older = assessment('a1', { timestamp: '2026-11-16T10:00:00' })
    const newer = assessment('a2', { timestamp: '2026-11-17T10:00:00' })

    expect(findUnpairedBaseline([older, newer], [], 'Data Structures', 'LO-DATASTR')?.id).toBe('a2')
  })

  it('treats FORMATIVE assessments as valid baselines', () => {
    const formative = assessment('a1', { assessment_type: 'FORMATIVE' })

    expect(findUnpairedBaseline([formative], [], 'Data Structures', 'LO-DATASTR')?.id).toBe('a1')
  })

  it('excludes assessments already used as either side of a measurement', () => {
    const a1 = assessment('a1')
    const a2 = assessment('a2')
    const a3 = assessment('a3', { timestamp: '2026-11-18T10:00:00' })

    expect(
      findUnpairedBaseline([a1, a2, a3], [measurement('m1', 'a1', 'a2')], 'Data Structures', 'LO-DATASTR')?.id,
    ).toBe('a3')
  })

  it('ignores assessments from other topics, objectives, and retests', () => {
    const wrongTopic = assessment('a1', { topic: 'Algorithms' })
    const wrongObjective = assessment('a2', { learning_objective_id: 'LO-ALGORIT' })
    const retest = assessment('a3', { assessment_type: 'POST_INTERVENTION' })

    expect(
      findUnpairedBaseline([wrongTopic, wrongObjective, retest], [], 'Data Structures', 'LO-DATASTR'),
    ).toBeNull()
  })
})
