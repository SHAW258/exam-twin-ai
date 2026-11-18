import type { SourceCitation, TutorMode, TutorSourceKind, TutorChatMessageItem } from '../../types/api'

export interface ChatMessage {
  id: string
  seq?: number
  clientMsgId?: string
  inReplyTo?: string
  pending?: boolean
  sender: 'student' | 'tutor'
  text: string
  citations?: SourceCitation[]
  grounded?: boolean
  mode?: TutorMode
  sourceKind?: TutorSourceKind
  practiceRecordId?: string | null
  timestamp: string
}

export function deriveSourceKind(item: {
  source_kind?: TutorSourceKind
  grounded?: boolean
  citations?: SourceCitation[]
  mode?: string
}): TutorSourceKind {
  if (item.source_kind) return item.source_kind
  if (!item.grounded) return item.mode === 'practice' ? 'general_ai' : 'none'
  if (!item.citations || item.citations.length === 0) return 'global_document'
  return 'own_document'
}

export function formatHistoryItems(items: TutorChatMessageItem[]): ChatMessage[] {
  return items.map((item) => ({
    id: item.id,
    seq: typeof item.seq === 'number' ? item.seq : undefined,
    sender: item.sender,
    text: item.text,
    citations: item.citations || [],
    grounded: item.grounded ?? true,
    mode: item.mode,
    sourceKind: deriveSourceKind(item),
    timestamp: item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Earlier',
  }))
}

/**
 * Merge authoritative server history with any still-pending local student bubbles
 * so WebSocket reconnects hold exact bubble positions and never duplicate or flip pairs.
 */
export function mergeServerHistory(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev

  const seenIds = new Set<string>()
  const merged: ChatMessage[] = []

  for (const msg of incoming) {
    if (seenIds.has(msg.id)) continue
    seenIds.add(msg.id)
    merged.push(msg)
  }

  // Keep any unacknowledged optimistic student bubbles not yet in server history
  const lastServerStudentText = [...merged]
    .reverse()
    .find((m) => m.sender === 'student')?.text

  for (const oldMsg of prev) {
    if (!oldMsg.pending) continue
    if (seenIds.has(oldMsg.id)) continue
    if (oldMsg.sender === 'student' && oldMsg.text === lastServerStudentText) continue
    merged.push(oldMsg)
  }

  return merged
}

/**
 * Lock an optimistic student bubble in-place when the WebSocket sends `student_ack`.
 */
export function applyStudentAck(
  prev: ChatMessage[],
  ack: { client_msg_id?: string; id: string; seq?: number; timestamp?: string }
): ChatMessage[] {
  let matched = false
  const next = prev.map((msg) => {
    if (
      !matched &&
      msg.sender === 'student' &&
      ((ack.client_msg_id && msg.clientMsgId === ack.client_msg_id) ||
        (msg.pending && !ack.client_msg_id))
    ) {
      matched = true
      return {
        ...msg,
        id: ack.id || msg.id,
        seq: typeof ack.seq === 'number' ? ack.seq : msg.seq,
        pending: false,
        timestamp: ack.timestamp
          ? new Date(ack.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : msg.timestamp,
      }
    }
    return msg
  })
  return next
}

/**
 * Anchor a tutor answer immediately beneath the exact student bubble it replies to,
 * preventing duplicates or out-of-order bubbles across WebSocket reconnects.
 */
export function insertAnchoredAnswer(
  prev: ChatMessage[],
  answerMsg: ChatMessage,
  inReplyTo?: string,
  clientMsgId?: string
): ChatMessage[] {
  // Replace in-place if this exact server message ID already exists
  const existingIdx = prev.findIndex((m) => m.id === answerMsg.id)
  if (existingIdx !== -1) {
    const copy = [...prev]
    copy[existingIdx] = answerMsg
    return copy
  }

  // Locate the exact parent student bubble
  let parentIdx = -1
  if (inReplyTo || clientMsgId) {
    for (let i = prev.length - 1; i >= 0; i--) {
      const m = prev[i]
      if (
        m.sender === 'student' &&
        ((inReplyTo && m.id === inReplyTo) || (clientMsgId && m.clientMsgId === clientMsgId))
      ) {
        parentIdx = i
        break
      }
    }
  }

  if (parentIdx !== -1) {
    const copy = [...prev]
    // Mark parent settled if still pending
    if (copy[parentIdx].pending) {
      copy[parentIdx] = { ...copy[parentIdx], pending: false }
    }
    copy.splice(parentIdx + 1, 0, answerMsg)
    return copy
  }

  return [...prev, answerMsg]
}
