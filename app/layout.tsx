
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estúdio Erica Barros",
  applicationName: "Estúdio Erica Barros",
  description:
    "Beleza, cuidado e elegância. Agende seu horário no Estúdio Erica Barros.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Estúdio Erica Barros",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
