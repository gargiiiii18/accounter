import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { Wallet } from 'lucide-react'
import './globals.css'
import { AppProvider } from '@/hooks/useApp'
import { AuthControls } from '@/components/auth/AuthControls'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track shared expenses with friends and groups',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50`}>
        <ClerkProvider>
          <AppProvider>
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur sticky top-0 z-40">
              <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-4 font-semibold tracking-tight text-lg">
                  <Wallet className="h-6 w-6" />
                  <span>Expense Tracker</span>
                </Link>
                <AuthControls />
              </div>
            </header>
            {children}
          </AppProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}