'use client'
import { useState } from "react"
import Link from "next/link"

export default function Login() {
  const [userPrompt, setUserPrompt] = useState('')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')


  const fetchData = async (username: string, password: string) => {

    try {
      const response = await fetch("http://localhost:3001/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      })

      if (!response.ok) {
        throw new Error("Error fetching data")
      }
      const data = await response.json()
      console.log(response.status, data)
      if (response.status === 401) {
        setUserPrompt("Login failed")
      }
      else if (response.status === 400) {
        setUserPrompt("error")
      }
      else if (response.status === 500) setUserPrompt("Internal server error")

      if (data.token) {
        localStorage.setItem("token", data.token)
        setUserPrompt("login successfull, forwarding to frontpage page in 3 seconds")
        setTimeout(() => {
          window.location.href = "/"
        }, 3000)
      }


    } catch (error) {
      if (error instanceof Error) {
        console.log(`Error when trying to login: ${error.message}`)
      }
    }


  }

  return (
    <div className="bg-blue-700">
      <form onSubmit={(e) => { e.preventDefault(); fetchData(username, password); }} className="bg-amber-50 flex-grid grid-cols-2">
        <input type="username" placeholder="username" onChange={(e) => setUsername(e.target.value)}
          className="border-red-600 border-2 m-2 text-black text-2xl" />
        <input type="password" placeholder="password" onChange={(e) => setPassword(e.target.value)}
          className="border-red-600 border-2 m-2 text-black text-2xl" />
        <label htmlFor="remember" className="text-black text-2xl ml-2">Remember me</label>
        <input type="checkbox" name="remember" id="asdasd" className="mr-2" />
        <button type="submit" className="bg-red-800 text-yellow-600 m-2 border-2 text-2xl">Log in</button>
        <Link href="/pages/register" className="text-blue-600 text-md m-2 underline">Not registered? Sign up</Link>
      </form>
      <p>{userPrompt}</p>
    </div>
  )
}