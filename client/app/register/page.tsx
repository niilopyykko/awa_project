"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "../context/AuthContext"

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const ORIGIN = API.replace(/\/api$/, '')

interface errors {
  location: string,
  msg: string,
  path: string,
  type: string,
  value: string
}

export default function Register() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [userPrompt, setUserPrompt] = useState<string | string[]>('')

  const submitRegister = async () => {
    // submit as multipart/form-data so we can include profile picture
    const fd = new FormData()
    fd.append('username', username)
    fd.append('password', password)
    if (profileFile) fd.append('profilePic', profileFile)

    const response = await fetch(`${ORIGIN}/user/register`, {
      method: 'POST',
      body: fd
    })
    const data = await response.json()
    console.log(response.status, data)
    if (response.status == 200) { //automatically log the user in in register was success
      const loginResponse = await fetch(`${ORIGIN}/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password
        })
      })

      const loginData = await loginResponse.json()

      if (loginResponse.ok) {
        login(loginData.token, username)
        router.push("/")
        router.push("/")
      } else {
        setUserPrompt("Registered, but auto-login failed")
      }
    }

    else if (response.status == 403) {
      setUserPrompt("Username already in use")
    }
    else if (response.status == 400) {
      setUserPrompt(data.errors.map((e: errors) => e.msg))
    }
    else if (response.status == 500) setUserPrompt("Internal server error")
  }
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <form onSubmit={(e) => { e.preventDefault(); submitRegister(); }} className="bg-amber-50 flex flex-col items-center max-w-md m-0 p-4 space-y-3 rounded-md">
        <input onChange={e => setUsername(e.target.value)} type="username" placeholder="username" className="border-red-600 border-2 m-2 text-black md:text-3xl text-2xl rounded-md" required />
        <li className="text-black">Username <span className="font-bold">MUST</span> be at least 3 characters long </li>
        <input onChange={e => setPassword(e.target.value)} type="password" placeholder="password" className="border-red-600 border-2 m-2 text-black md:text-3xl text-2xl rounded-md" required />
        <ul className="text-black list-disc">
          <li className="text-black">Password <span className="font-bold">MUST</span> be at least 5 characters long </li>
          <li className="text-black">Password <span className="font-bold">MUST</span> contain a number </li>
        </ul>
        <label className="text-black pt-2 pb-0 mb-0 text-sm w-fit text-center">Profile picture (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) setProfileFile(e.target.files[0]) }} className="bg-fuchsia-300 rounded-md text-black min-w-2xs max-w-lg" />
        <button type="submit" className="bg-red-800 text-yellow-600 m-2 border-2 text-2xl px-2 rounded-md hover:bg-amber-600 hover:text-black active:bg-red-600">Register</button>
      </form>
      {typeof userPrompt === "string" && userPrompt && (
        <p className="max-w-md mx-auto border-2 border-blue-200 p-2 m-4 text-center rounded bg-white text-black">
          {userPrompt}
        </p>
      )}
      {Array.isArray(userPrompt) && (
        <ul className="max-w-md mx-auto border-2 border-blue-200 p-2 m-4 rounded bg-white text-black list-disc">
          {userPrompt.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  )
}