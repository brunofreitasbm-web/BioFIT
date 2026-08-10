import type { GrupoMuscular, Objetivo, TipoBloco } from "./enums";

export interface TemplateItem {
  nome: string;
  grupoMuscular: GrupoMuscular;
  repeticoesAlvo: string;
  cargaKgSugerida?: number;
}

export interface TemplateBloco {
  tipo: TipoBloco;
  nome?: string;
  rounds: number;
  descansoSegundos: number;
  itens: TemplateItem[];
}

// Modelos sugestivos por objetivo — ponto de partida que o personal revisa/ajusta
// antes de salvar a ficha. Não substitui o julgamento do personal, só reduz cliques.
export const OBJETIVO_TEMPLATES: Record<Objetivo, TemplateBloco[]> = {
  HIPERTROFIA: [
    {
      tipo: "SIMPLES",
      nome: "Peito",
      rounds: 4,
      descansoSegundos: 75,
      itens: [{ nome: "Supino Reto", grupoMuscular: "PEITO", repeticoesAlvo: "8-12" }],
    },
    {
      tipo: "BI_SET",
      nome: "Costas + Bíceps",
      rounds: 3,
      descansoSegundos: 60,
      itens: [
        { nome: "Puxada Frente", grupoMuscular: "COSTAS", repeticoesAlvo: "8-12" },
        { nome: "Rosca Direta", grupoMuscular: "BICEPS", repeticoesAlvo: "10-12" },
      ],
    },
    {
      tipo: "SIMPLES",
      nome: "Pernas",
      rounds: 4,
      descansoSegundos: 90,
      itens: [{ nome: "Leg Press", grupoMuscular: "QUADRICEPS", repeticoesAlvo: "8-12" }],
    },
  ],
  FORCA: [
    {
      tipo: "SIMPLES",
      nome: "Empurrar",
      rounds: 5,
      descansoSegundos: 150,
      itens: [{ nome: "Supino Reto", grupoMuscular: "PEITO", repeticoesAlvo: "3-6" }],
    },
    {
      tipo: "SIMPLES",
      nome: "Puxar",
      rounds: 5,
      descansoSegundos: 150,
      itens: [{ nome: "Remada Curvada", grupoMuscular: "COSTAS", repeticoesAlvo: "3-6" }],
    },
    {
      tipo: "SIMPLES",
      nome: "Agachamento",
      rounds: 5,
      descansoSegundos: 180,
      itens: [{ nome: "Agachamento Livre", grupoMuscular: "QUADRICEPS", repeticoesAlvo: "3-6" }],
    },
  ],
  EMAGRECIMENTO: [
    {
      tipo: "CIRCUITO",
      nome: "Circuito metabólico",
      rounds: 4,
      descansoSegundos: 25,
      itens: [
        { nome: "Agachamento Livre", grupoMuscular: "QUADRICEPS", repeticoesAlvo: "15-20" },
        { nome: "Remada Curvada", grupoMuscular: "COSTAS", repeticoesAlvo: "15-20" },
        { nome: "Elevação Lateral", grupoMuscular: "OMBRO", repeticoesAlvo: "15-20" },
      ],
    },
    {
      tipo: "AQUECIMENTO",
      nome: "Cardio",
      rounds: 1,
      descansoSegundos: 0,
      itens: [{ nome: "Esteira", grupoMuscular: "CARDIO", repeticoesAlvo: "15-20 min" }],
    },
  ],
  RECUPERACAO_POS_LESAO: [
    {
      tipo: "SIMPLES",
      nome: "Mobilidade",
      rounds: 3,
      descansoSegundos: 90,
      itens: [{ nome: "Extensão do Cotovelo no Banco", grupoMuscular: "TRICEPS", repeticoesAlvo: "15-20" }],
    },
    {
      tipo: "SIMPLES",
      nome: "Fortalecimento leve",
      rounds: 3,
      descansoSegundos: 90,
      itens: [{ nome: "Elevação Lateral", grupoMuscular: "OMBRO", repeticoesAlvo: "15-20" }],
    },
  ],
};
