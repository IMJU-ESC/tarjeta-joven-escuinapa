import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// AQUÍ ESTÁ LA MAGIA DEL TÍTULO Y EL ICONO
export const metadata: Metadata = {
  title: 'Tarjeta IMJU Escuinapa',
  description: 'Tu acceso exclusivo a descuentos, oportunidades de empleo y beneficios en todo el municipio.',
  icons: {
    icon: '/imju-oficial.png', // Aquí vinculamos tu logo a la pestaña
    apple: '/imju-oficial.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}