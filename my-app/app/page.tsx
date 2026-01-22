'use client'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import FileActions from "./components/FileActions";
import Link from "next/link";

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
    const url = jwt ? "http://localhost:3001/api/documents" : "http://localhost:3001/api/documents/public" //if user is not logged in, they are able to get all files listed as public
    const headers: Record<string, string> = {}
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    const data = await response.json()

    if (data && data.length > 0) {
      setDocuments(data)
      console.log(data)
    } else {
      setDocuments([])
    }
  }, [jwt])

  useEffect(() => {
    const run = async () => {
      await getDocuments()
    }

    void run()
  }, [jwt, getDocuments])
  return (
    <>
      {documents.length === 0 ? (
        <div className="flex flex-col items-center mt-32 max-h-[calc(100vh-10rem)]">
          <h1 className="text-center max-w-md min-w-sm p-2 text-5xl rounded-t-2xl bg-fuchsia-400 text-black shadow-lg shadow-amber-800 ">Emptyness</h1>
          <h2 className="text-center max-w-md min-w-sm p-2 text-3xl  bg-fuchsia-300 text-black shadow-lg shadow-amber-800">Drive is empty</h2>
          <h3 className="text-center max-w-md min-w-sm p-2 text-lg rounded-b-2xl bg-fuchsia-200 text-black shadow-lg shadow-amber-800">
            Press  <Link href="/editor" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Editor</Link> OR <Link href="/upload" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Upload</Link> to add files</h3>


        </div>
      ) : (
        <div className="flex flex-col col-3">
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
                      sessionStorage.setItem('editorId', doc._id)
                      router.push('/editor')
                    } catch (e) {
                      console.error('Could not open editor with content', e)
                    }
                  }
                }}
                  key={doc._id}
                  className="bg-amber-800 border-amber-200 border-4 flex rounded-sm flex-col p-4 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700 relative cursor-pointer">
                  <div className="absolute top-2 right-2">
                    <FileActions fileId={doc._id} fileName={doc.name} />
                  </div>
                  <h1 className="font-bold">Filename: {doc.name}</h1>
                  <h2>Uploaded by: {doc.owner.username}</h2>
                  <h3>{new Date(doc.createdAt).toLocaleDateString()}</h3>
                  <div className="mt-2 w-full h-60 flex items-center justify-center overflow-hidden rounded-2xl bg-amber-900  shadow-2xl">
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
          </div >
        </div >)
      }
    </ >
  )
}
