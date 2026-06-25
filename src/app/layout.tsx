import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth/auth-context";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "Freshkite LMS",
  description: "Freshkite Learning Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script to prevent flash of wrong theme
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('theme');
        if (theme === 'light' || theme === 'dark') {
          document.documentElement.classList.add(theme);
        } else {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}
      >
        <ThemeProvider defaultTheme="dark">
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  success: { duration: 3000 },
                  error: { duration: 5000 },
                  style: { fontSize: '14px', maxWidth: '380px' },
                }}
              />
            </AuthProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
