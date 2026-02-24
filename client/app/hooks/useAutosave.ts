import { useEffect, useRef, useState } from 'react'

interface AutosaveData {
  content: string
  docName: string
  editors: string
  commenter: string
  viewer: string
  isPublic: boolean
  documentId: string | null
}

export function useAutosave(data: AutosaveData) {
  const [draftSaved, setDraftSaved] = useState(false)
  const autosaveTimer = useRef<number | null>(null)

  useEffect(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
    }

    autosaveTimer.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem('editorContent', data.content ?? '')
        sessionStorage.setItem('editorName', data.docName ?? '')
        if (data.documentId) sessionStorage.setItem('editorId', data.documentId)
        sessionStorage.setItem('editorEditors', data.editors ?? '')
        sessionStorage.setItem('editorCommenter', data.commenter ?? '')
        sessionStorage.setItem('editorViewer', data.viewer ?? '')
        sessionStorage.setItem('editorIsPublic', String(data.isPublic))
        setDraftSaved(true)
        window.setTimeout(() => setDraftSaved(false), 1200)
      } catch {
        // ignore
      }
    }, 1000) as number

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
        autosaveTimer.current = null
      }
    }
  }, [data.content, data.docName, data.editors, data.commenter, data.viewer, data.isPublic, data.documentId])

  return { draftSaved }
}
