'use client'
import { useState } from "react"

export default function Register() {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [userPrompt, setUserPrompt] = useState('')

  const submitRegister = async () => {
    const response = await fetch('http://localhost:3001/user/register', {
      method: 'POST',
      body: JSON.stringify({
        username: username,
        password: password,
      }),
      headers: {
        'Content-type': 'application/json'
      }
    })
    const data = await response.json()
    console.log(response.status, data)
    if (response.status == 200) {
      setUserPrompt("Register successfull, forwarding to login page in 3 seconds")
      setTimeout(() => {
        window.location.href = "/pages/login"
      }, 3000)
    }
    else if (response.status == 403) {
      setUserPrompt("Username already in use")
    }
    else if (response.status == 400) {
      setUserPrompt("error")
    }
    else if (response.status == 500) setUserPrompt("Internal server error")
  }
  return (
    <div className="bg-blue-700">
      <form onSubmit={(e) => { e.preventDefault(); submitRegister(); }} className="bg-amber-50 flex-grid grid-cols-2">
        <input onChange={e => setUsername(e.target.value)} type="username" placeholder="username" className="border-red-600 border-2 bor m-2 text-black text-2xl" />
        <input onChange={e => setPassword(e.target.value)} type="password" placeholder="password" className="border-red-600 border-2 m-2 text-black text-2xl" />
        <button type="submit" className="bg-red-800 text-yellow-600 m-2 border-2 text-2xl">Register</button>
      </form>
      <p>{userPrompt}</p>
    </div>
  )
}