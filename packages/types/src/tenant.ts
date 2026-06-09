// Núcleo Core — multi-tenant (mock para a demo)

export interface Tenant {
  id: string;
  nome: string;
  campus: Campus[];
}

export interface Campus {
  id: string;
  nome: string;
}

export const TENANT: Tenant = {
  id: "t_videira",
  nome: "Igreja Videira",
  campus: [
    { id: "c_sede", nome: "Sede" },
    { id: "c_zona_sul", nome: "Zona Sul" },
  ],
};
