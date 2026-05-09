import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

const editorTheme = EditorView.theme({
  '&': { height: '100%', background: '#0d0d14' },
  '.cm-content': { paddingTop: '12px' },
  '.cm-scroller': { overflow: 'auto', fontFamily: "'Fira Code', 'JetBrains Mono', monospace", fontSize: '13px' },
  '.cm-gutters': { background: '#111120', borderRight: '1px solid #2a2a4a' },
})

const Editor = forwardRef(({ initialCode, onChange }, ref) => {
  const containerRef = useRef(null)
  const viewRef = useRef(null)

  useImperativeHandle(ref, () => ({
    setCode(newCode) {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newCode },
      })
    },
  }))

  useEffect(() => {
    const view = new EditorView({
      doc: initialCode,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        editorTheme,
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChange(update.state.doc.toString())
        }),
      ],
      parent: containerRef.current,
    })

    viewRef.current = view
    onChange(view.state.doc.toString())
    return () => view.destroy()
  }, [])

  return <div ref={containerRef} style={{ height: '100%', overflow: 'hidden' }} />
})

export default Editor
