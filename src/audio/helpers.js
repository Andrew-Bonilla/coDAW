// Pure-function DSL helpers — injected into user code alongside `synth`, `play`, etc.
// No audio state, no side effects. Just music-theory utilities.

const NOTE_TO_SEMI = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10, B: 11,
}

const SEMI_TO_NOTE = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
]

function parseRoot(root) {
  const m = String(root).match(/^([A-G][#b]?)(-?\d+)?$/)
  if (!m) throw new Error(`Invalid note: "${root}"`)
  return { pitch: m[1], octave: m[2] !== undefined ? parseInt(m[2]) : 4 }
}

function buildNote(rootSemi, baseOctave, interval) {
  const total      = rootSemi + interval
  const noteIdx    = ((total % 12) + 12) % 12
  const octaveStep = Math.floor(total / 12)
  return SEMI_TO_NOTE[noteIdx] + (baseOctave + octaveStep)
}

// ── Scales ────────────────────────────────────────────────────────────────────
const SCALES = {
  major:           [0, 2, 4, 5, 7, 9, 11],
  minor:           [0, 2, 3, 5, 7, 8, 10],
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  phrygian:        [0, 1, 3, 5, 7, 8, 10],
  lydian:          [0, 2, 4, 6, 7, 9, 11],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  locrian:         [0, 1, 3, 5, 6, 8, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  blues:           [0, 3, 5, 6, 7, 10],
  chromatic:       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

// scale('C4', 'minor') → ['C4','D4','Eb4','F4','G4','Ab4','Bb4']
// scale('C',  'minor') → defaults to octave 4
export function scale(root, mode = 'major') {
  const intervals = SCALES[mode]
  if (!intervals) {
    throw new Error(`Unknown mode "${mode}". Available: ${Object.keys(SCALES).join(', ')}`)
  }
  const { pitch, octave } = parseRoot(root)
  const rootSemi = NOTE_TO_SEMI[pitch]
  return intervals.map(i => buildNote(rootSemi, octave, i))
}

// ── Chords ────────────────────────────────────────────────────────────────────
const CHORDS = {
  '':     [0, 4, 7],         // major (default)
  maj:    [0, 4, 7],
  m:      [0, 3, 7],         // minor
  min:    [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  '7':    [0, 4, 7, 10],     // dominant 7
  maj7:   [0, 4, 7, 11],
  m7:     [0, 3, 7, 10],
  min7:   [0, 3, 7, 10],
  dim7:   [0, 3, 6, 9],
  sus2:   [0, 2, 7],
  sus4:   [0, 5, 7],
}

// chord('Cm')    → 'C4+Eb4+G4'  (defaults to octave 4)
// chord('Cm', 3) → 'C3+Eb3+G3'
// chord('Cm7')   → 'C4+Eb4+G4+Bb4'
export function chord(name, octave = 4) {
  const m = String(name).match(/^([A-G][#b]?)(.*)$/)
  if (!m) throw new Error(`Invalid chord: "${name}"`)
  const [, rootPitch, quality] = m
  const intervals = CHORDS[quality]
  if (!intervals) {
    const opts = Object.keys(CHORDS).filter(k => k).join(', ')
    throw new Error(`Unknown chord quality "${quality}". Available: ${opts}`)
  }
  const rootSemi = NOTE_TO_SEMI[rootPitch]
  return intervals.map(i => buildNote(rootSemi, octave, i)).join('+')
}

// ── Euclidean rhythms ─────────────────────────────────────────────────────────
// euclid('C1', 3, 8) → 'C1 ~ ~ C1 ~ ~ C1 ~'   (tresillo)
// euclid('C1', 5, 8) → 'C1 ~ C1 ~ C1 C1 ~ C1' (cinquillo)
// euclid('C1', 4, 16)→ 4-on-the-floor across 16 steps
export function euclid(note, hits, steps) {
  if (hits >= steps) return Array(steps).fill(note).join(' ')
  if (hits <= 0)     return Array(steps).fill('~').join(' ')

  const pattern = []
  const rest    = steps - hits
  let bucket    = rest        // start with hit on step 0
  for (let i = 0; i < steps; i++) {
    if (bucket >= rest) {
      bucket -= rest
      pattern.push(note)
    } else {
      bucket += hits
      pattern.push('~')
    }
  }
  return pattern.join(' ')
}

// ── Repeat ────────────────────────────────────────────────────────────────────
// repeat(4, 'C4 E4') → 'C4 E4 C4 E4 C4 E4 C4 E4'
export function repeat(n, pattern) {
  if (typeof pattern !== 'string') {
    throw new Error('repeat() supports string patterns only')
  }
  return Array(n).fill(pattern).join(' ')
}
