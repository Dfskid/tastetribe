import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Navigation } from '@/components/Navigation';
import { ThemeProvider } from '@/components/ThemeProvider';
import { FeedbackButton } from '@/components/FeedbackButton';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'TasteTribe - Discover Restaurants with Friends',
    template: '%s | TasteTribe',
  },
  description: 'Discover amazing restaurants with personalized recommendations powered by your taste profile and friend network. Join TasteTribe to find your next favorite spot.',
  keywords: ['restaurants', 'food', 'dining', 'recommendations', 'Denver', 'social', 'friends', 'taste', 'cuisine'],
  authors: [{ name: 'TasteTribe' }],
  creator: 'TasteTribe',
  publisher: 'TasteTribe',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://tastetribe.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'TasteTribe - Discover Restaurants with Friends',
    description: 'Discover amazing restaurants with personalized recommendations powered by your taste profile and friend network.',
    url: 'https://tastetribe.app',
    siteName: 'TasteTribe',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TasteTribe - Discover Restaurants',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TasteTribe - Discover Restaurants with Friends',
    description: 'Discover amazing restaurants with personalized recommendations powered by your taste profile and friend network.',
    images: ['/twitter-image.png'],
    creator: '@tastetribe',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TasteTribe',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="pb-16 md:pb-0">
              {children}
            </div>
            <Navigation />
            <Toaster />
            <FeedbackButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
