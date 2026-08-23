import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "Finança Familiar", template: "%s | Finança Familiar" },
  description: "Organize as finanças da sua família em um só lugar.",
  applicationName: "Finança Familiar",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finança" },
  formatDetection: { telephone: false, email: false, address: false },
  icons: { icon: [{ url: "/icon", type: "image/png", sizes: "512x512" }], apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#123f4a",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="pt-BR"><body>{children}<PwaRegister /></body></html>;
}
