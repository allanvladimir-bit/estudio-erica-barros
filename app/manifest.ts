
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: "Estúdio Erica Barros",
    short_name: "Erica Barros",
    description: "Painel de agendamentos do Estúdio Erica Barros",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#FBF8F1",
    theme_color: "#244C3B",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon-192(1).png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512(1).png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
