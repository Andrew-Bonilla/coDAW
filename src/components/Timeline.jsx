import Clip from './Clip'
import Playhead from './Playhead'

const PIXELS_PER_MEASURE = 120
const TRACK_HEIGHT = 60
const NUM_MEASURES = 16
const LABEL_WIDTH = 110

export default function Timeline({ clips, onClipUpdate, onClipOpen, isPlaying, bpm }) {
  const bodyHeight = Math.max(200, clips.length * (TRACK_HEIGHT + 8))

  return (
    <div className="timeline">

      {/* Header: label spacer + measure numbers */}
      <div className="timeline-header">
        <div className="tl-label-spacer" style={{ width: LABEL_WIDTH }} />
        {Array.from({ length: NUM_MEASURES }, (_, i) => (
          <div key={i} className="measure-marker" style={{ width: PIXELS_PER_MEASURE }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* Body: label column + clip grid side by side */}
      <div className="timeline-body-row" style={{ height: bodyHeight }}>

        {/* Sticky track labels */}
        <div className="tl-labels" style={{ width: LABEL_WIDTH, height: bodyHeight }}>
          {clips.map((clip, i) => (
            <div
              key={clip.id}
              className="tl-label"
              style={{ height: TRACK_HEIGHT, top: i * (TRACK_HEIGHT + 8) }}
            >
              <span className="tl-label-text">{clip.label}</span>
            </div>
          ))}
        </div>

        {/* Clip grid */}
        <div className="timeline-body" style={{ width: NUM_MEASURES * PIXELS_PER_MEASURE, height: bodyHeight }}>
          <Playhead isPlaying={isPlaying} bpm={bpm} />
          {clips.length === 0 ? (
            <div className="timeline-empty">Write code and click Run to generate clips</div>
          ) : (
            clips.map((clip, i) => (
              <div
                key={clip.id}
                className="track-row"
                style={{ height: TRACK_HEIGHT, top: i * (TRACK_HEIGHT + 8) }}
              >
                <Clip clip={clip} clipIndex={i} onUpdate={onClipUpdate} onOpen={onClipOpen} />
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
