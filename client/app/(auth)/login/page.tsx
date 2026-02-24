"use client"

import { useActionState, useEffect } from "react"
import { loginAction, type LoginState } from "./actions"
import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  useEffect(() => {
    if (state?.success && state.username) {
      login(state.username)

      router.refresh()

      setTimeout(() => {
        router.push("/")
      }, 0)
    }
  }, [state, login, router])



  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <form
        action={formAction}
        className="bg-bg-toolbar border-2 border-border flex flex-col items-center max-w-md m-0 p-6 space-y-4 rounded-lg shadow-lg"
      >
        <h1 className="text-3xl font-bold text-text">Log in</h1>

        <input
          name="username"
          placeholder="username"
          className="border-2 border-purple-500 dark:border-purple-600 bg-bg-input text-text md:text-3xl text-2xl rounded-md px-3 py-2 w-full"
          required
        />

        <input
          name="password"
          type="password"
          placeholder="password"
          className="border-2 border-purple-500 dark:border-purple-600 bg-bg-input text-text md:text-3xl text-2xl rounded-md px-3 py-2 w-full"
          required
        />

        {state?.error && (
          <p className="max-w-md mx-auto border-2 border-red-400 dark:border-red-600 p-3 text-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 shadow-md">
            {state.error}
          </p>
        )}

        <button
          disabled={pending}
          type="submit"
          className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white font-bold py-3 px-8 text-xl rounded-lg shadow-lg hover:shadow-xl transition-all w-full"
        >
          {pending ? "Logging in..." : "Log in"}
        </button>

        <p className="text-text text-center">
          Not registered?{" "}
          <a
            href="/register"
            className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
          >
            Sign up here
          </a>
        </p>
      </form>
    </div>
  )
}
