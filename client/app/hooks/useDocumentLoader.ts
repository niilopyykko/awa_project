import { useEffect, useState } from 'react'
import { IUser } from '../types'

interface DocumentData {
  content: string
  docName: string
  editors: string
  commenter: string
  viewer: string
  isPublic: boolean
  documentId: string | null
  lockStatus: { isLocked: boolean; lockedBy: string } | null
}

export function useDocumentLoader(initialData?: Partial<DocumentData>) {
  const [data, setData] = useState<DocumentData>({
    content: initialData?.content ?? '<p>Text Content here...</p>',
    docName: initialData?.docName ?? '',
    editors: initialData?.editors ?? '',
    commenter: initialData?.commenter ?? '',
    viewer: initialData?.viewer ?? '',
    isPublic: initialData?.isPublic ?? false,
    documentId: initialData?.documentId ?? null,
    lockStatus: null
  })

  useEffect(() => {
    try {
      const fromSession = sessionStorage.getItem('editorContent')
      const fromName = sessionStorage.getItem('editorName')
      const fromId = sessionStorage.getItem('editorId')
      const fromEditors = sessionStorage.getItem('editorEditors')
      const fromCommenter = sessionStorage.getItem('editorCommenter')
      const fromViewer = sessionStorage.getItem('editorViewer')
      const fromIsPublic = sessionStorage.getItem('editorIsPublic')

      if (fromSession) {
        setData({
          content: fromSession,
          docName: fromName ?? '',
          editors: fromEditors ?? '',
          commenter: fromCommenter ?? '',
          viewer: fromViewer ?? '',
          isPublic: fromIsPublic === 'true',
          documentId: fromId,
          lockStatus: null
        })

        // Clean up sessionStorage
        sessionStorage.removeItem('editorContent')
        sessionStorage.removeItem('editorName')
        sessionStorage.removeItem('editorEditors')
        sessionStorage.removeItem('editorCommenter')
        sessionStorage.removeItem('editorViewer')
        sessionStorage.removeItem('editorIsPublic')

        // Check lock status if we have an id
        if (fromId) {
          ;(async () => {
            try {
              const response = await fetch(`/api/proxy/documents/${fromId}/lock`, {
                method: 'GET'
              })
              if (response.ok) {
                const js = await response.json()
                setData(prev => ({
                  ...prev,
                  lockStatus: js.locked ? {
                    isLocked: true,
                    lockedBy: js.lockedBy?.username ?? 'another user'
                  } : null
                }))
              }
            } catch (err) {
              console.error('Could not fetch lock status', err)
            } finally {
              sessionStorage.removeItem('editorId')
            }
          })()
        }
      } else if (initialData?.documentId) {
        // If editing an existing document, fetch its data
        (async () => {
          try {
            const response = await fetch(`/api/proxy/documents/${initialData.documentId}`)
            if (response.ok) {
              const js = await response.json()
              const doc = js.document
              setData(prev => ({
                ...prev,
                content: doc.content ?? '',
                docName: doc.name ?? '',
                editors: Array.isArray(doc.editors)
                  ? (doc.editors as IUser[]).map((e) => e.username).join(', ')
                  : '',
                commenter: '', // Set if available
                viewer: '', // Set if available
                isPublic: !!doc.isVisibleNonAuth,
                documentId: doc._id ?? initialData.documentId,
              }))
            }
          } catch (err) {
            console.error('Could not fetch document data', err)
          }
        })()
      }
    } catch {
      /* ignore if sessionStorage not available */
    }
  }, [initialData?.documentId])


  useEffect(() => {
    if (initialData) {
      setData(prev => {
        let changed = false;
        const updated: any = { ...prev };
        for (const key of Object.keys(initialData) as (keyof DocumentData)[]) {
          if (
            initialData[key] !== undefined &&
            (prev[key] === undefined || prev[key] === null)
          ) {
            updated[key] = initialData[key];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }
  }, [initialData]);


  return data
}
