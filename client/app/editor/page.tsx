'use client'
import Link from 'next/link'
import Tiptap from '../components/Tiptap'
import { useState, FormEvent, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDocumentLock } from '../hooks/useDocumentLock'
import { useAutosave } from '../hooks/useAutosave'
import { useDocumentLoader } from '../hooks/useDocumentLoader'
import { IoCheckmarkCircle, IoLockClosed } from 'react-icons/io5'

type HTMLContent = string

type EditorProps = {
    driveContent?: string
    driveName?: string
    driveEditors?: string
    driveCommenter?: string
    driveViewer?: string
    driveIsPublic?: string
}

export default function Editor({ driveContent, driveName, driveEditors, driveCommenter, driveViewer }: EditorProps) {
    const { user, logout } = useAuth()

    // Load initial data from sessionStorage or props
    const loadedData = useDocumentLoader({
        content: driveContent,
        docName: driveName,
        editors: driveEditors,
        commenter: driveCommenter,
        viewer: driveViewer
    })

    const [content, setContent] = useState<string>(loadedData.content)
    const [docName, setDocName] = useState<string>(loadedData.docName)
    const [editors, setEditors] = useState<string>(loadedData.editors)
    const [commenter, setCommenter] = useState<string>(loadedData.commenter)
    const [viewer, setViewer] = useState<string>(loadedData.viewer)
    const [isPublic, setIsPublic] = useState<boolean>(loadedData.isPublic)
    const documentId = loadedData.documentId
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    // Use custom hooks for lock management and autosave
    const { isLocked, lockOwner, releaseLock } = useDocumentLock(documentId, user ?? undefined)
    const autosaveTimeout = useRef<NodeJS.Timeout | null>(null)
    const { draftSaved } = useAutosave({
        content,
        docName,
        editors,
        commenter,
        viewer,
        isPublic,
        documentId
    })

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
            }

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
                    body = null
                }

                // Release lock after save
                const idToUnlock = body?.document?._id ?? documentId
                if (idToUnlock) {
                    await releaseLock()
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
        } catch (error) {
            console.error('Upload failed:', error)
        }
    }

    useEffect(() => {
        setContent(loadedData.content)
        setDocName(loadedData.docName)
        setEditors(loadedData.editors)
        setCommenter(loadedData.commenter)
        setViewer(loadedData.viewer)
        setIsPublic(loadedData.isPublic)
    }, [loadedData])

    // Autosave for lock owner (edit mode)
    useEffect(() => {
        // Only autosave if we own the lock and have a documentId
        const isEditor = isLocked === false && documentId && user && (lockOwner === null || lockOwner === user)
        if (!isEditor) {
            if (autosaveTimeout.current) {
                clearTimeout(autosaveTimeout.current)
                autosaveTimeout.current = null
            }
            return
        }
        // Debounce autosave: save 2s after last change
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current)
        autosaveTimeout.current = setTimeout(async () => {
            try {
                const formData = new FormData()
                formData.append('editors', editors)
                formData.append('viewers', viewer)
                formData.append('commenter', commenter)
                formData.append('isPublic', isPublic.toString())
                formData.append('content', content)
                formData.append('name', docName)
                formData.append('documentId', documentId)
                await fetch('/api/proxy/upload', {
                    method: 'POST',
                    body: formData
                })
            } catch (err) {
                // ignore
            }
        }, 2000)
        return () => {
            if (autosaveTimeout.current) {
                clearTimeout(autosaveTimeout.current)
                autosaveTimeout.current = null
            }
        }
    }, [content, docName, editors, commenter, viewer, isPublic, documentId, isLocked, lockOwner, user])

    // Poll for live updates if viewing (not editing)
    useEffect(() => {
        // Only poll if locked and not the lock owner
        const isViewer = isLocked === true && lockOwner && lockOwner !== user && documentId
        if (!isViewer) {
            if (pollingRef.current) {
                clearInterval(pollingRef.current)
                pollingRef.current = null
            }
            return
        }
        pollingRef.current = setInterval(async () => {
            try {
                const resp = await fetch(`/api/proxy/documents/${documentId}`)
                if (resp.ok) {
                    const js = await resp.json()
                    const doc = js.document || {}
                    const newContent = doc.content ?? ''
                    setContent(prev => prev !== newContent ? newContent : prev)
                    setDocName(prev => prev !== (doc.name ?? '') ? (doc.name ?? '') : prev)
                    const editorsStr = Array.isArray(doc.editors)
                        ? doc.editors.map((e: any) => e.username).join(', ')
                        : ''
                    setEditors(editorsStr)
                    setCommenter(prev => prev !== (doc.commenter ?? '') ? (doc.commenter ?? '') : prev)
                    setViewer(prev => prev !== (doc.viewer ?? '') ? (doc.viewer ?? '') : prev)
                    setIsPublic(!!doc.isVisibleNonAuth)
                }
            } catch (err) {
                // ignore
            }
        }, 2000)
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current)
                pollingRef.current = null
            }
        }
    }, [isLocked, lockOwner, user, documentId])

    // Determine if current user is a viewer (not lock owner)
    const isViewer = isLocked === true && lockOwner && lockOwner !== user

    return (<div className="p-4 sm:p-8">

        <div className="max-w-4xl mx-auto">
            <div className="mb-8 shadow-2xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <>
                    {!user ? (
                        <div className='flex flex-col bg-linear-to-br from-purple-400 to-pink-400 dark:from-purple-600 dark:to-pink-600 rounded-lg shadow-md text-center p-6'>
                            <p className="text-white text-xl sm:text-2xl font-semibold mb-4">Please login to access the editor</p>
                            <Link href="/login" className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-text-purple font-medium py-2 px-6 rounded-lg shadow transition-colors">Log in</Link>
                        </div>
                    ) : (<div className='flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md'>
                        <div className='bg-linear-to-r from-purple-500 to-pink-500 dark:from-purple-700 dark:to-pink-700 text-center p-4 shadow-md'>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-md">Text Editor</h1>
                            <p className="text-purple-50 text-sm drop-shadow">Create and collaborate on documents</p>
                        </div>
                        <div className='bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-3 text-sm shadow-sm'>
                            <div className='flex flex-wrap gap-3 items-center'>
                                <span className='font-medium text-gray-700 dark:text-gray-300'>Shortcuts:</span>
                                <span className='text-gray-600 dark:text-gray-300'><span className='font-semibold text-text-purple'>Ctrl+B</span> Bold</span>
                                <span className='text-gray-600 dark:text-gray-300'><span className='font-semibold text-text-purple'>Ctrl+I</span> Italic</span>
                                <span className='text-gray-600 dark:text-gray-300'><span className='font-semibold text-text-purple'>Ctrl+U</span> Underline</span>
                                <Link href="/shortcuts" className='text-text-purple hover:underline font-medium'>View all</Link>
                            </div>
                        </div>
                        <div className='p-4 sm:p-6 bg-white dark:bg-gray-800'>

                            <form onSubmit={handleSubmit} className='space-y-4'>
                                <div className="mb-6">
                                    <label htmlFor="title" className='block text-base font-medium mb-1 text-gray-700 dark:text-gray-300'>Document Name</label>
                                    <input
                                        type="text"
                                        id="title"
                                        placeholder={docName || "Document name"}
                                        value={docName}
                                        onChange={(e) => setDocName(e.target.value)}
                                        className="border border-border bg-bg-input text-text p-1 rounded-md w-full focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent transition-shadow"
                                        disabled={!!isViewer}
                                    />
                                </div>
                                <Tiptap
                                    content={content}
                                    onChange={(html: HTMLContent) => setContent(html)}
                                    editable={!(isLocked === true && lockOwner && lockOwner !== user)}
                                />
                                <div className='space-y-3 mt-6'>
                                    <div >
                                        <label
                                            htmlFor="viewers"
                                            className="block mb-1 text-base font-medium text-gray-700 dark:text-gray-300">
                                            Viewers
                                        </label>
                                        <input
                                            type="text"
                                            id="viewers"
                                            name="viewers"
                                            placeholder={viewer || "WIP, does not do anything"}
                                            className="bg-bg-input border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
                                            value={viewer}
                                            onChange={(e) => setViewer(e.target.value)}
                                            disabled={!!isViewer}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="commenter"
                                            className="block mb-1 text-base font-medium text-gray-700 dark:text-gray-300">
                                            Commenter
                                        </label>
                                        <input
                                            type="text"
                                            id="commenter"
                                            name="commenter"
                                            placeholder={commenter || "WIP, does not do anything"}
                                            className="bg-bg-input border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
                                            value={commenter}
                                            onChange={(e) => setCommenter(e.target.value)}
                                            disabled={!!isViewer}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="editors"
                                            className="block mb-1 text-base font-medium text-gray-700 dark:text-gray-300">
                                            Editors (comma seperated)
                                        </label>
                                        <input
                                            type="text"
                                            id="editors"
                                            name="editors"
                                            placeholder={editors || "John1, John2, John3..."}
                                            className="bg-bg-input border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
                                            value={editors}
                                            onChange={(e) => setEditors(e.target.value)}
                                            disabled={!!isViewer}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        name="isPublic"
                                        className="w-5 h-5 border-2 border-purple-400 dark:border-purple-500 rounded accent-purple-600 cursor-pointer"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        disabled={!!isViewer}
                                    />
                                    <label htmlFor="isPublic" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer select-none">Make document public</label>
                                </div>
                                <div className='flex items-center gap-3'>
                                    <button
                                        type="submit"
                                        disabled={isLocked === true}
                                        className='bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        Save Document
                                    </button>
                                    {draftSaved && (
                                        <span className='flex items-center gap-1 text-sm text-text-green font-medium'>
                                            <IoCheckmarkCircle className='text-base' /> Draft saved
                                        </span>
                                    )}
                                </div>
                            </form>
                            {isLocked && (
                                <div className='mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 rounded'>
                                    <p className="flex items-center gap-2 text-sm text-text-yellow font-medium">
                                        <IoLockClosed className='text-base' />
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