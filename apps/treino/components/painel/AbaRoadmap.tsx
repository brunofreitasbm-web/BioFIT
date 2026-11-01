import { Cartao } from "./Cartao";

type Status = "no painel" | "ideia";
interface Item {
  titulo: string;
  texto: string;
  status: Status;
}

const ROTULO_STATUS: Record<Status, string> = {
  "no painel": "Já disponível",
  ideia: "Em planejamento",
};

const COR: Record<Status, string> = {
  "no painel": "border-accent/50 text-accent",
  ideia: "border-line text-ink-muted",
};

const ITENS: Item[] = [
  {
    titulo: "Prontidão diária com comparação ao relógio",
    texto: "Nota de 0 a 100 sobre sua disposição para o dia, comparada lado a lado com a leitura do relógio Garmin.",
    status: "no painel",
  },
  {
    titulo: "Termômetro de sobrecarga e equilíbrio de treino",
    texto: "Avalia se a intensidade desta semana está equilibrada com o seu histórico do mês para evitar lesões.",
    status: "no painel",
  },
  {
    titulo: "Tempo de recuperação pós-treino",
    texto: "Identifica quantos dias seu coração e músculos levam para se recuperar após treinos pesados.",
    status: "no painel",
  },
  {
    titulo: "Qualidade do sono × rendimento no treino",
    texto: "Mostra como noites bem dormidas (fases profunda e REM) aumentam sua força na musculação.",
    status: "no painel",
  },
  {
    titulo: "Treinar à noite × qualidade do sono",
    texto: "Avalia se praticar exercícios mais tarde afeta o tempo de sono profundo restaurador.",
    status: "no painel",
  },
  {
    titulo: "Aviso preventivo de imunidade baixa",
    texto: "Detecta alterações sutis nos batimentos dormindo e respiração antes de você sentir mal-estar.",
    status: "no painel",
  },
  {
    titulo: "Tempo de recuperação por grupo muscular",
    texto: "Descubra quanto tempo cada parte do corpo (pernas, peito, costas) leva para estar 100% pronta de novo.",
    status: "ideia",
  },
  {
    titulo: "Check-in rápido de disposição (10 segundos)",
    texto: "Registro diário de dor muscular, cansaço e ânimo para calibrar as dicas com o que você realmente sente.",
    status: "ideia",
  },
  {
    titulo: "Impacto de café, álcool e refeições tardias",
    texto: "Descubra com clareza o que ajuda ou prejudica o descanso e a recuperação do seu corpo.",
    status: "ideia",
  },
  {
    titulo: "Açúcar no sangue (glicemia) durante treino e sono",
    texto: "Integração opcional com sensor contínuo para acompanhar energia e efeito das refeições.",
    status: "ideia",
  },
  {
    titulo: "Ajuste de intensidade pelo calor e clima",
    texto: "Compensa batimentos mais rápidos em dias muito quentes, para não confundir calor com perda de condicionamento.",
    status: "ideia",
  },
  {
    titulo: "Fotos de progresso lado a lado com as medidas",
    texto: "Veja fotos de evolução do corpo organizadas cronologicamente com as pesagens da bioimpedância.",
    status: "ideia",
  },
  {
    titulo: "Projeção de evolução da sua força máxima",
    texto: "Estimativa de quanto peso você conseguirá erguer nos exercícios nas próximas semanas com base no seu ritmo.",
    status: "ideia",
  },
  {
    titulo: "Detector de estafa e cansaço acumulado",
    texto: "Alerta caso você passe muitos dias com esforço alto e recuperação baixa, prevenindo esgotamento físico.",
    status: "ideia",
  },
  {
    titulo: "Resumo semanal em PDF para download",
    texto: "Relatório visual com o resumo da sua semana (treinos, sono e evolução) pronto para salvar ou compartilhar.",
    status: "ideia",
  },
];

export function AbaRoadmap() {
  return (
    <Cartao titulo="O que já está disponível e novidades planejadas" sub="Recursos ativos no painel e novas ferramentas que estão sendo desenvolvidas para você">
      <ul className="divide-y divide-line/60">
        {ITENS.map((i) => (
          <li key={i.titulo} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium text-ink">{i.titulo}</div>
              <div className="text-xs text-ink-muted">{i.texto}</div>
            </div>
            <span className={`inline-flex shrink-0 self-start rounded-full border px-2 py-0.5 text-[11px] font-medium ${COR[i.status]}`}>
              {ROTULO_STATUS[i.status]}
            </span>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
