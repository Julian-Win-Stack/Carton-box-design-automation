import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carton Box Design",
  description: "Internal design tool for carton box artwork",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
