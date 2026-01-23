'use client'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import FileActions from "./components/FileActions";
import { IoGridOutline } from "react-icons/io5";
import { FaThList } from "react-icons/fa";
import { FaSortDown, FaSortUp } from "react-icons/fa6";


interface IUser {
  id: string
  username: string
}

interface IDocument {
  _id: string
  name: string
  owner: IUser
  createdAt: string
  filepath: string
  content: string
  editors?: IUser[] //list of users with permission to edit
  isVisibleNonAuth: boolean
  trash: boolean
}

export default function Home() {
  const [documents, setDocuments] = useState<IDocument[]>([])
  const [jwt, setJwt] = useState<string | null>(null)
  const [currentUser, setcurrentUser] = useState<string | null>(null)

  const router = useRouter()

  const [gridView, setgridView] = useState<boolean>(false)
  const toggleChange = () => {
    setgridView(!gridView);
  };
  const [showTrash, setShowTrash] = useState<boolean>(false)
  const [sortKey, setSortKey] = useState<'name' | 'created' | 'modified'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJwt(localStorage.getItem("token"))
    setcurrentUser(localStorage.getItem("user"))

  }, [])

  const getDocuments = useCallback(async (e?: { preventDefault: () => void }) => {
    if (e && e.preventDefault) e.preventDefault()

    const response = await fetch(
      jwt
        ? "http://localhost:3001/api/documents"  // auth route
        : "http://localhost:3001/api/publicDocuments",  // public route
      {
        headers: jwt
          ? {
            'Authorization': `Bearer ${jwt}`, //auth jwt we have
            'Content-Type': 'application/json'
          }
          : { 'Content-Type': 'application/json' } //no login user
      }
    );

    const data = await response.json()

    if (data && data.length > 0) {
      setDocuments(data)
      console.log(data)
    }
  }, [jwt])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getDocuments();
  }, [getDocuments])

  const sortedDocuments = [...documents].sort((a, b) => {
    let valA: string | number = 0
    let valB: string | number = 0

    switch (sortKey) {
      case 'name':
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      case 'created':
      default:
        valA = new Date(a.createdAt).getTime()
        valB = new Date(b.createdAt).getTime()
        return sortOrder === 'asc' ? valA - valB : valB - valA
    }
  })

  // Filter documents according to trash toggle: when showing trash, display only trashed items; otherwise hide trashed items
  const visibleDocuments = sortedDocuments.filter(d => showTrash ? Boolean(d.trash) : !Boolean(d.trash))
  const trashCount = documents.filter(d => Boolean(d.trash)).length

  return (
    <>
      {sortedDocuments.length == 0 ? (
        <div className="flex items-center justify-center min-h-[40vh] p-8">
          <p className="text-center p-4 text-2xl rounded-2xl bg-fuchsia-400 text-black">Drive is empty</p>
        </div>
      ) : (
        <div id="viewToggle" className="flex items-center justify-end gap-4 p-4 md:p-4 lg:p-8 text-2xl md:text-3xl">
          <div className="flex items-center gap-2">
            <label className="text-base">Sort:</label>
            <select value={sortKey} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortKey(e.target.value as 'name' | 'created' | 'modified')} className="text-base p-1 rounded-2xl bg-fuchsia-500 text-black">
              <option value="name">Name</option>
              <option value="created">Created</option>
              <option value="modified">Modified (WIP)</option>
            </select>
            <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="px-2">{sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />}</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTrash(s => !s)} className="px-2 py-1 rounded-2xl bg-red-600 text-white text-2xl">{showTrash ? `Back to Drive` : `Open Trash (${trashCount})`}</button>
            <button onClick={toggleChange}>
              {gridView ? (<FaThList />) : (<IoGridOutline />)}
            </button>
          </div>
        </div>)}
      {!gridView ? (
        <div className="p-4">
          <div className="flex flex-col gap-2">
            {visibleDocuments.map(doc => {
              const filepath = doc.filepath ?? ''
              const filename = filepath ? (filepath.split('/').pop() || filepath.split('\\').pop() || '') : ''
              const fileUrl = filename ? `http://localhost:3001/uploads/${filename}` : ''
              const ext = (filename || '').split('.').pop()?.toLowerCase() || ''
              const isImage = ['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext)
              const isGif = ext === 'gif'
              const isVideo = ['mp4', 'webm', 'ogg'].includes(ext)

              const renderPlainText = (html: string) => {
                const div = document.createElement('div')
                div.innerHTML = html
                return div.textContent || ''
              }

              return (
                <div key={doc._id} className="relative flex items-center gap-4 p-4 bg-amber-800 border-amber-200 border-2 rounded">
                  <div className="flex-1">
                    <h3 className="font-bold">{doc.name}</h3>
                    <div className="text-sm">Uploaded by: {doc.owner.username} - {new Date(doc.createdAt).toLocaleString()}</div>
                    <div className="mt-2">
                      {filename ? (
                        isVideo ? (
                          <video src={fileUrl} controls className="max-h-40" />
                        ) : isGif || isImage ? (
                          <Image src={fileUrl} alt={doc.name} width={400} height={200} unoptimized className="object-contain" />
                        ) : (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">Download</a>
                        )
                      ) : (
                        <div
                          onClick={() => {
                            if (!filename && doc.content) {
                              try {
                                sessionStorage.setItem('editorContent', doc.content)
                                sessionStorage.setItem('editorName', doc.name)
                                sessionStorage.setItem('editorId', doc._id)
                                sessionStorage.setItem(
                                  'editorEditors',
                                  (doc.editors?.map((e: IUser) => e.username) ?? []).join(', ')
                                )
                                sessionStorage.setItem('editorIsPublic', String(doc.isVisibleNonAuth))
                                router.push('/editor')
                              } catch (err) {
                                console.error('Could not open editor with content', err)
                              }
                            }
                          }}
                          className="mt-2 w-full h-40 flex items-center justify-center overflow-hidden rounded-2xl bg-amber-900 shadow-2xl p-2 cursor-pointer"
                        >
                          <p>{renderPlainText(doc.content)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {jwt ? (<div className="absolute top-2 right-2">
                    <FileActions
                      fileId={doc._id}
                      fileName={doc.name}
                      isTrashed={Boolean(doc.trash)}
                      fileOwner={doc.owner?.username ?? ''}
                      editors={doc.editors?.map((e: IUser) => e.username) ?? []}
                      currentUsername={currentUser ?? undefined}
                      onUpdated={getDocuments}
                    />
                  </div>) : (<></>)}
                  {doc.trash ? (<span className="absolute left-2 top-2 bg-red-600 text-white px-2 py-0.5 rounded">Trashed</span>) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {visibleDocuments.map((doc) => {
            const filepath = doc.filepath ?? ''
            const filename = filepath
              ? filepath.split('/').pop() || filepath.split('\\').pop() || ''
              : ''
            const fileUrl = filename ? `http://localhost:3001/uploads/${filename}` : ''
            const ext = (filename || '').split('.').pop()?.toLowerCase() || ''
            const isImage = ['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext)
            const isGif = ext === 'gif'
            const isVideo = ['mp4', 'webm', 'ogg'].includes(ext)

            const renderPlainText = (html: string) => {
              const div = document.createElement('div')
              div.innerHTML = html
              return div.textContent || ''
            }

            return (
              <div
                key={doc._id}
                onClick={() => {
                  if (!filename && doc.content) {
                    try {
                      sessionStorage.setItem('editorContent', doc.content)
                      sessionStorage.setItem('editorName', doc.name)
                      sessionStorage.setItem('editorId', doc._id)
                      sessionStorage.setItem(
                        'editorEditors',
                        (doc.editors?.map((e: IUser) => e.username) ?? []).join(', ')
                      )
                      sessionStorage.setItem('editorIsPublic', String(doc.isVisibleNonAuth))
                      router.push('/editor')
                    } catch (e) {
                      console.error('Could not open editor with content', e)
                    }
                  }
                }}
                className="bg-amber-800 border-amber-200 border-4 flex rounded-sm flex-col p-4 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700 relative cursor-pointer"
              >
                {jwt ? (<div className="absolute top-2 right-2">
                  <FileActions
                    fileId={doc._id}
                    fileName={doc.name}
                    isTrashed={Boolean(doc.trash)}
                    fileOwner={doc.owner?.username ?? ''}
                    editors={doc.editors?.map((e: IUser) => e.username) ?? []}
                    currentUsername={currentUser ?? undefined}
                    onUpdated={getDocuments}
                  />
                </div>) : (<></>)}
                {doc.trash ? (<span className="absolute left-2 top-2 bg-red-600 text-white px-2 py-0.5 rounded">Trashed</span>) : null}
                <h1 className="font-bold">Filename: {doc.name}</h1>
                <h2>Uploaded by: {doc.owner.username}</h2>
                <h3>{new Date(doc.createdAt).toLocaleString()}</h3>
                <div className="mt-2 w-full h-60 flex items-center justify-center overflow-hidden rounded-2xl bg-amber-900 shadow-2xl">
                  {filename ? (
                    isVideo ? (
                      <video src={fileUrl} controls className="object-contain w-full h-full" />
                    ) : isGif || isImage ? (
                      <Image
                        src={fileUrl}
                        alt={doc.name}
                        width={800}
                        height={450}
                        unoptimized
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">
                        Download
                      </a>
                    )
                  ) : (
                    <p>{renderPlainText(doc.content)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}