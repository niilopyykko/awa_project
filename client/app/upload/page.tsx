'use client'

import Link from "next/link"
import { FormEvent, useState } from "react"
import useDocuments from "../hooks/useDocuments";
import { useAuth } from "../context/AuthContext";


const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const ORIGIN = API.replace(/\/api$/, '')

export default function Upload() {
  const { token: jwt } = useDocuments();
  const { logout } = useAuth();


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

      const response = await fetch(`${API}/upload`, {
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
          logout()
          window.location.href = '/login'
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
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        {!jwt ? (
          <div className='flex flex-col bg-fuchsia-300 rounded-md text-center p-2'>
            <p className="text-gray-600 text-2xl">Please login to see Upload</p>
            <Link href="/login" className="bg-amber-500 border-2 p-1 m-2 border-amber-50 text-amber-900 text-lg">Log in</Link>
          </div>
        ) : (
          <div className="flex flex-col col-1">
            <div className="bg-fuchsia-300 rounded-lg shadow-md p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-6 mb-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="file"
                      className="block mb-2.5 text-sm font-medium text-gray-700">
                      File
                    </label>
                    <input
                      type="file"
                      id="file"
                      name="file"
                      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2.5"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="editors"
                      className="block mb-2.5 text-sm font-medium text-gray-700">
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
                <div className="flex items-center gap-3">
                  <button type="submit" className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-sm px-4 py-2.5">Upload</button>
                </div>
              </form>
              {viewLink && (
                <div className="mt-4 flex flex-col justify-center">
                  <h1 className="m-auto p-2 text-black rounded-md bg-amber-500 border-2">Amazing Copyable link below (click it)</h1>
                  <button
                    onClick={handleCopy}
                    className={`border-2 p-2 ${copied ? 'bg-green-500' : 'bg-amber-500'} border-amber-50 m-auto my-2 underline`}>
                    {copied ? 'Copied!' : viewLink}
                  </button>
                </div>
              )}
            </div>
          </div >)
        }
      </div>
    </div>)
}