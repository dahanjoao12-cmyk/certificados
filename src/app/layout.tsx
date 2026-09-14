import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certificados Digitais",
  description: "Gestão de certificados digitais e empresas do escritório.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
