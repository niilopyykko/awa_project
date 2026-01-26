'use client'

import Link from "next/link"
import { FormEvent, useState } from "react"
import useDocuments from "../hooks/useDocuments";
import { useAuth } from "../context/AuthContext";


// Use the node proxy for uploads
const MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 25);
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export default function Upload() {
  const { user } = useDocuments();
  const { logout } = useAuth();


  const [file, setFile] = useState<File | null>(null)
  const [editors, setEditors] = useState<string>("")
  const [isPublic, setIsPublic] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)

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
      if (file.size > MAX_FILE_BYTES) {
        alert(`File is too large. Max size is ${MAX_FILE_MB} MB.`)
        return
      }
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('editors', editors)
      formData.append('isPublic', isPublic.toString())

      const response = await fetch(`/api/proxy/upload`, {
        method: "POST",
        credentials: 'include',
        body: formData,
      })

      if (response.ok) {
        console.log('File uploaded successfully')
        const data = await response.json()
        setViewLink(data.readOnlyLink)
        setIsUploading(false)
      } else {
        setIsUploading(false)
        let errorBody = null
        try {
          errorBody = await response.json()
        } catch {
          errorBody = await response.text()
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
      setIsUploading(false)
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
        {!user ? (
          <div className='flex flex-col bg-gradient-to-br from-purple-400 to-pink-400 dark:from-purple-600 dark:to-pink-600 rounded-lg shadow-md text-center p-6'>
            <p className="text-white text-xl font-semibold mb-4">Please login to upload files</p>
            <Link href="/login" className="bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-[color:var(--text-purple)] font-bold py-3 px-8 rounded-lg shadow-lg transition-colors border-2 border-purple-500">Log in</Link>
          </div>
        ) : (
          <div className="flex flex-col col-1">
            <div className="bg-[color:var(--bg-toolbar)] border-2 border-[color:var(--border)] rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-[color:var(--text)] mb-4">Upload File</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-6 mb-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="file"
                      className="block mb-2.5 text-base font-medium text-[color:var(--text)]">
                      File
                    </label>
                    <input
                      type="file"
                      id="file"
                      name="file"
                      className="bg-[color:var(--bg-input)] border border-[color:var(--border)] text-[color:var(--text)] text-base rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 block w-full px-3 py-2.5"
                      onChange={e => {
                        const selected = e.target.files?.[0] ?? null
                        if (selected && selected.size > MAX_FILE_BYTES) {
                          alert(`File is too large. Max size is ${MAX_FILE_MB} MB.`)
                          e.target.value = ''
                          setFile(null)
                          return
                        }
                        setFile(selected)
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="editors"
                      className="block mb-2.5 text-base font-medium text-[color:var(--text)]">
                      Editors
                    </label>
                    <input
                      type="text"
                      id="editors"
                      name="editors"
                      placeholder="john1, john2, john3"
                      className="bg-[color:var(--bg-input)] border border-[color:var(--border)] text-[color:var(--text)] text-base rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 block w-full px-3 py-2.5"
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
                  <label htmlFor="isPublic" className="text-md font-semibold tracking-wide text-text drop-shadow-sm drop-shadow-white">Make public</label>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
              {viewLink && (
                <div className="mt-6 flex flex-col gap-3">
                  <h3 className="text-center font-semibold text-[color:var(--text)] bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-300 dark:border-green-700">Shareable Link (click to copy)</h3>
                  <button
                    onClick={handleCopy}
                    className={`border-2 p-3 rounded-lg font-medium transition-all ${copied ? 'bg-green-500 dark:bg-green-700 border-green-600 dark:border-green-500 text-white' : 'bg-purple-100 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600 text-[color:var(--text-purple)] hover:bg-purple-200 dark:hover:bg-purple-800/30'}`}>
                    {copied ? '✓ Copied!' : viewLink}
                  </button>
                </div>
              )}
            </div>
          </div >)
        }
      </div>
    </div>)
}