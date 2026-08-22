import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME || "Finança Familiar",
    short_name: "Finança",
    description: "Organize as finanças da sua família em um só lugar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F7F8",
    theme_color: "#0F4C5C",
    orientation: "portrait-primary",
    lang: "pt-BR",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
