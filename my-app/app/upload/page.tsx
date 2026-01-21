'use client'

import Link from "next/link"
import { FormEvent, useState, useEffect } from "react"


export default function Upload() {
  const [jwt, setJwt] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem("token")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJwt(localStorage.getItem("token"))
    }
  }, [jwt])

  const [file, setFile] = useState<File | null>(null)
  const [editors, setEditors] = useState<string>("")
  const [isPublic, setIsPublic] = useState<boolean>(false)

  //user copyable viewonly link
  const [viewLink, setViewLink] = useState<string>("")
  const [copied, setCopied] = useState<boolean>(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    try {
      if (!file) {
        console.error('No file selected')
        alert("Please select a file")
        return
      }
      if (!jwt) {
        console.error('No token available')
        return
      }
      const formData = new FormData()
      formData.append('file', file)
      formData.append('editors', editors)
      formData.append('isPublic', isPublic.toString())

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
          window.location.href = '/pages/login'
        }
      }
    }
    catch (error) {
      console.error('Upload failed:', error)
    }
  }


  const handleCopy = () => {
    navigator.clipboard.writeText(viewLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  return (
    <>
      {!jwt ? (
        <>
          <p>Please login to see file upload</p>
          <Link href="/pages/login" className="bg-amber-500 border-2 p-1 m-2 border-amber-50">Log in</Link>
        </>
      ) : (
        <div className="flex flex-col col-auto">
          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="grid gap-6 mb-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="file"
                  className="block mb-2.5 text-sm font-medium text-white">
                  File
                </label>
                <input
                  type="file"
                  id="file"
                  name="file"
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2.5"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label
                  htmlFor="editors"
                  className="block mb-2.5 text-sm font-medium text-white">
                  Editors
                </label>
                <input
                  type="text"
                  id="editors"
                  name="editors"
                  placeholder="john1, john2, john3"
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
            <button type="submit" className="text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-sm px-4 py-2.5">Upload</button>
          </form>
          {viewLink && (
            <button
              onClick={handleCopy}
              className={`border-2 p-2 ${copied ? 'bg-green-500' : 'bg-amber-500'} border-amber-50 m-auto my-2 underline`}>
              {copied ? 'Copied!' : viewLink}
            </button>
          )}
        </div >)
      }
    </>
  )
}