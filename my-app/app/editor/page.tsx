'use client'
import Link from 'next/link'
import Tiptap from '../components/Tiptap'
import { useEffect, useState, FormEvent } from 'react'

type HTMLContent = string

type EditorProps = { //if editor is opened from drive browser, populate content and filename
    driveContent?: string
    driveName?: string
    driveEditors?: string
    driveIsPublic?: boolean
}

export default function Editor({ driveContent, driveName, driveEditors, driveIsPublic }: EditorProps) {
    const [jwt, setJwt] = useState<string | null>(null)
    const [content, setContent] = useState<string>(driveContent ?? '<p>Text Content here...</p>')
    const [docName, setDocName] = useState<string>(driveName ?? '')
    const [editors, setEditors] = useState<string>(driveEditors ?? '"john1, john2, john3" : ')
    const [isPublic, setIsPublic] = useState<boolean>(driveIsPublic ?? false)

    const [isLocked, setIsLocked] = useState<boolean | null>(null)
    const [lockOwner, setLockOwner] = useState<string | null>(null)
    const [documentId, setDocumentId] = useState<string | null>(null)


    useEffect(() => {
        if (localStorage.getItem("token")) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setJwt(localStorage.getItem("token"))
        }
    }, [jwt])

    // If we were navigated here with editor content in sessionStorage, use it
    useEffect(() => {
        try {
            const fromSession = sessionStorage.getItem('editorContent')
            const fromName = sessionStorage.getItem('editorName')
            const fromId = sessionStorage.getItem('editorId')
            //TODO add editors and public tickbox placeholder toggles

            if (fromId) setDocumentId(fromId)



            if (fromSession) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setContent(() => fromSession)
                setDocName(() => fromName ?? "")
                sessionStorage.removeItem('editorContent')
                sessionStorage.removeItem('editorName')
                // check lock status if we have an id
                if (fromId) {
                    ; (async () => {
                        try {
                            const token = localStorage.getItem('token')
                            const resp = await fetch(`http://localhost:3001/api/documents/${fromId}/lock`, {
                                method: 'GET',
                                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                            })
                            if (resp.ok) {
                                const js = await resp.json()
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
        } catch (e) {
            /* ignore if sessionStorage not available */
        }
    }, [])




    //user copyable viewonly link
    const [viewLink, setViewLink] = useState<string>("")

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        try {
            if (!content) {
                console.error('No text')
                alert("Please input text")
                return
            }
            if (!jwt) {
                console.error('No token available')
                return
            }
            const formData = new FormData()
            formData.append('editors', editors)
            formData.append('isPublic', isPublic.toString())
            formData.append('content', content)
            formData.append('name', docName)

            if (documentId) {
                formData.append('documentId', documentId)
            } // send database id back to backend for checking if item already exists in db 

            const response = await fetch("http://localhost:3001/api/upload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${jwt}`
                },
                body: formData
            })

            if (response.ok) {
                console.log('File uploaded successfully')
                alert('File uploaded successfully!')
                const data = await response.json()
                setViewLink(data.readOnlyLink)



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
                    {!jwt ? (
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

                        </div>
                    </div>
                    )}
                </>
            </div >
        </div >
    </div >)
}