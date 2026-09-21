import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { Wallet } from 'lucide-react'
import './globals.css'
import { AppProvider } from '@/hooks/useApp'
import { AuthControls } from '@/components/auth/AuthControls'
import { ServiceWorkerRegister } from './sw-register'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track shared expenses with friends and groups',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Expense Tracker',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-[#d0e2f4] text-zinc-900`}>
        <ServiceWorkerRegister />
        <ClerkProvider>
          <AppProvider>
            <header className="bg-[#3b82f6] sticky top-0 z-40 shadow-md">
              <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 font-bold tracking-tight text-lg text-white">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
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
