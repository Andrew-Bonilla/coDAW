import * as Tone from 'tone'
import { resetState, getClips, getBpm, synth, play, effect, bpm, connect } from './api'

let activeParts   = []
let activeRecorder = null

export async function runUserCode(code) {
  await Tone.start()
  resetState()
  activeParts.forEach(p => { try { p.dispose() } catch (_) {} })
  activeParts = []

  const fn = new Function('bpm', 'synth', 'play', 'effect', 'connect', code)
  fn(bpm, synth, play, effect, connect)

  return getClips()
}

// ── Shared scheduling ─────────────────────────────────────────────────────────
function scheduleClips(clips) {
  Tone.Transport.bpm.value = getBpm()
  const beatToSec = 60 / getBpm()

  clips.forEach(clip => {
    let events

    if (clip.isSequence) {
      events = clip.notes.map(({ note, time, duration }) => [
        time * beatToSec,
        { note, duration: duration ?? clip.noteDuration },
      ])
    } else {
      const noteDurSec = Tone.Time(clip.noteDuration).toSeconds()
      events = clip.notes
        .map((note, i) => [i * noteDurSec, { note, duration: clip.noteDuration }])
        .filter(([, { note }]) => note !== '~')
    }

    const part = new Tone.Part((time, { note, duration }) => {
      const noteOrChord = note.includes('+') ? note.split('+') : note
      clip.instrument.tone.triggerAttackRelease(noteOrChord, duration, time)
    }, events)

    part.start(`${clip.startMeasure}m`)
    activeParts.push(part)
  })
}

// ── Playback ──────────────────────────────────────────────────────────────────
export async function playClips(clips) {
  if (!clips.length) return

  await Tone.start()
  Tone.Transport.stop()
  Tone.Transport.cancel()
  Tone.Transport.seconds = 0
  activeParts.forEach(p => { try { p.dispose() } catch (_) {} })
  activeParts = []

  scheduleClips(clips)
  Tone.Transport.start()
}

export function stopPlayback() {
  Tone.Transport.stop()
  Tone.Transport.cancel()
}

// ── Recording ─────────────────────────────────────────────────────────────────
export async function startRecording(clips) {
  if (!clips.length) return

  await Tone.start()
  Tone.Transport.stop()
  Tone.Transport.cancel()
  Tone.Transport.seconds = 0
  activeParts.forEach(p => { try { p.dispose() } catch (_) {} })
  activeParts = []

  // Tap the master output
  activeRecorder = new Tone.Recorder()
  Tone.getDestination().connect(activeRecorder)

  scheduleClips(clips)
  activeRecorder.start()
  Tone.Transport.start()
}

export async function stopRecording() {
  Tone.Transport.stop()
  Tone.Transport.cancel()

  if (!activeRecorder) return

  const blob = await activeRecorder.stop()
  activeRecorder.dispose()
  activeRecorder = null

  // Trigger download
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = 'coding-daw-recording.webm'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
