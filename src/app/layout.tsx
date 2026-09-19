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
      <body className={`${inter.className} antialiased bg-[#3f6490] text-white`}>
        <ClerkProvider>
          <AppProvider>
            <header className="border-b border-white/15 bg-[#3f6490]/80 backdrop-blur-xl sticky top-0 z-40">
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