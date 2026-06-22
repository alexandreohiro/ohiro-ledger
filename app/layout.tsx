import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Ohiro — Tactical Financial Wallet',
  description: 'Personal finance management with the soul of a spreadsheet, dashboard intelligence, and the look of a financial control center.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0d1a12',
  userScalable: false,
}

// Aplica a classe de tema antes do primeiro paint, lendo a preferência salva
// (localStorage) ou caindo para o tema escuro/militar padrão. Evita flash de
// tema errado (FOUC) já que a preferência real só chega do Supabase depois da hidratação.
const THEME_INIT_SCRIPT = `(function(){try{
  var mode=localStorage.getItem('ohiro-theme-mode')||'dark';
  var palette=localStorage.getItem('ohiro-theme-palette')||'military';
  var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root=document.documentElement;
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  root.classList.toggle('theme-vscode', palette === 'vscode-terminal');
}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-US" className={`${geistSans.variable} ${geistMono.variable} dark bg-background`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <Toaster theme="dark" richColors position="bottom-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
