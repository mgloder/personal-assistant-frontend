import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Little Dragon',
  description: 'Your friendly AI assistant powered by Little Dragon',
  keywords: ['AI', 'chatbot', 'assistant', 'dragon', 'AI assistant'],
  authors: [{ name: 'Little Dragon Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#4A90E2',
  openGraph: {
    title: 'Little Dragon',
    description: 'Your friendly AI assistant powered by Little Dragon',
    type: 'website',
    locale: 'en_US',
    siteName: 'Little Dragon',
    images: [
      {
        url: '/dragon-og.png',
        width: 1200,
        height: 630,
        alt: 'Little Dragon AI Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Little Dragon',
    description: 'Your friendly AI assistant powered by Little Dragon',
    images: ['/dragon-og.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
} 