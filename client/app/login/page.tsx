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
      <form onSubmit={(e) => { e.preventDefault(); fetchData(username, password); }} className="bg-amber-50 flex flex-col items-center max-w-md m-0 p-4 space-y-3 rounded-md">
        <input type="text" placeholder="username" onChange={(e) => setUsername(e.target.value)}
          className="border-red-600 border-2 m-2 text-black md:text-3xl text-2xl rounded-md" />
        <input type="password" placeholder="password" onChange={(e) => setPassword(e.target.value)}
          className="border-red-600 border-2 m-2 text-black md:text-3xl text-2xl rounded-md" />
        <button type="submit" className="bg-red-800 text-yellow-600 m-2 border-2 text-2xl px-2 rounded-md hover:bg-amber-600 hover:text-black active:bg-red-600">Log in</button>
        <Link href="/register" className="text-blue-600 text-md m-2 underline">Not registered? Sign up</Link>
      </form>
      {!userPrompt ? (<></>) : (<p className="max-w-md mx-auto border-2 border-blue-200 p-2 m-4 text-center rounded bg-white text-black">{userPrompt}</p>)}
    </div >
  )
}