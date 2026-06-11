import type { Metadata } from 'next';
import { AuthProvider } from '@/presentation/providers/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Minch Bingo',
  description: 'Bingo Management Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
