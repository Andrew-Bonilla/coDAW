import { useEffect, useRef, useState } from 'react'

const PIXELS_PER_MEASURE = 120
const NUM_MEASURES = 16
const MAX_X = NUM_MEASURES * PIXELS_PER_MEASURE

export default function Playhead({ isPlaying, bpm }) {
  const [x, setX] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!isPlaying) {
      setX(0)
      return
    }

    const startTime = performance.now()
    const secondsPerMeasure = (60 / bpm) * 4

    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000
      setX(Math.min((elapsed / secondsPerMeasure) * PIXELS_PER_MEASURE, MAX_X))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, bpm])

  return <div className="playhead" style={{ left: x }} />
}
