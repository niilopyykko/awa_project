'use client'

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/AuthContext"
import { IoCheckmarkCircle } from 'react-icons/io5'


// Use the node proxy for uploads
const MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 25);
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export default function Upload() {
  const { user } = useAuth();
  const { logout } = useAuth();
  const router = useRouter();


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
      let errorBody = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = await response.text()
      }

      if (response.ok) {
        console.log('File uploaded successfully')
        setIsUploading(false)
        // Redirect to drive after successful upload
        router.push('/')
      } else {
        setIsUploading(false)
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

  return (<div className="p-4 sm:p-8">
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 shadow-2xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <>
          {!user ? (
            <div className='flex flex-col bg-linear-to-br from-purple-400 to-pink-400 dark:from-purple-600 dark:to-pink-600 rounded-lg shadow-md text-center p-6'>
              <p className="text-white text-xl sm:text-2xl font-semibold mb-4">Please login to upload files</p>
              <Link href="/login" className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-text-purple font-medium py-2 px-6 rounded-lg shadow transition-colors">Log in</Link>
            </div>
          ) : (<div className='flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md'>
            <div className='bg-linear-to-r from-purple-500 to-pink-500 dark:from-purple-700 dark:to-pink-700 text-center p-4 shadow-md'>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-md">File Upload</h1>
              <p className="text-purple-50 text-sm drop-shadow">Upload documents and collaborate with others</p>
            </div>
            <div className='p-4 sm:p-6 bg-white dark:bg-gray-800'>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label
                    htmlFor="file"
                    className="block mb-1 text-base font-medium text-gray-700 dark:text-gray-300">
                    File
                  </label>
                  <input
                    type="file"
                    id="file"
                    name="file"
                    className="bg-bg-input border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
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
                <div className='space-y-3'>
                  <div>
                    <label
                      htmlFor="editors"
                      className="block mb-1 text-base font-medium text-gray-700 dark:text-gray-300">
                      Editors
                    </label>
                    <input
                      type="text"
                      id="editors"
                      name="editors"
                      placeholder="john1, john2, john3"
                      className="bg-bg-input border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent block w-full px-3 py-2 transition-shadow"
                      value={editors}
                      onChange={(e) => setEditors(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                    <input
                      type="checkbox"
                      id="isPublic"
                      name="isPublic"
                      className="w-5 h-5 border-2 border-purple-400 dark:border-purple-500 rounded accent-purple-600 cursor-pointer"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <label htmlFor="isPublic" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer select-none">Make public</label>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
              {viewLink && (
                <div className="mt-6 flex flex-col gap-3">
                  <h3 className="text-center font-semibold text-text bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-300 dark:border-green-700">Shareable Link (click to copy)</h3>
                  <button
                    onClick={handleCopy}
                    className={`border-2 p-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-500 dark:bg-green-700 border-green-600 dark:border-green-500 text-white' : 'bg-purple-100 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600 text-text-purple hover:bg-purple-200 dark:hover:bg-purple-800/30'}`}>
                    {copied ? <><IoCheckmarkCircle className='text-lg' /> Copied!</> : viewLink}
                  </button>
                </div>
              )}
            </div>
          </div>)
}</>
      </div>
    </div>
  </div>)
}