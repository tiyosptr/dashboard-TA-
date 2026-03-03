import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Manufacturing Dashboard',
  description: 'Real-time Manufacturing Monitoring System - PT Volex Indonesia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* DNS prefetch for API calls */}
        <link rel="dns-prefetch" href="http://localhost:3000" />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}