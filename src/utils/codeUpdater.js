function findMatchingChar(code, openIdx, openChar, closeChar) {
  let depth = 0
  for (let i = openIdx; i < code.length; i++) {
    if (code[i] === openChar) depth++
    else if (code[i] === closeChar) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function findNthPlayCall(code, clipIndex) {
  let count = 0, searchPos = 0
  while (true) {
    const playIdx = code.indexOf('play(', searchPos)
    if (playIdx === -1) return null
    if (count === clipIndex) {
      const openParen = playIdx + 4
      const closeParen = findMatchingChar(code, openParen, '(', ')')
      return { playIdx, openParen, closeParen }
    }
    count++
    searchPos = playIdx + 1
  }
}

// Replace the events array (2nd arg) of the nth play() call
export function updateClipEventsInCode(code, clipIndex, events) {
  const call = findNthPlayCall(code, clipIndex)
  if (!call) return code
  const { openParen, closeParen } = call

  // Find the 2nd argument boundaries (between 1st and 2nd top-level comma)
  let commas = 0, depth = 0, arg2Start = -1, arg2End = -1
  for (let i = openParen + 1; i < closeParen; i++) {
    const ch = code[i]
    if ('([{'.includes(ch)) depth++
    else if (')]}'.includes(ch)) depth--
    else if (ch === ',' && depth === 0) {
      commas++
      if (commas === 1) arg2Start = i + 1
      else if (commas === 2) { arg2End = i; break }
    }
  }
  if (arg2Start === -1) return code
  if (arg2End === -1) arg2End = closeParen

  const serialized = serializeEvents(events)
  return code.slice(0, arg2Start) + ' ' + serialized + code.slice(arg2End)
}

// Merge events that share the same time AND duration into chord notation
// (e.g. three events at time=0/dur=2n with notes A4, C5, E5 → 'A4+C5+E5').
// Preserves the relative order each pitch appears in the input.
function mergeChords(events) {
  const groups = new Map()
  const order  = []
  for (const e of events) {
    const key = `${e.time}|${e.duration}`
    if (!groups.has(key)) { groups.set(key, []); order.push(key) }
    groups.get(key).push(e)
  }
  return order.map(key => {
    const group = groups.get(key)
    if (group.length === 1) return group[0]
    return { ...group[0], note: group.map(g => g.note).join('+') }
  })
}

function serializeEvents(events) {
  if (!events.length) return '[]'
  const merged = mergeChords(events)
  const lines = merged.map(e =>
    `    { note: '${e.note}', time: ${e.time}, duration: '${e.duration}' }`
  )
  return `[\n${lines.join(',\n')}\n  ]`
}

export function updateStartInCode(code, clipIndex, newStart) {
  let count = 0
  let searchPos = 0

  while (true) {
    const playIdx = code.indexOf('play(', searchPos)
    if (playIdx === -1) return code

    if (count === clipIndex) {
      const openParen = playIdx + 4
      const closeParen = findMatchingChar(code, openParen, '(', ')')

      // Find the 3rd argument (options object) by counting top-level commas
      let commas = 0
      let depth = 0
      let optionsStart = -1

      for (let i = openParen + 1; i < closeParen; i++) {
        const ch = code[i]
        if (ch === '(' || ch === '{' || ch === '[') depth++
        else if (ch === ')' || ch === '}' || ch === ']') depth--
        else if (ch === ',' && depth === 0) {
          commas++
          if (commas === 2) {
            optionsStart = code.indexOf('{', i)
            break
          }
        }
      }

      if (optionsStart === -1 || optionsStart > closeParen) return code

      const optionsEnd = findMatchingChar(code, optionsStart, '{', '}')
      const optionsStr = code.slice(optionsStart, optionsEnd + 1)

      const newOptionsStr = /\bstart\s*:/.test(optionsStr)
        ? optionsStr.replace(/\bstart\s*:\s*\d+/, `start: ${newStart}`)
        : optionsStr.replace(/^\{/, `{ start: ${newStart},`)

      return code.slice(0, optionsStart) + newOptionsStr + code.slice(optionsEnd + 1)
    }

    count++
    searchPos = playIdx + 1
  }
}
