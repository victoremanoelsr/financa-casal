import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: process.env.NEXT_PUBLIC_APP_NAME || "Finança Familiar",
    short_name: "Finança",
    description: "Organize as finanças da sua família em um só lugar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F7F8",
    theme_color: "#0F4C5C",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["finance", "productivity"],
    shortcuts: [
      { name: "Dashboard", short_name: "Início", description: "Resumo financeiro da família", url: "/" },
      { name: "Novo lançamento", short_name: "Lançamento", description: "Cadastrar uma receita ou despesa", url: "/financeiro?novo=1" },
      { name: "Contas", short_name: "Contas", description: "Consultar contas e pagamentos", url: "/contas" },
    ],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
