"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "../context/AuthContext"

interface errors {
  location: string
  msg: string
  path: string
  type: string
  value: string
}

export default function Register() {
  const router = useRouter()
  const { refresh } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [userPrompt, setUserPrompt] = useState<string | string[]>('')

  const submitRegister = async () => {
    try {
      const response = await fetch("/api/proxy/register-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      })

      const data = await response.json()
      console.log("Register response:", data)

      if (!response.ok) {
        setUserPrompt(data.message || "Registration failed")
        return
      }

      // Backend set cookies via proxy — refresh AuthContext from cookies
      try { await refresh() } catch { }
      // safe navigation: call a fetch to trigger cookie presence, then refresh via location reload
      await fetch('/api/proxy/register-json', { method: 'GET', credentials: 'include' }).catch(() => null)
      router.push('/')

      if (profileFile) {
        const fd = new FormData()
        fd.append("profilePic", profileFile)

        const avatarRes = await fetch("/api/proxy/avatar-upload", {
          method: "POST",
          credentials: 'include',
          body: fd
        })

        const avatarData = await avatarRes.json()
        console.log("Avatar upload response:", avatarData)
      }

      router.push("/")
    } catch (err) {
      console.error(err)
      setUserPrompt("Network error")
    }
  }


  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <form
        onSubmit={(e) => { e.preventDefault(); submitRegister(); }}
        className="bg-amber-50 flex flex-col items-center max-w-md m-0 p-4 space-y-3 rounded-md"
      >
        <input
          onChange={e => setUsername(e.target.value)}
          type="username"
          placeholder="username"
          className="border-red-600 border-2 m-2 text-black md:text-3xl text-2xl rounded-md"
          required
        />
        <li className="text-black">Username <span className="font-bold">MUST</span> be at least 3 characters long </li>
        <input
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="password"
          className="border-red-600 border-2 m-2 text-black md:text-3xl text-2xl rounded-md"
          required
        />
        <ul className="text-black list-disc">
          <li>Password <span className="font-bold">MUST</span> be at least 5 characters long </li>
          <li>Password <span className="font-bold">MUST</span> contain a number </li>
        </ul>
        <label className="text-black pt-2 pb-0 mb-0 text-sm w-fit text-center">
          Profile picture (optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => { if (e.target.files && e.target.files[0]) setProfileFile(e.target.files[0]) }}
          className="bg-fuchsia-300 rounded-md text-black min-w-2xs max-w-lg"
        />
        <button
          type="submit"
          className="bg-red-800 text-yellow-600 m-2 border-2 text-2xl px-2 rounded-md hover:bg-amber-600 hover:text-black active:bg-red-600"
        >
          Register
        </button>
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
