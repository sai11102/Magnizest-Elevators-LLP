import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/sw-register";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Magnizest Elevators LLP | AMC Management System",
  description: "Professional AMC management dashboard for Magnizest Elevators LLP with contract tracking, service alerts, and analytics.",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Magnizest Elevators LLP" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <AuthProvider>
          {children}
          <Footer />
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegistration />
        </AuthProvider>
      </body>
    </html>
  );
}
