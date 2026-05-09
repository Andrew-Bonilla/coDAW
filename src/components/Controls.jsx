import { Play, Square, Circle } from 'lucide-react';

export default function Controls({ onRun, onPlay, onStop, onRecord, isPlaying, isRecording, hasClips }) {
  const busy = isPlaying || isRecording

  return (
    <div className="controls">
      <span className="app-title">coDAW</span>
      <div className="control-buttons">
        <button className="btn btn-run" onClick={onRun} disabled={busy}>Run Code</button>

        {/* Play */}
        <button className="btn btn-play" onClick={onPlay} disabled={!hasClips || busy}>
          <Play fill={isPlaying ? 'white' : 'none'} size={'1.3em'} color="white" strokeWidth={2} />
        </button>

        {/* Stop — active during both playback and recording */}
        <button className="btn btn-stop" onClick={onStop} disabled={!busy}>
          <Square fill={busy ? 'white' : 'none'} size={'1.3em'} color="white" strokeWidth={2} />
        </button>

        {/* Record */}
        <button className="btn btn-record" onClick={onRecord} disabled={!hasClips || isPlaying}>
          <Circle
            fill={isRecording ? '#f7674f' : 'none'}
            size={'1.3em'}
            color={isRecording ? '#f7674f' : 'white'}
            strokeWidth={2}
          />
        </button>
      </div>
      {!hasClips && <span className="hint">Press Run to generate clips from your code</span>}
    </div>
  )
}
