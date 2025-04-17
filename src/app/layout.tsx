import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Little Dragon',
  description: 'Your friendly AI assistant powered by Little Dragon',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/icon.svg',
  },
  themeColor: '#4A90E2',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon.svg" />
        <meta name="theme-color" content="#4A90E2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Little Dragon" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className={inter.className}>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
} 