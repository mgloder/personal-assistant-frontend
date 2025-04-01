import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Little Dragon',
  description: 'Your friendly AI assistant powered by Little Dragon',
  manifest: '/manifest.json',
  icons: {
    icon: { url: '/icons/icon.svg', type: 'image/svg+xml' }
  },
  themeColor: '#4A90E2',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
} 