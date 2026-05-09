import { useState, useRef, useEffect } from 'react'

const BEAT_WIDTH  = 80   // px per beat
const NOTE_HEIGHT = 16   // px per semitone
const PIANO_WIDTH = 56   // px for key labels
const SNAP        = 0.25 // beat grid (16th notes)

// Build note list B6 → C1 (high to low, as shown in piano rolls)
const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const ALL_NOTES = []
for (let oct = 6; oct >= 1; oct--)
  for (let i = CHROMATIC.length - 1; i >= 0; i--)
    ALL_NOTES.push(`${CHROMATIC[i]}${oct}`)

function isBlack(note) { return note.includes('#') }

function durationToBeats(dur) {
  return { '1n': 4, '2n': 2, '4n': 1, '8n': 0.5, '16n': 0.25, '32n': 0.125 }[dur] ?? 0.5
}

function beatsToDuration(beats) {
  if (beats >= 3.5) return '1n'
  if (beats >= 1.5) return '2n'
  if (beats >= 0.75) return '4n'
  if (beats >= 0.375) return '8n'
  if (beats >= 0.1875) return '16n'
  return '32n'
}

function snapTo(v, grid = SNAP) { return Math.round(v / grid) * grid }

export function clipToEvents(clip) {
  if (clip.isSequence) return clip.notes.map(e => ({ ...e }))
  return clip.notes
    .filter(n => n !== '~')
    .map((note, i) => ({ note, time: i * durationToBeats(clip.noteDuration), duration: clip.noteDuration }))
}

export default function PianoRoll({ clip, onClose, onEventsChange }) {
  const [events, setEvents] = useState(() => clipToEvents(clip))
  const scrollRef = useRef(null)

  // Scroll to show C4 area on open
  useEffect(() => {
    if (!scrollRef.current) return
    const c4idx = ALL_NOTES.indexOf('C5')
    scrollRef.current.scrollTop = c4idx * NOTE_HEIGHT - 200
  }, [])

  const update = (newEvents) => {
    setEvents(newEvents)
    onEventsChange(newEvents)
  }

  const totalBeats = Math.max(8, Math.ceil(
    Math.max(...events.map(e => e.time + durationToBeats(e.duration)), 8)
  ) + 2)

  // Click on empty grid → add note
  const handleGridMouseDown = (e) => {
    if (e.button !== 0) return
    if (e.target.classList.contains('pr-note') || e.target.classList.contains('pr-note-resize') || e.target.classList.contains('pr-note-label')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const time = Math.max(0, snapTo((e.clientX - rect.left) / BEAT_WIDTH))
    const noteIdx = Math.floor((e.clientY - rect.top) / NOTE_HEIGHT)
    const note = ALL_NOTES[noteIdx]
    if (!note) return
    update([...events, { note, time, duration: '8n' }].sort((a, b) => a.time - b.time))
  }

  // Drag note to move
  const handleNoteDrag = (e, idx) => {
    if (e.button === 2) { update(events.filter((_, i) => i !== idx)); return }
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX, startY = e.clientY
    const origTime = events[idx].time
    const origNoteIdx = ALL_NOTES.indexOf(events[idx].note)

    const onMove = (e) => {
      const newTime = Math.max(0, snapTo(origTime + (e.clientX - startX) / BEAT_WIDTH))
      const newNoteIdx = Math.max(0, Math.min(ALL_NOTES.length - 1,
        Math.round(origNoteIdx + (e.clientY - startY) / NOTE_HEIGHT)))
      update(events.map((ev, i) => i === idx ? { ...ev, time: newTime, note: ALL_NOTES[newNoteIdx] } : ev))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Drag right edge to resize
  const handleNoteResize = (e, idx) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const origBeats = durationToBeats(events[idx].duration)

    const onMove = (e) => {
      const newBeats = Math.max(SNAP, snapTo(origBeats + (e.clientX - startX) / BEAT_WIDTH))
      update(events.map((ev, i) => i === idx ? { ...ev, duration: beatsToDuration(newBeats) } : ev))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="pr-overlay" onContextMenu={e => e.preventDefault()}>
      <div className="pr-modal">
        <div className="pr-header">
          <span className="pr-title">Piano Roll — {clip.label}</span>
          <span className="pr-hint">Click to add · Drag to move · Drag edge to resize · Right-click to delete</span>
          <button className="pr-close" onClick={onClose}>Done</button>
        </div>

        <div className="pr-body" ref={scrollRef}>
          {/* Sticky piano keys */}
          <div className="pr-keys">
            {ALL_NOTES.map(note => (
              <div key={note} className={`pr-key ${isBlack(note) ? 'pr-key-black' : 'pr-key-white'}`} style={{ height: NOTE_HEIGHT }}>
                {note.startsWith('C') && !isBlack(note) && <span className="pr-key-label">{note}</span>}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            className="pr-grid"
            style={{ width: totalBeats * BEAT_WIDTH, height: ALL_NOTES.length * NOTE_HEIGHT }}
            onMouseDown={handleGridMouseDown}
          >
            {/* Pitch rows */}
            {ALL_NOTES.map((note, i) => (
              <div key={note} className={`pr-row ${isBlack(note) ? 'pr-row-black' : ''}`}
                style={{ top: i * NOTE_HEIGHT, height: NOTE_HEIGHT }} />
            ))}

            {/* Beat lines */}
            {Array.from({ length: totalBeats + 1 }, (_, i) => (
              <div key={i} className={`pr-beat-line ${i % 4 === 0 ? 'pr-beat-major' : ''}`}
                style={{ left: i * BEAT_WIDTH }} />
            ))}

            {/* Sub-beat lines (half beats) */}
            {Array.from({ length: totalBeats * 2 }, (_, i) => (
              <div key={i} className="pr-halfbeat-line" style={{ left: (i + 0.5) * BEAT_WIDTH }} />
            ))}

            {/* Notes */}
            {events.map((ev, i) => {
              const noteIdx = ALL_NOTES.indexOf(ev.note)
              if (noteIdx === -1) return null
              return (
                <div key={i} className="pr-note"
                  style={{
                    left: ev.time * BEAT_WIDTH,
                    top: noteIdx * NOTE_HEIGHT,
                    width: durationToBeats(ev.duration) * BEAT_WIDTH - 2,
                    height: NOTE_HEIGHT - 1,
                  }}
                  onMouseDown={(e) => handleNoteDrag(e, i)}
                >
                  <span className="pr-note-label">{ev.note}</span>
                  <div className="pr-note-resize" onMouseDown={(e) => handleNoteResize(e, i)} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
