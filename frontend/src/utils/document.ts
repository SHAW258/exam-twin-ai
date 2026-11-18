/**
 * Utility functions for document formatting and title presentation.
 */

export const cleanDocName = (rawName?: string | null): string => {
  if (!rawName) return 'Untitled Document'

  try {
    // Decode percent-encoded characters (e.g. %20 -> space)
    let clean = decodeURIComponent(decodeURIComponent(rawName))
    // Strip internal doc_[hex]_ prefix
    clean = clean.replace(/^doc_[a-f0-9]+_/, '')
    // Strip .pdf extension case-insensitively
    clean = clean.replace(/\.pdf$/i, '')
    // Replace underscores with clean spaces
    clean = clean.replace(/_/g, ' ')
    // Normalize repeated whitespace
    clean = clean.replace(/\s+/g, ' ').trim()
    return clean || rawName
  } catch {
    return (
      rawName
        .replace(/^doc_[a-f0-9]+_/, '')
        .replace(/\.pdf$/i, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || rawName
    )
  }
}
