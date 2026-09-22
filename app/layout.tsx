import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BATCH · Bar-Inventur",
  description: "Pre-Batches zählen. Zutaten in Originalflaschen und Zentiliter umrechnen.",
  icons: { icon: "./favicon.svg", shortcut: "./favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
