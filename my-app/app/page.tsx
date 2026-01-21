'use client'

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
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
}

export default function Home() {
  const [documents, setDocuments] = useState<IDocument[]>([])
  const [jwt, setJwt] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem("token")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJwt(localStorage.getItem("token"))
    }
  }, [jwt])

  const getDocuments = async (e: { preventDefault: () => void }) => {
    e.preventDefault()

    const response = await fetch("http://localhost:3001/api/documents", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${jwt}`
      },
    })

    const data = await response.json()

    if (jwt && data && data.length > 0) {
      setDocuments(data)
      console.log(data)
    }
  }
  return (
    <>
      {!jwt ? (
        <>
          <h1>Log in to see files</h1>
        </>
      ) : (
        <div className="flex flex-col col-3">
          {documents.length === 0 ?
            <button onClick={getDocuments} className="border-amber-400 border-4 bg-amber-900 p-2 my-4 mx-auto rounded-2xl">Fetch Documents</button>
            :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {documents.map((doc) => {
                const filename = doc.filepath.split('/').pop() || doc.filepath.split('\\').pop()
                const imageUrl = `http://localhost:3001/uploads/${filename}`
                return (

                  <div key={doc._id} className="bg-amber-800 border-amber-200 border-4 flex flex-col p-4 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700 relative">
                    <div className="absolute top-2 right-2">
                      <FileActions fileId={doc._id} fileName={doc.name} />
                    </div>
                    <h1 className="font-bold">Filename: {doc.name}</h1>
                    <h2>Uploaded by: {doc.owner.username}</h2>
                    <h3>{new Date(doc.createdAt).toLocaleDateString()}</h3>
                    <Image src={imageUrl} alt={doc.name} width={500} height={300} unoptimized className="mt-2" />
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
