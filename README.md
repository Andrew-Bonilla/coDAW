# coDAW

A coding-first digital audio workstation that runs in the browser. Write JavaScript to define instruments, patterns, and effects — the code is rendered as draggable clips on a timeline that you can rearrange visually, edit note-by-note in a piano roll, play back, and record to an audio file.

The code is the source of truth: drag a clip, and the `start:` value in your code updates. Edit a melody in the piano roll, and the events array in your code rewrites itself. Re-run anytime to regenerate everything from the editor.

Final project for **COMS3430 (Spring 2026)** — Prof. Mark Santolucito, Barnard College.

**Live demo:** https://andrew-bonilla.github.io/coDAW/

## Features

- **JavaScript DSL** for declaring instruments, patterns, effects, and timing
- **Eight synth types**: triangle, sawtooth, square, sine, am, fm, membrane, metal
- **Effects**: reverb, delay, lowpass filter — chained via `connect(instrument, effect)`
- **Two pattern modes**: simple string patterns (`'C4 E4 G4'`) and explicit event arrays for custom timing
- **Chord support** via the `+` syntax (`'C4+E4+G4'`)
- **Bidirectional code ↔ UI sync**: drag clips to update code, edit code to regenerate the timeline
- **Piano roll** for chromatic note editing (click to add, drag to move/resize, right-click to delete)
- **Animated playhead** with sample-accurate timing
- **Recording** via `Tone.Recorder` — captures the master output to a downloadable WebM file

## Stack

- **React 19** + **Vite 5**
- **Tone.js** (Web Audio synthesis, transport, recorder)
- **CodeMirror 6** (editor with JS syntax highlighting)
- **lucide-react** (icons)

## API reference

```js
bpm(120)                                 // Set the global tempo

// Create instruments
const lead = synth({
  type: 'fm',                            // triangle | sawtooth | square | sine | am | fm | membrane | metal
  label: 'Lead',
  volume: -8,                            // dB; 0 = unity, negative = quieter
  envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
})

// Create effects
const verb = effect('reverb', { decay: 2, wet: 0.4 })
const dly  = effect('delay',  { delayTime: '8n', feedback: 0.3 })
const filt = effect('filter', { frequency: 2200, type: 'lowpass' })

// Route an instrument through an effect
connect(lead, verb)

// Pattern mode A — uniform spacing via a string
play(lead, 'C4 E4 G4 ~ B4', {
  label: 'Melody',
  note_duration: '8n',                   // 1n | 2n | 4n | 8n | 16n
  start: 0,                              // measure offset
})

// Pattern mode B — explicit events with custom timing
play(lead, [
  { note: 'C4',     time: 0,   duration: '4n' },
  { note: 'E4+G4',  time: 1.5, duration: '8n' },   // chord via "+"
  { note: 'C5',     time: 2,   duration: '2n' },
], { label: 'Sequence', start: 0 })
```

## Running locally

```bash
npm install
npm run dev
```

The dev server starts at http://localhost:5173.

## Deploying

```bash
npm run deploy
```

This builds and pushes the production bundle to the `gh-pages` branch. GitHub Pages then serves it at the URL above.

## How it works

- **`src/audio/api.js`** — the user-facing DSL. Captures clips into module-level state during `runUserCode()`.
- **`src/audio/engine.js`** — wraps user code in a `new Function(...)` and schedules clips via `Tone.Part`. Handles play / stop / record.
- **`src/utils/codeUpdater.js`** — bracket-aware string manipulation that rewrites `start:` values and event arrays back into the source code when you drag clips or edit the piano roll.
- **`src/components/`** — Editor (CodeMirror), Timeline, Clip (draggable), PianoRoll, Playhead, Controls.

## Limitations

- No undo / redo
- Single transport: no looping, no per-clip playback
- Recorder outputs `.webm` (browser `MediaRecorder` default), not `.wav`
- Effects can't be chained (one effect per instrument)

## License

MIT
