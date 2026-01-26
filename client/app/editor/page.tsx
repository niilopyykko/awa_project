'use client'
import Link from 'next/link'
import Tiptap from '../components/Tiptap'
import { useEffect, useState, useRef, FormEvent } from 'react'
import useDocuments from '../hooks/useDocuments'
import { useAuth } from '../context/AuthContext'


type HTMLContent = string

type EditorProps = { //if editor is opened from drive browser, populate content and filename
    driveContent?: string
    driveName?: string
    driveEditors?: string
    driveCommenter?: string
    driveViewer?: string
    driveIsPublic?: string
}

export default function Editor({ driveContent, driveName, driveEditors, driveCommenter, driveViewer }: EditorProps) {
    const { user } = useDocuments();
    const { logout } = useAuth();
    const [content, setContent] = useState<string>(driveContent ?? '<p>Text Content here...</p>')
    const [docName, setDocName] = useState<string>(driveName ?? '')
    const [editors, setEditors] = useState<string>(driveEditors ?? '')
    const [commenter, setCommenter] = useState<string>(driveCommenter ?? '')
    const [viewer, setViewer] = useState<string>(driveViewer ?? '')
    const [isPublic, setIsPublic] = useState<boolean>(false)

    const [isLocked, setIsLocked] = useState<boolean | null>(null)
    const [lockOwner, setLockOwner] = useState<string | null>(null)
    const [documentId, setDocumentId] = useState<string | null>(null)
    const weOwnLock = useRef<boolean>(false)
    const renewInterval = useRef<number | null>(null)

    const autosaveTimer = useRef<number | null>(null)
    const [draftSaved, setDraftSaved] = useState<boolean>(false)
    const lockPollInterval = useRef<number | null>(null)



    // If we were navigated here with editor content in sessionStorage, use it
    useEffect(() => {
        try {
            const fromSession = sessionStorage.getItem('editorContent')
            const fromName = sessionStorage.getItem('editorName')
            const fromId = sessionStorage.getItem('editorId')
            const fromEditors = sessionStorage.getItem('editorEditors')
            const fromCommenter = sessionStorage.getItem('editorCommenter')
            const fromviewer = sessionStorage.getItem('editorViewer')
            const fromIsPublic = sessionStorage.getItem('editorIsPublic')

            if (fromIsPublic !== null) {
                setIsPublic(fromIsPublic === 'true')
            }

            if (fromId) setDocumentId(fromId)



            if (fromSession) {
                setContent(fromSession)
                setDocName(fromName ?? "")
                setEditors(fromEditors ?? "")
                setCommenter(fromCommenter ?? "")
                setViewer(fromviewer ?? "")

                // fromIsPublic already handled above (converted to boolean)

                sessionStorage.removeItem('editorContent')
                sessionStorage.removeItem('editorName')
                sessionStorage.removeItem('editorEditors')
                sessionStorage.removeItem('editorCommenter')
                sessionStorage.removeItem('editorViewer')
                sessionStorage.removeItem('editorIsPublic')
                // check lock status if we have an id
                if (fromId) {
                    ; (async () => {
                        try {
                            const response = await fetch(`/api/proxy/documents/${fromId}/lock`, {
                                method: 'GET'
                            })
                            if (response.ok) {
                                const js = await response.json()
                                if (js.locked) {
                                    setIsLocked(true)
                                    setLockOwner(js.lockedBy?.username ?? 'another user')
                                } else {
                                    setIsLocked(false)
                                    setLockOwner(null)
                                }
                            }
                        } catch (err) {
                            console.error('Could not fetch lock status', err)
                        } finally {
                            sessionStorage.removeItem('editorId')
                        }
                    })()
                }
            }
        } catch {
            /* ignore if sessionStorage not available */
        }
    }, [])

    // Autosave editor fields to sessionStorage
    useEffect(() => {
        if (autosaveTimer.current) {
            clearTimeout(autosaveTimer.current)
        }

        autosaveTimer.current = window.setTimeout(() => {
            try {
                sessionStorage.setItem('editorContent', content)
                sessionStorage.setItem('editorName', docName)
                if (documentId) sessionStorage.setItem('editorId', documentId)
                sessionStorage.setItem('editorEditors', editors)
                sessionStorage.setItem('editorCommenter', commenter)
                sessionStorage.setItem('editorViewer', viewer)
                sessionStorage.setItem('editorIsPublic', String(isPublic))
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
        // watch the fields we want persisted
    }, [content, docName, editors, commenter, viewer, isPublic, documentId])

    // Poll lock status periodically when someone else holds the lock
    useEffect(() => {
        if (!documentId) return

        // start polling only when locked by someone else
        if (isLocked === true) {
            if (lockPollInterval.current) return
            lockPollInterval.current = window.setInterval(async () => {
                try {
                    const resp = await fetch(`/api/proxy/documents/${documentId}/lock`, {
                        method: 'GET'
                    })
                    if (resp.ok) {
                        // CHECK IF DOCUMENT HAS HAD CHANGES DURING WAIT

                        const js = await resp.json()
                        if (!js.locked) {
                            // lock released — fetch latest document and compare
                            try {
                                const dresp = await fetch(`/api/proxy/documents/${documentId}`, {
                                    method: 'GET'
                                })
                                if (dresp.ok) {
                                    const djson = await dresp.json()
                                    const remoteContent = djson.document?.content ?? ''
                                    const remoteName = djson.document?.name ?? ''

                                    if (remoteContent !== content) {
                                        const load = window.confirm('The document changed on the server while you were waiting. Load remote version? (Cancel to keep your draft)')
                                        if (load) {
                                            setContent(remoteContent)
                                            setDocName(remoteName)
                                            try { sessionStorage.removeItem('editorContent') } catch { }
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error('Failed to fetch latest document after lock release', err)
                            }

                            // Try to acquire the lock now that it's released
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

                                    // start renew interval
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
                                    }, 5 * 60 * 1000) as number
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
            if (lockPollInterval.current) {
                clearInterval(lockPollInterval.current)
                lockPollInterval.current = null
            }
        }

        return () => {
            if (lockPollInterval.current) {
                clearInterval(lockPollInterval.current)
                lockPollInterval.current = null
            }
        }
    }, [isLocked, documentId, content])


    // Acquire lock when we have a documentId and token. Keep it alive and release on unload.
    useEffect(() => {
        if (!documentId || !user) return

            ; (async () => {
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
                        // we own the lock now  
                        weOwnLock.current = true
                        setIsLocked(false)
                        setLockOwner(null)

                        // start renew interval (every 5min)
                        renewInterval.current = window.setInterval(async () => {
                            try {
                                await fetch(`/api/proxy/documents/${documentId}/renewLock`, {
                                    method: 'POST'
                                })
                            } catch (err) {
                                console.error('Failed to renew lock', err)
                            }
                        }, 5 * 60 * 1000) as number
                    }
                } catch (err) {
                    console.error('Failed to acquire lock', err)
                }
            })()

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

                // best-effort unlock when component unmounts
                ; (async () => {
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
    }, [documentId, user])






    // user copyable viewonly link (not shown yet)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        try {
            if (!content) {
                console.error('No text')
                alert("Please input text")
                return
            }
            if (!user) {
                console.error('No user available')
                return
            }
            const formData = new FormData()
            formData.append('editors', editors)
            formData.append('viewers', viewer)
            formData.append('commenter', commenter)
            formData.append('isPublic', isPublic.toString())
            formData.append('content', content)
            formData.append('name', docName)

            if (documentId) {
                formData.append('documentId', documentId)
            } // send database id back to backend for checking if item already exists in db 

            const response = await fetch('/api/proxy/upload', {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                console.log('File uploaded successfully')
                alert('File uploaded successfully!')
                let body = null
                try {
                    body = await response.json()
                } catch {
                    // backend returned non-JSON (e.g. text/HTML) even on OK — tolerate it
                    body = null
                }

                // If we were editing an existing document, release the lock after save
                try {
                    const idToUnlock = body?.document?._id ?? documentId
                    if (idToUnlock) {
                        await fetch(`/api/proxy/documents/${idToUnlock}/unlock`, {
                            method: 'POST'
                        })
                        weOwnLock.current = false
                        if (renewInterval.current) {
                            clearInterval(renewInterval.current)
                            renewInterval.current = null
                        }
                    }
                } catch (err) {
                    console.error('Failed to unlock after save', err)
                }

            } else {
                let errorBody = null
                try {
                    errorBody = await response.json()
                } catch {
                    try {
                        errorBody = await response.text()
                    } catch {
                        errorBody = null
                    }
                }
                console.error('Upload failed:', errorBody)
                const msg = typeof errorBody === 'string' ? errorBody : errorBody?.message
                if (msg && msg.toLowerCase().includes('access denied')) {
                    alert('Your session has expired. Please log in again.')
                    logout()
                    window.location.href = '/login'
                }
            }
        }
        catch (error) {
            console.error('Upload failed:', error)
        }
    }

    return (<div className="p-4 sm:p-8">

        <div className="max-w-4xl mx-auto">
            <div className="mb-8 shadow-lg rounded-lg overflow-hidden">
                <>
                    {!user ? (
                        <div className='flex flex-col bg-linear-to-br from-purple-400 to-pink-400 dark:from-purple-600 dark:to-pink-600 rounded-lg shadow-md text-center p-6'>
                            <p className="text-white text-xl sm:text-2xl font-semibold mb-4">Please login to access the editor</p>
                            <Link href="/login" className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-text-purple font-medium py-2 px-6 rounded-lg shadow transition-colors">Log in</Link>
                        </div>
                    ) : (<div className='flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md'>
                        <div className='bg-linear-to-r from-purple-500 to-pink-500 dark:from-purple-700 dark:to-pink-700 text-center p-4'>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Text Editor</h1>
                            <p className="text-purple-100 text-sm">Create and collaborate on documents</p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-3 text-sm'>
                            <div className='flex flex-wrap gap-3 items-center text-text-muted'>
                                <span className='font-medium text-text-muted'>Shortcuts:</span>
                                <span><span className='font-semibold text-text-purple'>Ctrl+B</span> Bold</span>
                                <span><span className='font-semibold text-text-purple'>Ctrl+I</span> Italic</span>
                                <span><span className='font-semibold text-text-purple'>Ctrl+U</span> Underline</span>
                                <Link href="/shortcuts" className='text-text-purple hover:underline font-medium'>View all</Link>
                            </div>
                        </div>
                        <div className='p-4 sm:p-6'>

                            <form onSubmit={handleSubmit} className='space-y-4'>
                                <div className="mb-6">
                                    <label htmlFor="title" className='block text-base font-medium text-text mb-1 text-text-muted'>Document Name</label>
                                    <input
                                        type="text"
                                        id="title"
                                        placeholder={docName || "Document name"}
                                        value={docName}
                                        onChange={(e) => setDocName(e.target.value)}
                                        className="border border-border bg-bg-input text-text p-1 rounded-md w-full focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent transition-shadow"
                                    />
                                </div>
                                <Tiptap content={content} onChange={(html: HTMLContent) => setContent(html)}  />
                                <div className='space-y-3 mt-6'>
                                    <div >
                                        <label
                                            htmlFor="viewers"
                                            className="block mb-1 text-base font-medium text-text-muted">
                                            Viewers
                                        </label>
                                        <input
                                            type="text"
                                            id="viewers"
                                            name="viewers"
                                            placeholder={viewer || "WIP, does not do anything"}
                                            className="bg-[color:var(--bg-input)] border border-[color:var(--border)] text-text-muted text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
                                            value={viewer}
                                            onChange={(e) => setViewer(e.target.value)} />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="commenter"
                                            className="block mb-1 text-base font-medium text-text-muted">
                                            Commenter
                                        </label>
                                        <input
                                            type="text"
                                            id="commenter"
                                            name="commenter"
                                            placeholder={commenter || "WIP, does not do anything"}
                                            className="bg-[color:var(--bg-input)] border border-[color:var(--border)] text-[color:var(--text)] text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
                                            value={commenter}
                                            onChange={(e) => setCommenter(e.target.value)} />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="editors"
                                            className="block mb-1 text-base font-medium text-[color:var(--text-muted)]">
                                            Editors (comma seperated)
                                        </label>
                                        <input
                                            type="text"
                                            id="editors"
                                            name="editors"
                                            placeholder={editors || "John1, John2, John3..."}
                                            className="bg-[color:var(--bg-input)] border border-[color:var(--border)] text-[color:var(--text)] text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
                                            value={editors}
                                            onChange={(e) => setEditors(e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        name="isPublic"
                                        className="w-4 h-4 border border-gray-300 dark:border-gray-600 rounded accent-purple-600"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                    />
                                    <label htmlFor="isPublic"  className="text-md font-semibold tracking-wide text-text drop-shadow-sm drop-shadow-white">Make document public</label>
                                </div>
                                <div className='flex items-center gap-3'>
                                    <button 
                                        type="submit" 
                                        disabled={isLocked === true} 
                                        className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        Save Document
                                    </button>
                                    {draftSaved && (
                                        <span className='text-sm text-[color:var(--text-green)] font-medium'>✓ Draft saved</span>
                                    )}
                                </div>
                            </form>
                            {isLocked && (
                                <div className='mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 rounded'>
                                    <p className="text-sm text-[color:var(--text-yellow)] font-medium">
                                        {lockOwner} is currently editing this document
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                </>
            </div >
        </div >
    </div >)
}