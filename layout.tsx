import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boissons ANBA – Hors connexion",
  description: "Application autonome de lecture, validation et comptabilisation des boissons par table.",
  manifest: "./manifest.webmanifest",
  icons: { icon: "./favicon.svg", apple: "./favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
