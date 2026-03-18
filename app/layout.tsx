import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'

import { InstallPrompt } from '@/components/install-prompt'
import { RegisterSW } from '@/components/register-sw'
import './globals.css'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'FitForge - Smart Workout Plans',
  description: 'Personalized workout plans that adapt to your progress. Set goals, track measurements, and let intelligent planning guide your fitness journey.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitForge',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${bebasNeue.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        <InstallPrompt />
        <RegisterSW />
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: 'hsl(0 0% 7%)',
              border: '1px solid hsl(0 0% 14%)',
              color: 'hsl(0 0% 95%)',
            },
          }}
        />
      </body>
    </html>
  )
}
