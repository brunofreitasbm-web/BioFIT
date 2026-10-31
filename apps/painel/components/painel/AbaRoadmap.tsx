import { Cartao } from "./Cartao";

type Status = "no painel" | "ideia";
interface Item {
  titulo: string;
  texto: string;
  status: Status;
}

const COR: Record<Status, string> = {
  "no painel": "border-accent/50 text-accent",
  ideia: "border-line text-ink-muted",
};

const ITENS: Item[] = [
  { titulo: "Prontidão própria + comparação com a Garmin", texto: "Score 0–100 contra a sua linha de base, com a divergência para o Training Readiness.", status: "no painel" },
  { titulo: "ACWR, monotonia e strain", texto: "Carga unificada: TRIMP do relógio + séries de força.", status: "no painel" },
  { titulo: "Dias para recuperar de um treino", texto: "Correlação da carga do dia com a VFC dos 3 dias seguintes.", status: "no painel" },
  { titulo: "Sono × volume do treino", texto: "Sono profundo + REM da noite contra as séries feitas no dia.", status: "no painel" },
  { titulo: "Horário do treino × sono profundo", texto: "Treinar à noite muda o sono profundo da madrugada?", status: "no painel" },
  { titulo: "Alerta precoce de doença", texto: "FC de repouso, respiração e VFC fora do seu normal ao mesmo tempo.", status: "no painel" },
  { titulo: "Grupo muscular × recuperação", texto: "Quanto a VFC cai depois de pernas, empurrar ou puxar. Precisa cruzar as séries com o grupo de cada exercício.", status: "ideia" },
  { titulo: "Diário subjetivo de 10 segundos", texto: "Dor muscular, humor e RPE para calibrar os pesos da prontidão contra o que o senhor sente.", status: "ideia" },
  { titulo: "Cafeína, álcool e refeição tardia", texto: "Registro rápido para medir o efeito na VFC e no sono profundo.", status: "ideia" },
  { titulo: "Glicemia contínua (CGM) × treino e sono", texto: "Se o senhor usar sensor, mostra o efeito do treino em jejum e da ceia no sono.", status: "ideia" },
  { titulo: "Clima e calor na hora do treino", texto: "FC mais alta em dia quente não é perda de forma. Belém pede essa correção.", status: "ideia" },
  { titulo: "Fotos de progresso alinhadas à bioimpedância", texto: "Foto de cada data de medição ao lado dos números.", status: "ideia" },
  { titulo: "Previsão de e1RM para 8 semanas", texto: "Regressão sobre o histórico de cada exercício, com faixa de incerteza.", status: "ideia" },
  { titulo: "Detector de overreaching não funcional", texto: "ACWR alto com VFC abaixo do normal por 5 dias seguidos.", status: "ideia" },
  { titulo: "Relatório semanal em PDF", texto: "Resumo de recuperação, carga e corpo da semana para guardar ou enviar.", status: "ideia" },
];

export function AbaRoadmap() {
  return (
    <Cartao titulo="O que já existe e o que ainda dá para captar">
      <ul className="divide-y divide-line/60">
        {ITENS.map((i) => (
          <li key={i.titulo} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium text-ink">{i.titulo}</div>
              <div className="text-xs text-ink-muted">{i.texto}</div>
            </div>
            <span className={`inline-flex shrink-0 self-start rounded-full border px-2 py-0.5 text-[11px] font-medium ${COR[i.status]}`}>{i.status}</span>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
