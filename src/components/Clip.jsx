import { useRef } from 'react'

const PIXELS_PER_MEASURE = 120
const DRAG_THRESHOLD = 5

export default function Clip({ clip, clipIndex, onUpdate, onOpen }) {
  const dragStart = useRef(null)
  const initialMeasure = useRef(null)
  const lastEmitted = useRef(null)

  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const startX = e.clientX
    let dragging = false

    dragStart.current = e.clientX
    initialMeasure.current = clip.startMeasure
    lastEmitted.current = clip.startMeasure

    const handleMouseMove = (e) => {
      if (!dragging && Math.abs(e.clientX - startX) > DRAG_THRESHOLD) dragging = true
      if (!dragging) return
      const delta = e.clientX - dragStart.current
      const newMeasure = Math.max(0, Math.round(initialMeasure.current + delta / PIXELS_PER_MEASURE))
      if (newMeasure !== lastEmitted.current) {
        lastEmitted.current = newMeasure
        onUpdate({ ...clip, startMeasure: newMeasure }, clipIndex)
      }
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      if (!dragging) onOpen(clip, clipIndex)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className="clip"
      style={{
        left: clip.startMeasure * PIXELS_PER_MEASURE,
        width: clip.widthMeasures * PIXELS_PER_MEASURE,
        backgroundColor: clip.color,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="clip-label">{clip.label}</div>
      <div className="clip-pattern">{clip.patternLabel}</div>
    </div>
  )
}
