import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { ConditionalLayout } from '@/components/layout/conditional-layout'

export const metadata: Metadata = {
  title: 'Benefitiary Console - Grant Management Dashboard',
  description: 'Manage your grant applications, track funding opportunities, and grow your organization',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  metadataBase: new URL('https://benefitiary.com'),
  openGraph: {
    title: 'Benefitiary Console - Grant Management Dashboard',
    description: 'Manage your grant applications, track funding opportunities, and grow your organization',
    url: 'https://app.benefitiary.com',
    siteName: 'Benefitiary Console',
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
    title: 'Benefitiary Console - Grant Management Dashboard',
    description: 'Manage your grant applications, track funding opportunities, and grow your organization',
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
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  )
}