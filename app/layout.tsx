import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' })
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'eautoparts admin', template: '%s · eautoparts admin' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0e3a47' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  )
}
