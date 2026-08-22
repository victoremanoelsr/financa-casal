import type { Metadata } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Finança Familiar",
  description: "Organize as finanças da sua família em um só lugar.",
  applicationName: "Finança Familiar",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finança" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="pt-BR"><body>{children}<PwaRegister /></body></html>;
}
