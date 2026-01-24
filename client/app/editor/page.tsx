'use client'
import Link from 'next/link'
import Tiptap from '../components/Tiptap'
import { useEffect, useState, useRef, FormEvent } from 'react'
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
    const token = useAuth().token
    const [content, setContent] = useState<string>(driveContent ?? '<p>Text Content here...</p>')
    const [docName, setDocName] = useState<string>(driveName ?? '')
    const [editors, setEditors] = useState<string>(driveEditors ?? '"john1, john2, john3" : ')
    const [commenter, setCommenter] = useState<string>(driveCommenter ?? '"john1, john2, john3" : ')
    const [viewer, setViewer] = useState<string>(driveViewer ?? '"john1, john2, john3" : ')
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
                            const response = await fetch(`http://localhost:3001/api/documents/${fromId}/lock`, {
                                method: 'GET',
                                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
    }, [token])

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
                    const resp = await fetch(`http://localhost:3001/api/documents/${documentId}/lock`, {
                        method: 'GET',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    })
                    if (resp.ok) {
                        // CHECK IF DOCUMENT HAS HAD CHANGES DURING WAIT

                        const js = await resp.json()
                        if (!js.locked) {
                            // lock released — fetch latest document and compare
                            try {
                                const dresp = await fetch(`http://localhost:3001/api/documents/${documentId}`, {
                                    method: 'GET',
                                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
                                const lockResp = await fetch(`http://localhost:3001/api/documents/${documentId}/lock`, {
                                    method: 'POST',
                                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
                                            await fetch(`http://localhost:3001/api/documents/${documentId}/renewLock`, {
                                                method: 'POST',
                                                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
    }, [isLocked, documentId, token, content])


    // Acquire lock when we have a documentId and token. Keep it alive and release on unload.
    useEffect(() => {
        if (!documentId || !token) return

            ; (async () => {
                try {
                    const resp = await fetch(`http://localhost:3001/api/documents/${documentId}/lock`, {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
                                await fetch(`http://localhost:3001/api/documents/${documentId}/renewLock`, {
                                    method: 'POST',
                                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
                await fetch(`http://localhost:3001/api/documents/${documentId}/unlock`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
                            await fetch(`http://localhost:3001/api/documents/${documentId}/unlock`, {
                                method: 'POST',
                                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                            })
                        } catch (err) {
                            console.error('Failed to unlock on unmount', err)
                        }
                    }
                })()
        }
    }, [documentId, token])






    // user copyable viewonly link (not shown yet)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        try {
            if (!content) {
                console.error('No text')
                alert("Please input text")
                return
            }
            if (!token) {
                console.error('No token available')
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

            const response = await fetch("http://localhost:3001/api/upload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            })

            if (response.ok) {
                console.log('File uploaded successfully')
                alert('File uploaded successfully!')
                const body = await response.json()

                // If we were editing an existing document, release the lock after save
                try {
                    const idToUnlock = body?.document?._id ?? documentId
                    if (idToUnlock) {
                        await fetch(`http://localhost:3001/api/documents/${idToUnlock}/unlock`, {
                            method: 'POST',
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
                const error = await response.json()
                console.error('Upload failed:', error)
                if (error.message === 'Access denied, missing token') {
                    alert('Your session has expired. Please log in again.')
                    localStorage.removeItem('token')
                    window.location.href = '/login'
                }
            }
        }
        catch (error) {
            console.error('Upload failed:', error)
        }
    }

    return (<div className="p-8">

        <div className="max-w-4xl mx-auto ">
            <div className="mb-8 shadow-md">
                <>
                    {!token ? (
                        <div className='flex flex-col bg-fuchsia-300 rounded-md text-center p-2'>
                            <p className="text-gray-600 text-2xl">Please login to see text editor</p>
                            <Link href="/login" className="bg-amber-500 border-2 p-1 m-2 border-amber-50 text-amber-900 text-lg">Log in</Link>
                        </div>
                    ) : (<div className='flex flex-col bg-fuchsia-300 rounded-md text-center p-4'>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">TextEditor</h1>
                        <p className="text-gray-600">Basic formatting tools</p>
                        <ul className='bg-gray-100 border-b border-gray-200 text-left rounded-t-md'>
                            <li>
                                <span className='px-6 py-2 text-left text-sm font-semibold text-gray-700'>BOLD</span> <span className='pl-10 py-2 text-left text-sm font-semibold text-violet-700'>= CTRL+B</span>
                            </li>
                            <li>
                                <span className='px-6 py-2 text-left text-sm font-semibold text-gray-700'>ITALIC</span> <span className='pl-9 py-2 text-left text-sm font-semibold text-violet-700'>= CTRL+I</span>
                            </li>
                            <li>
                                <span className='px-6 py-2 text-left text-sm font-semibold text-gray-700'>UNDERLINE</span> <span className=' py-2 text-left text-sm font-semibold text-violet-700'>= CTRL+U</span>
                            </li>
                            <li>
                                <span className='pl-6 py-2 text-left text-sm font-semibold text-gray-700'>MORE @ </span><Link href="/shortcuts" className=' py-2 text-left text-sm font-semibold text-gray-700 underline'>HERE</Link> <span className='bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono text-xs'>Some keybinds may not work</span>
                            </li>
                        </ul>
                        <div className='bg-blue-200 rounded-b-lg p-4'>

                            <form onSubmit={handleSubmit}>
                                <label htmlFor="title" className='text-black mt-2'>Document file name</label>
                                <input
                                    type="text"
                                    id="title"
                                    placeholder={docName}
                                    value={docName}
                                    onChange={(e) => setDocName(e.target.value)}
                                    className="border p-2 rounded w-full mb-2 text-black"
                                />
                                <Tiptap content={content} onChange={(html: HTMLContent) => setContent(html)} />
                                <div>
                                    <div className='mt-4'>
                                        <label
                                            htmlFor="viewers"
                                            className="block mb-1 text-sm font-medium text-gray-700">
                                            Viewers
                                        </label>
                                        <input
                                            type="text"
                                            id="viewers"
                                            name="viewers"
                                            placeholder={viewer}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2.5"
                                            value={viewer}
                                            onChange={(e) => setViewer(e.target.value)} />
                                    </div>
                                    <div className='mt-4'>
                                        <label
                                            htmlFor="commenter"
                                            className="block mb-1 text-sm font-medium text-gray-700">
                                            Commenter
                                        </label>
                                        <input
                                            type="text"
                                            id="commenter"
                                            name="commenter"
                                            placeholder={commenter}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2.5"
                                            value={commenter}
                                            onChange={(e) => setCommenter(e.target.value)} />
                                    </div>
                                    <div className='mt-4'>
                                        <label
                                            htmlFor="editors"
                                            className="block mb-1 text-sm font-medium text-gray-700">
                                            Editors
                                        </label>
                                        <input
                                            type="text"
                                            id="editors"
                                            name="editors"
                                            placeholder={editors}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2.5"
                                            value={editors}
                                            onChange={(e) => setEditors(e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex items-start mb-6">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            id="isPublic"
                                            name="isPublic"
                                            className="w-4 h-4 border border-gray-300 rounded accent-blue-500"
                                            checked={isPublic}
                                            onChange={(e) => setIsPublic(e.target.checked)}
                                        />
                                    </div>
                                    <label htmlFor="isPublic" className="ms-2 text-sm font-medium text-gray-900">Is public?</label>
                                </div>
                                <button type="submit" disabled={isLocked === true} className='bg-blue-500 p-2 mt-4 rounded hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed'>Save</button>
                            </form>
                            <div className='flex items-center gap-3 mt-2'>
                                <p className={`text-black p-2 ${isLocked === true ? "" : "hidden"}`}>
                                    {lockOwner} is editing the document, please wait
                                </p>
                                {draftSaved && (
                                    <span className='text-xs text-gray-600 italic'>Draft saved</span>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                </>
            </div >
        </div >
    </div >)
}