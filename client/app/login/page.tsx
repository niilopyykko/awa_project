'use client'
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/AuthContext"

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const ORIGIN = API.replace(/\/api$/, '')

export default function Login() {
  const router = useRouter()
  const { login } = useAuth()

  const [userPrompt, setUserPrompt] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')


  const fetchData = async (username: string, password: string) => {
    try {
      const fd = new FormData()
      fd.append('username', username)
      fd.append('password', password)
      const response = await fetch('/api/proxy/login', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) { setUserPrompt("Login failed, wrong password or user doesn't exist") }
        else if (response.status === 400) { setUserPrompt("error") }
        else if (response.status === 500) { setUserPrompt("Internal server error") }
        else throw new Error("Error fetching data")
      }

      if (response.ok) {
        login(data.token, username)
        router.push("/")
      }


    } catch (error) {
      if (error instanceof Error) {
        console.log(`Error when trying to login: ${error.message}`)
      }
    }
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <form onSubmit={(e) => { e.preventDefault(); fetchData(username, password); }} className="bg-[color:var(--bg-toolbar)] flex flex-col items-center max-w-md m-0 p-6 space-y-4 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-[color:var(--text)]">Log In</h2>
        <input type="text" placeholder="username" onChange={(e) => setUsername(e.target.value)}
          className="border-2 border-purple-500 dark:border-purple-600 bg-[color:var(--bg-input)] text-[color:var(--text)] p-2 w-full rounded-md focus:ring-2 focus:ring-purple-500" />
        <input type="password" placeholder="password" onChange={(e) => setPassword(e.target.value)}
          className="border-2 border-purple-500 dark:border-purple-600 bg-[color:var(--bg-input)] text-[color:var(--text)] p-2 w-full rounded-md focus:ring-2 focus:ring-purple-500" />
        <button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-semibold py-2 px-8 rounded-lg shadow-md hover:shadow-lg transition-all">Log in</button>
        <Link href="/register" className="text-[color:var(--text-purple)] text-sm underline hover:opacity-80">Not registered? Sign up</Link>
      </form>
      {!userPrompt ? (<></>) : (<p className="max-w-md mx-auto border-2 border-red-400 dark:border-red-600 p-3 m-4 text-center rounded bg-red-50 dark:bg-red-900/20 text-[color:var(--text-red)]">{userPrompt}</p>)}
    </div >
  )
}