import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css"
import Navbar from "./components/Navbar";
import { cookies } from "next/headers";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AWA Project",
  description: "AMAZIN APPLICATION",
};

export default async function RootLayout({

  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let serverToken: string | null = null
  let serverUser: string | null = null
  try {
    const cookieStore = await cookies()
    // cookies() may return a different shape in some runtimes; guard access
    serverToken = cookieStore.get?.('token')?.value ?? null
    serverUser = cookieStore.get?.('user')?.value ?? null
  } catch {
    // Not running in a server context or cookies unavailable — leave as null
    serverToken = null
    serverUser = null
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full overflow-x-hidden bg-[color:var(--background)] text-[color:var(--text)]`}
      >
        <Providers serverToken={serverToken} serverUser={serverUser}>
          <Navbar />
          <main style={{ paddingTop: '4rem', minHeight: 'calc(100vh - 4rem)' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html >
  );
}
