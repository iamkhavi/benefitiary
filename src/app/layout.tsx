import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { ConsoleLayout } from '@/components/layout/console-layout'
// import { PerformanceMonitor } from '@/components/performance/performance-monitor'

export const metadata: Metadata = {
  title: 'Benefitiary - Grant Discovery Platform',
  description: 'Connect with grant opportunities for SMEs, nonprofits, and healthcare organizations',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  metadataBase: new URL('https://benefitiary.com'),
  openGraph: {
    title: 'Benefitiary - Grant Discovery Platform',
    description: 'Connect with grant opportunities for SMEs, nonprofits, and healthcare organizations',
    url: 'https://benefitiary.com',
    siteName: 'Benefitiary',
    images: [
      {
        url: '/logo.svg',
        width: 206,
        height: 33,
        alt: 'Benefitiary Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Benefitiary - Grant Discovery Platform',
    description: 'Connect with grant opportunities for SMEs, nonprofits, and healthcare organizations',
    images: ['/logo.svg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className={GeistSans.className}>
        {/* <PerformanceMonitor /> */}
        <ConsoleLayout>
          {children}
        </ConsoleLayout>
      </body>
    </html>
  )
}