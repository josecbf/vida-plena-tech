// Tokens de marca da Videira (provisórios — podem mudar)

export const brand = {
  nome: "Videira",
  tagline: "A plataforma que reúne sua igreja",
  cores: {
    indigo: "#3D4E9E", // primária
    ambar: "#F2A93B", // acento
    salvia: "#5B8C7B", // apoio
    tinta: "#0F172A",
    cinza: "#475569",
    nevoa: "#F8FAFC",
  },
  fontes: {
    ui: "Inter, ui-sans-serif, system-ui, sans-serif",
    titulo: "Fraunces, Georgia, serif",
  },
} as const;

export type BrandCor = keyof typeof brand.cores;
