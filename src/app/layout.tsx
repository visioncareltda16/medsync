import type { Metadata } from "next";
import { Open_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedSync | Gestão de Serviços Médicos",
  description: "Sistema de controle e gestão de atendimentos e repasses médicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${openSans.variable} ${geistMono.variable} antialiased h-full`}
    >
      <body className="h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans font-light">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
