import type { Metadata } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import '@/features/scada/styles/warm-glass.css';

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  weight: ['400', '600', '700'],
  subsets: ['latin', 'vietnamese'],
});

export const metadata: Metadata = {
  title: 'TotalParking SCADA | Mô phỏng vận hành',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${jetBrainsMono.variable} warm-glass-theme`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
