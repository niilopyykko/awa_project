'use client'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { Link } from "@heroui/react";
import FileActions from "./components/FileActions";

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
}

export default function Home() {
  const [documents, setDocuments] = useState<IDocument[]>([])
  const [jwt, setJwt] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJwt(localStorage.getItem("token"))
  }, [])

  const getDocuments = useCallback(async (e?: { preventDefault: () => void }) => {
    if (e && e.preventDefault) e.preventDefault()

    if (!jwt) return

    const response = await fetch("http://localhost:3001/api/documents", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${jwt}`
      },
    })

    const data = await response.json()

    if (data && data.length > 0) {
      setDocuments(data)
      console.log(data)
    }
  }, [jwt])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (jwt) getDocuments()
  }, [getDocuments, jwt])
  return (
    <>
      {!jwt ? (
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 shadow-md">
              <div className='flex flex-col bg-fuchsia-300 rounded-md text-center p-2'>
                <p className="text-gray-600 text-2xl">Please login to see Files</p>
                <Link href="/login" className="bg-amber-500 border-2 p-1 m-2 border-amber-50 text-amber-900 text-lg">Log in</Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col col-3">
          {documents.length === 0 ?
            <button onClick={getDocuments} className="border-amber-400 border-4 bg-amber-900 p-2 my-4 mx-auto rounded-2xl">Fetch Documents</button>
            :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {documents.map((doc) => {
                const filepath = doc.filepath ?? ''
                const filename = filepath ? (filepath.split('/').pop() || filepath.split('\\').pop() || '') : ''
                const fileUrl = filename ? `http://localhost:3001/uploads/${filename}` : ''
                const ext = (filename || '').split('.').pop()?.toLowerCase() || ''
                const isImage = ['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext)
                const isGif = ext === 'gif'
                const isVideo = ['mp4', 'webm', 'ogg'].includes(ext)

                //"removes" html tags from content
                const renderPlainText = (html: string) => {
                  const div = document.createElement('div')
                  div.innerHTML = html
                  return div.textContent || ''
                }
                return (

                  <div onClick={() => {
                    // if there's no uploaded file but there is editor content, open editor with that content
                    if (!filename && doc.content) {
                      try {
                        sessionStorage.setItem('editorContent', doc.content)
                        sessionStorage.setItem('editorName', doc.name)
                        router.push('/editor')
                      } catch (e) {
                        console.error('Could not open editor with content', e)
                      }
                    }
                  }}
                    key={doc._id}
                    className="bg-amber-800 border-amber-200 border-4 flex flex-col p-4 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700 relative cursor-pointer">
                    <div className="absolute top-2 right-2">
                      <FileActions fileId={doc._id} fileName={doc.name} />
                    </div>
                    <h1 className="font-bold">Filename: {doc.name}</h1>
                    <h2>Uploaded by: {doc.owner.username}</h2>
                    <h3>{new Date(doc.createdAt).toLocaleDateString()}</h3>
                    <div className="mt-2 w-full h-60 flex items-center justify-center overflow-hidden">
                      {filename ? (
                        isVideo ? (
                          <video src={fileUrl} controls className="object-contain w-full h-full" />
                        ) : isGif || isImage ? (
                          <Image src={fileUrl} alt={doc.name} width={800} height={450} unoptimized className="object-contain w-full h-full" />
                        ) : (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">Download</a>
                        )
                      ) : (
                        <p>{renderPlainText(doc.content)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}
    </>
  )
}
