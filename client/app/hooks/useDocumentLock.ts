import { useEffect, useRef, useState } from 'react'

export function useDocumentLock(documentId: string | null, userId: string | undefined) {
  const [isLocked, setIsLocked] = useState<boolean | null>(null)
  const [lockOwner, setLockOwner] = useState<string | null>(null)
  const weOwnLock = useRef<boolean>(false)
  const renewInterval = useRef<number | null>(null)
  const pollInterval = useRef<number | null>(null)

  // Acquire lock when we have a documentId and user
  useEffect(() => {
    if (!documentId || !userId) return

    const acquireLock = async () => {
      try {
        const resp = await fetch(`/api/proxy/documents/${documentId}/lock`, {
          method: 'POST'
        })

        if (resp.status === 409) {
          const js = await resp.json()
          setIsLocked(true)
          setLockOwner(js.lockedBy?.username ?? 'another user')
          weOwnLock.current = false
          return
        }

        if (resp.ok) {
          weOwnLock.current = true
          setIsLocked(false)
          setLockOwner(null)

          // Start renew interval (every 1min)
          renewInterval.current = window.setInterval(async () => {
            try {
              await fetch(`/api/proxy/documents/${documentId}/renewLock`, {
                method: 'POST'
              })
            } catch (err) {
              console.error('Failed to renew lock', err)
            }
          }, 60 * 1000) as number
        }
      } catch (err) {
        console.error('Failed to acquire lock', err)
      }
    }

    acquireLock()

    const beforeUnload = async () => {
      if (!weOwnLock.current || !documentId) return
      try {
        await fetch(`/api/proxy/documents/${documentId}/unlock`, {
          method: 'POST'
        })
      } catch {
        // ignore
      }
    }

    window.addEventListener('beforeunload', beforeUnload)

    return () => {
      if (renewInterval.current) {
        clearInterval(renewInterval.current)
        renewInterval.current = null
      }
      window.removeEventListener('beforeunload', beforeUnload)

      // Best-effort unlock when component unmounts
      ;(async () => {
        if (weOwnLock.current && documentId) {
          try {
            await fetch(`/api/proxy/documents/${documentId}/unlock`, {
              method: 'POST'
            })
          } catch (err) {
            console.error('Failed to unlock on unmount', err)
          }
        }
      })()
    }
  }, [documentId, userId])

  // Poll lock status when someone else holds the lock
  useEffect(() => {
    if (!documentId) return

    if (isLocked === true) {
      if (pollInterval.current) return

      pollInterval.current = window.setInterval(async () => {
        try {
          const resp = await fetch(`/api/proxy/documents/${documentId}/lock`, {
            method: 'GET'
          })
          
          if (resp.ok) {
            const js = await resp.json()
            if (!js.locked) {
              // Lock released - try to acquire it
              try {
                const lockResp = await fetch(`/api/proxy/documents/${documentId}/lock`, {
                  method: 'POST'
                })
                
                if (lockResp.status === 409) {
                  const js2 = await lockResp.json()
                  setIsLocked(true)
                  setLockOwner(js2.lockedBy?.username ?? 'another user')
                  weOwnLock.current = false
                } else if (lockResp.ok) {
                  weOwnLock.current = true
                  setIsLocked(false)
                  setLockOwner(null)

                  // Start renew interval
                  if (renewInterval.current) {
                    clearInterval(renewInterval.current)
                  }
                  renewInterval.current = window.setInterval(async () => {
                    try {
                      await fetch(`/api/proxy/documents/${documentId}/renewLock`, {
                        method: 'POST'
                      })
                    } catch (err) {
                      console.error('Failed to renew lock', err)
                    }
                  }, 60 * 1000) as number
                }
              } catch (err) {
                console.error('Failed to acquire lock after release', err)
              }
            } else {
              setIsLocked(true)
              setLockOwner(js.lockedBy?.username ?? 'another user')
            }
          }
        } catch (err) {
          console.error('Lock poll failed', err)
        }
      }, 5000) as number
    } else {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
        pollInterval.current = null
      }
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
        pollInterval.current = null
      }
    }
  }, [isLocked, documentId])

  const releaseLock = async () => {
    if (!weOwnLock.current || !documentId) return
    
    try {
      await fetch(`/api/proxy/documents/${documentId}/unlock`, {
        method: 'POST'
      })
      weOwnLock.current = false
      if (renewInterval.current) {
        clearInterval(renewInterval.current)
        renewInterval.current = null
      }
    } catch (err) {
      console.error('Failed to release lock', err)
    }
  }

  return {
    isLocked,
    lockOwner,
    releaseLock
  }
}
