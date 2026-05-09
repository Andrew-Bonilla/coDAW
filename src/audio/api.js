import * as Tone from 'tone'

let _clips = []
let _disposables = []
let _colorIndex = 0
let _bpm = 120

const COLORS = [
  '#4f8ef7', '#f7674f', '#4ff7a0', '#f7e04f',
  '#bf4ff7', '#4ff7f0', '#f74fbf', '#a0f74f',
]

export function resetState() {
  _disposables.forEach(d => { try { d.dispose() } catch (_) {} })
  _disposables = []
  _clips = []
  _colorIndex = 0
  _bpm = 120
}

export function getClips() {
  return [..._clips]
}

export function getBpm() {
  return _bpm
}

export function bpm(value) {
  _bpm = value
}

export function synth(options = {}) {
  const type = options.type ?? 'triangle'
  const vol  = options.volume ?? -6
  let tone

  if (type === 'am') {
    tone = new Tone.PolySynth(Tone.AMSynth, {
      volume: vol,
      envelope: options.envelope || { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
    }).toDestination()
  } else if (type === 'fm') {
    tone = new Tone.PolySynth(Tone.FMSynth, {
      volume: vol,
      envelope: options.envelope || { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
    }).toDestination()
  } else if (type === 'membrane') {
    // Great for kick drums — use low notes like 'C1' or 'C2'
    tone = new Tone.PolySynth(Tone.MembraneSynth, {
      pitchDecay: options.pitchDecay ?? 0.05,
      octaves:    options.octaves   ?? 10,
      envelope: options.envelope || { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: vol,
    }).toDestination()
  } else if (type === 'metal') {
    // Great for hi-hats / cymbals — pitch matters less
    tone = new Tone.PolySynth(Tone.MetalSynth, {
      envelope: options.envelope || { attack: 0.001, decay: 0.1, release: 0.1 },
      volume: vol,
    }).toDestination()
  } else {
    // triangle | sawtooth | square | sine
    tone = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type },
      envelope: options.envelope || { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
      volume: vol,
    }).toDestination()
  }

  _disposables.push(tone)
  return { id: crypto.randomUUID(), tone, label: options.label || 'Synth' }
}

export function connect(instrument, fx) {
  instrument.tone.disconnect()
  instrument.tone.connect(fx)
}

// Convert a Tone.js duration string to beats (e.g. '8n' → 0.5, '4n' → 1)
function durationToBeats(dur) {
  const map = { '1n': 4, '2n': 2, '4n': 1, '8n': 0.5, '16n': 0.25, '32n': 0.125 }
  return map[dur] ?? 0.5
}

export function play(instrument, patternOrEvents, options = {}) {
  const noteDuration = options.note_duration || '8n'
  const isSequence = Array.isArray(patternOrEvents) && typeof patternOrEvents[0] === 'object'

  let notes, patternLabel, widthMeasures

  if (isSequence) {
    notes = patternOrEvents
    patternLabel = `${notes.length} note sequence`
    // Width = last note's end time in beats, converted to measures (4 beats each)
    const last = notes[notes.length - 1]
    const endBeat = last.time + durationToBeats(last.duration ?? noteDuration)
    widthMeasures = Math.max(0.5, endBeat / 4)
  } else {
    const str = patternOrEvents.trim()
    notes = str.split(/\s+/)
    patternLabel = str
    const noteDurSec = Tone.Time(noteDuration).toSeconds()
    const measureSec = Tone.Time('1m').toSeconds()
    widthMeasures = Math.max(0.5, (notes.length * noteDurSec) / measureSec)
  }

  const clip = {
    id: crypto.randomUUID(),
    label: options.label || instrument.label || 'Clip',
    patternLabel,
    notes,
    isSequence,
    instrument,
    noteDuration,
    startMeasure: options.start ?? 0,
    widthMeasures,
    color: COLORS[_colorIndex++ % COLORS.length],
  }

  _clips.push(clip)
  return clip
}

export function effect(type, options = {}) {
  let fx
  switch (type) {
    case 'reverb':
      fx = new Tone.Reverb({ decay: options.decay || 1.5, wet: options.wet || 0.5 })
      break
    case 'delay':
      fx = new Tone.FeedbackDelay(options.delayTime || '8n', options.feedback || 0.3)
      break
    case 'filter':
      fx = new Tone.Filter(options.frequency || 800, options.type || 'lowpass')
      break
    default:
      fx = new Tone.Volume(0)
  }
  fx.toDestination()
  _disposables.push(fx)
  return fx
}
