import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarServer from "./components/NavbarServer";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value ?? null;

  let serverUser: string | null = null;
  let serverAvatarUrl: string | null = null;

  if (token) {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

    try {
      const res = await fetch(`${backend}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        serverUser = data.username ?? null;
        serverAvatarUrl = data.profilePic
          ? `${backend}/user/me/avatar`
          : null;
      }
    } catch (err) {
      console.error("SSR /user/me failed:", err);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full overflow-x-hidden bg-background text-text`}
      >
        <Providers
          serverUser={serverUser}
          serverAvatarUrl={serverAvatarUrl}
        >
          <NavbarServer />
          <main style={{ paddingTop: "4rem", minHeight: "calc(100vh - 4rem)" }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
