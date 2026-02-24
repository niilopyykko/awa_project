"use client"

import { useState } from "react"
import { registerAction } from "./actions"
import { useRouter } from "next/navigation"

interface Registerresult {
  success?: boolean
  errors?: {
    username?: string[]
    password?: string[]
  }
  message?: string
}


export default function RegisterPage() {
  const [profilePic, setProfilePic] = useState<File | null>(null)
  const [result, setResult] = useState<Registerresult | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const registrationDisabled = process.env.NEXT_PUBLIC_DISABLE_REGISTRATION === "true"

  async function handleSubmit(formData: FormData) {
    if (registrationDisabled) return
    setPending(true)
    const res = await registerAction(null, formData)
    setResult(res)
    setPending(false)

    if (!res.success) return

    if (profilePic) {
      const fd = new FormData()
      fd.append("profilePic", profilePic)

      await fetch("/api/proxy/upload-avatar", {
        method: "POST",
        body: fd,
        credentials: "include",
      })
    }
    router.push("/")
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      {registrationDisabled && (
        <div className="w-full max-w-md mb-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg text-center text-red-700 font-bold">
          Registration is disabled.
        </div>
      )}
      <form action={handleSubmit}
        className="bg-bg-toolbar border-2 border-border flex flex-col items-center max-w-md m-0 p-6 space-y-4 rounded-lg shadow-lg"
      >
        <h1 className="text-3xl font-bold text-text">Register</h1>

        <input
          name="username"
          placeholder="username"
          className="border-2 border-purple-500 dark:border-purple-600 bg-bg-input text-text md:text-3xl text-2xl rounded-md px-3 py-2 w-full"
          required
          disabled={registrationDisabled}
        />
        <li className="text-text">
          Username <span className="font-bold">MUST</span> be at least 3 characters long
        </li>
        {result?.errors?.username && (
          <p className="text-red-500">{result.errors.username}</p>
        )}

        <input
          name="password"
          type="password"
          placeholder="password"
          className="border-2 border-purple-500 dark:border-purple-600 bg-bg-input text-text md:text-3xl text-2xl rounded-md px-3 py-2 w-full"
          required
          disabled={registrationDisabled}
        />
        <ul className="text-text list-disc">
          <li>Password <span className="font-bold">MUST</span> be at least 5 characters long</li>
          <li>Password <span className="font-bold">MUST</span> contain a number</li>
        </ul>
        {result?.errors?.password && (
          <p className="text-red-500">{result.errors.password}</p>
        )}

        <label className="text-text pt-2 pb-0 mb-0 text-sm w-fit text-center">
          Profile picture (optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setProfilePic(e.target.files[0])
            }
          }}
          className="bg-bg-input border-2 border-border rounded-md text-text p-2 w-full"
          disabled={registrationDisabled}
        />

        {result?.message && (
          <p className="max-w-md mx-auto border-2 border-blue-400 dark:border-blue-600 p-3 text-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-text shadow-md">
            {result.message}
          </p>
        )}
        {result && !result.success && !result.message && (
          <p className="max-w-md mx-auto border-2 border-red-400 dark:border-red-600 p-3 text-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 shadow-md">
            Registration failed.
          </p>
        )}

        <button
          disabled={pending || registrationDisabled}
          type="submit"
          className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-bold py-3 px-8 text-xl rounded-lg shadow-lg hover:shadow-xl transition-all w-full"
        >
          {pending ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  )
}