export type OcrExtractionStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface OcrState {
  status: OcrExtractionStatus;
  progress: number;
  text: string;
  fileName?: string;
  error?: string;
}

export const INITIAL_OCR_STATE: OcrState = {
  status: 'idle',
  progress: 0,
  text: '',
};

const EXPLICIT_SUBJECT_REGEX =
  /^(?:الموضوع|الـمـوضـوع|موضوع|بشأن|حول|objet|subject|re)\s*[:：\-–—]\s*(.+)$/i;

const EXPLICIT_SUBJECT_LABEL_ONLY_REGEX =
  /^(?:الموضوع|الـمـوضـوع|موضوع|objet|subject|re)\s*[:：\-–—]?\s*$/i;

const HEADER_NOISE_REGEX =
  /^(?:الجمهورية|الوزارة|وزارة|ولاية|معتمدية|بلدية|الإدارة|ادارة|مصلحة|مكتب|تونس|في\s+\d|بتاريخ|الرقم|عدد|المرجع|république|ministère|direction|service|bureau|tunis|le\s+\d|n°|réf|reference|madame|monsieur|salutations|تحية|السلام\s+عليكم|إلى\s+السيد|السيد)/i;

const cleanSubjectCandidate = (raw: string): string => {
  let cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/^[:：\-–—•*.\s]+/, '')
    .trim();

  if (cleaned.length > 140) {
    const truncated = cleaned.slice(0, 140);
    const lastSpace = truncated.lastIndexOf(' ');
    cleaned = (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated).trim();
  }

  return cleaned;
};

/**
 * Extracts a clean, concise document subject line from OCR text as a fast
 * deterministic heuristic (also serves as instant offline fallback when the
 * local LLM service is unavailable).
 */
export const extractSubjectHeuristic = (rawText: string): string => {
  if (!rawText || !rawText.trim()) return '';

  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  // 1. Explicit "الموضوع :" / "Objet :" / "Subject :" marker
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(EXPLICIT_SUBJECT_REGEX);
    if (match && match[1]) {
      const candidate = cleanSubjectCandidate(match[1]);
      if (candidate.length >= 4) return candidate;
    }

    if (EXPLICIT_SUBJECT_LABEL_ONLY_REGEX.test(line) && i + 1 < lines.length) {
      const nextCandidate = cleanSubjectCandidate(lines[i + 1]);
      if (nextCandidate.length >= 4) return nextCandidate;
    }
  }

  // 2. Fallback: first substantive non-header, non-numeric line
  for (const line of lines) {
    if (line.length < 8) continue;
    if (/^[\d\s/\\.\-_:]+$/.test(line)) continue;
    if (HEADER_NOISE_REGEX.test(line)) continue;

    const candidate = cleanSubjectCandidate(line);
    if (candidate.length >= 8) {
      return candidate;
    }
  }

  // 3. Last resort: first meaningful line
  const firstMeaningful = lines.find((l) => l.length >= 5);
  return firstMeaningful ? cleanSubjectCandidate(firstMeaningful) : '';
};
