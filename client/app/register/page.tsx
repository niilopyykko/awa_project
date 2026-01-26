'use client'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/AuthContext"

export default function Register() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [userPrompt, setUserPrompt] = useState('')

  const submitRegister = async () => {
    try {
      const fd = new FormData()
      fd.append("username", username)
      fd.append("password", password)
      if (profileFile) fd.append("profilePic", profileFile)

      const response = await fetch("/api/proxy/register-json", {
        method: "POST",
        credentials: "include",
        body: fd
      })

      const data = await response.json()
      console.log("Register response:", data)

      if (!response.ok) {
        setUserPrompt(data?.message ?? "Registration failed")
        return
      }

      // If backend returned token directly, use it. Otherwise, call the login proxy.
      if (data?.token) {
        login(data.token, data.username ?? username)
      } else {
        try {
          const lf = new FormData()
          lf.append('username', username)
          lf.append('password', password)
          const loginRes = await fetch('/api/proxy/login', { method: 'POST', credentials: 'include', body: lf })
          const loginData = await loginRes.json()
          if (loginRes.ok) {
            login(loginData?.token ?? '', loginData?.username ?? username)
          }
        } catch (e) {
          console.warn('Auto-login after register failed', e)
        }
      }

      router.push('/')
    } catch (err) {
      console.error(err)
      setUserPrompt("Network error")
    }
  }



  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <form
        onSubmit={(e) => { e.preventDefault(); submitRegister(); }}
        className="bg-[color:var(--bg-toolbar)] border-2 border-[color:var(--border)] flex flex-col items-center max-w-md m-0 p-6 space-y-4 rounded-lg shadow-lg"
      >
        <input
          onChange={e => setUsername(e.target.value)}
          type="username"
          placeholder="username"
          className="border-2 border-purple-500 dark:border-purple-600 bg-[color:var(--bg-input)] text-[color:var(--text)] md:text-3xl text-2xl rounded-md px-3 py-2 w-full"
          required
        />
        <li className="text-[color:var(--text)]">Username <span className="font-bold">MUST</span> be at least 3 characters long </li>
        <input
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="password"
          className="border-2 border-purple-500 dark:border-purple-600 bg-[color:var(--bg-input)] text-[color:var(--text)] md:text-3xl text-2xl rounded-md px-3 py-2 w-full"
          required
        />
        <ul className="text-[color:var(--text)] list-disc">
          <li>Password <span className="font-bold">MUST</span> be at least 5 characters long </li>
          <li>Password <span className="font-bold">MUST</span> contain a number </li>
        </ul>
        <label className="text-[color:var(--text)] pt-2 pb-0 mb-0 text-sm w-fit text-center">
          Profile picture (optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => { if (e.target.files && e.target.files[0]) setProfileFile(e.target.files[0]) }}
          className="bg-[color:var(--bg-input)] border-2 border-[color:var(--border)] rounded-md text-[color:var(--text)] p-2 w-full"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-bold py-3 px-8 text-xl rounded-lg shadow-lg hover:shadow-xl transition-all w-full"
        >
          Register
        </button>
      </form>

      {typeof userPrompt === "string" && userPrompt && (
        <p className="max-w-md mx-auto border-2 border-blue-400 dark:border-blue-600 p-3 m-4 text-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[color:var(--text)] shadow-md">
          {userPrompt}
        </p>
      )}
      {Array.isArray(userPrompt) && (
        <ul className="max-w-md mx-auto border-2 border-blue-400 dark:border-blue-600 p-3 m-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[color:var(--text)] list-disc shadow-md">
          {userPrompt.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
