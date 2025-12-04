import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manufacturing Dashboard',
  description: 'Real-time Manufacturing Monitoring System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to improve performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for API calls */}
        <link rel="dns-prefetch" href="http://localhost:3000" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}