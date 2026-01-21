'use client'

import { useState, useEffect } from "react"

export default function About() {
  const [jwt, setJwt] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) Promise.resolve().then(() => setJwt(token))
  }, [])
  return (
    <>
      <h1>about header</h1>
      {!jwt ? (
        <p>Please login to see about</p>
      ) : (
        <>
          <p>you are logged in, this is the aboutpage</p>
        </>)}
    </>
  )
}