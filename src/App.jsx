import { useState, useCallback, useRef } from 'react'
import Editor from './components/Editor'
import Timeline from './components/Timeline'
import Controls from './components/Controls'
import { runUserCode, playClips, stopPlayback, startRecording, stopRecording } from './audio/engine'
import { updateStartInCode, updateClipEventsInCode } from './utils/codeUpdater'
import { getBpm } from './audio/api'
import PianoRoll, { clipToEvents } from './components/PianoRoll'
import './App.css'

const DEFAULT_CODE = `// Thriller — Michael Jackson (130 BPM, C# minor)
// Bass groove transcribed from sheet-music left hand
bpm(130)

const kick  = synth({ type: 'membrane', label: 'Kick',   volume: -4,
                      pitchDecay: 0.04, octaves: 8 })
const snare = synth({ type: 'metal',    label: 'Snare',  volume: -12,
                      envelope: { attack: 0.001, decay: 0.15, release: 0.05 } })
const hat   = synth({ type: 'metal',    label: 'Hi-Hat', volume: -22 })
const bass  = synth({ type: 'sawtooth', label: 'Bass',   volume: -14 })
const keys  = synth({ type: 'am',       label: 'Keys',   volume: -10 })

const verb = effect('reverb', { decay: 2.5, wet: 0.35 })
connect(keys, verb)

// Drums — kick on 1 & 3, snare on 2 & 4, 8th-note hats
play(kick,  'C1 ~ C1 ~ C1 ~ C1 ~',
  { label: 'Kick',  note_duration: '4n', start: 0 })
play(snare, '~ E3 ~ E3 ~ E3 ~ E3',
  { label: 'Snare', note_duration: '4n', start: 0 })
play(hat, 'F4 F4 F4 F4 F4 F4 F4 F4 F4 F4 F4 F4 F4 F4 F4 F4',
  { label: 'Hi-Hat', note_duration: '8n', start: 0 })

// Bass — syncopated C# minor groove (left-hand pattern, 2 bars)
play(bass, [
  // Bar 1
  { note: 'C#2', time: 0,    duration: '8n'  },
  { note: 'C#3', time: 0.5,  duration: '16n' },
  { note: 'E3',  time: 0.75, duration: '16n' },
  { note: 'C#3', time: 1,    duration: '8n'  },
  { note: 'G#2', time: 1.5,  duration: '8n'  },
  { note: 'C#3', time: 2,    duration: '8n'  },
  { note: 'E3',  time: 2.5,  duration: '16n' },
  { note: 'G#3', time: 2.75, duration: '16n' },
  { note: 'C#3', time: 3,    duration: '8n'  },
  { note: 'B2',  time: 3.5,  duration: '8n'  },
  // Bar 2 (repeat)
  { note: 'C#2', time: 4,    duration: '8n'  },
  { note: 'C#3', time: 4.5,  duration: '16n' },
  { note: 'E3',  time: 4.75, duration: '16n' },
  { note: 'C#3', time: 5,    duration: '8n'  },
  { note: 'G#2', time: 5.5,  duration: '8n'  },
  { note: 'C#3', time: 6,    duration: '8n'  },
  { note: 'E3',  time: 6.5,  duration: '16n' },
  { note: 'G#3', time: 6.75, duration: '16n' },
  { note: 'C#3', time: 7,    duration: '8n'  },
  { note: 'B2',  time: 7.5,  duration: '8n'  },
], { label: 'Bass', start: 0 })

// Keys — melodic hook entering in bar 2 (right hand, high register)
play(keys, [
  { note: 'G#5', time: 4,    duration: '8n' },
  { note: 'A5',  time: 4.5,  duration: '8n' },
  { note: 'G#5', time: 5,    duration: '4n' },
  { note: 'E5',  time: 6,    duration: '8n' },
  { note: 'F#5', time: 6.5,  duration: '8n' },
  { note: 'E5',  time: 7,    duration: '8n' },
  { note: 'C#5', time: 7.5,  duration: '8n' },
], { label: 'Keys', start: 0 })`

export default function App() {
  const codeRef = useRef(DEFAULT_CODE)
  const editorRef = useRef(null)
  const [clips, setClips] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [error, setError] = useState(null)
  const [pianoRoll, setPianoRoll] = useState(null) // { clip, clipIndex }
  const clipsRef = useRef([])

  const handleCodeChange = useCallback((newCode) => {
    codeRef.current = newCode
  }, [])

  const handleRun = useCallback(async () => {
    try {
      setError(null)
      const newClips = await runUserCode(codeRef.current)
      clipsRef.current = newClips
      setClips(newClips)
      setBpm(getBpm())
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const handlePlay = useCallback(async () => {
    try {
      setError(null)
      await playClips(clipsRef.current)
      setIsPlaying(true)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const handleStop = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
      setIsRecording(false)
    } else {
      stopPlayback()
    }
    setIsPlaying(false)
  }, [isRecording])

  const handleRecord = useCallback(async () => {
    try {
      setError(null)
      await startRecording(clipsRef.current)
      setIsRecording(true)
      setIsPlaying(true)  // treat recording as "playing" for the playhead
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const handleOpenPianoRoll = useCallback((clip, clipIndex) => {
    // Auto-convert string pattern to sequence format
    if (!clip.isSequence) {
      const events = clipToEvents(clip)
      const convertedClip = {
        ...clip,
        isSequence: true,
        notes: events,
        patternLabel: `${events.length} note sequence`,
      }
      const newCode = updateClipEventsInCode(codeRef.current, clipIndex, events)
      codeRef.current = newCode
      editorRef.current?.setCode(newCode)
      setClips(prev => {
        const next = prev.map((c, i) => i === clipIndex ? convertedClip : c)
        clipsRef.current = next
        return next
      })
      setPianoRoll({ clip: convertedClip, clipIndex })
    } else {
      setPianoRoll({ clip, clipIndex })
    }
  }, [])

  const handlePianoRollChange = useCallback((events) => {
    if (!pianoRoll) return
    const { clipIndex } = pianoRoll
    const newCode = updateClipEventsInCode(codeRef.current, clipIndex, events)
    codeRef.current = newCode
    editorRef.current?.setCode(newCode)

    setClips(prev => {
      const next = prev.map((c, i) => i === clipIndex
        ? { ...c, isSequence: true, notes: events, patternLabel: `${events.length} note sequence` }
        : c)
      clipsRef.current = next
      return next
    })
  }, [pianoRoll])

  const handleClipUpdate = useCallback((updatedClip, clipIndex) => {
    // Update code to reflect new start position
    const newCode = updateStartInCode(codeRef.current, clipIndex, updatedClip.startMeasure)
    codeRef.current = newCode
    editorRef.current?.setCode(newCode)

    setClips(prev => {
      const next = prev.map(c => c.id === updatedClip.id ? updatedClip : c)
      clipsRef.current = next
      return next
    })
  }, [])

  return (
    <div className="app">
      <Controls
        onRun={handleRun}
        onPlay={handlePlay}
        onStop={handleStop}
        onRecord={handleRecord}
        isPlaying={isPlaying}
        isRecording={isRecording}
        hasClips={clips.length > 0}
      />
      {error && <div className="error-bar">{error}</div>}
      <div className="workspace">
        <div className="editor-panel">
          <Editor ref={editorRef} initialCode={DEFAULT_CODE} onChange={handleCodeChange} />
        </div>
        <div className="timeline-panel">
          <Timeline clips={clips} onClipUpdate={handleClipUpdate} onClipOpen={handleOpenPianoRoll} isPlaying={isPlaying} bpm={bpm} />
        </div>
      </div>
      {pianoRoll && (
        <PianoRoll
          clip={pianoRoll.clip}
          onClose={() => setPianoRoll(null)}
          onEventsChange={handlePianoRollChange}
        />
      )}
    </div>
  )
}
