import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vida Plena Tech",
  description:
    "Plataforma modular para igrejas — demo local (Core + Pessoas + GCs + Eventos).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
