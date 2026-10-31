import type { DiaRecuperacao } from "@/lib/recuperacao/tipos";
import { ehNum } from "@/lib/recuperacao/estatistica";
import { Cartao } from "./Cartao";

type Status = "no painel" | "coletado, falta tela" | "seu relógio não envia" | "ideia";
interface Item {
  titulo: string;
  texto: string;
  status: Status;
}

const COR: Record<Status, string> = {
  "no painel": "border-accent/50 text-accent",
  "coletado, falta tela": "border-brand/50 text-brand",
  "seu relógio não envia": "border-danger/50 text-danger",
  ideia: "border-line text-ink-muted",
};

function itens(dias: DiaRecuperacao[]): Item[] {
  const tem = (f: (d: DiaRecuperacao) => number | null) => dias.some((d) => ehNum(f(d)));
  const sinal = (ok: boolean): Status => (ok ? "coletado, falta tela" : "seu relógio não envia");
  return [
    { titulo: "Prontidão própria + comparação com a Garmin", texto: "Score 0–100 contra a sua linha de base, com a divergência para o Training Readiness.", status: "no painel" },
    { titulo: "ACWR, monotonia e strain", texto: "Carga unificada: TRIMP do relógio + séries de força.", status: "no painel" },
    { titulo: "Dias para recuperar de um treino", texto: "Correlação da carga do dia com a VFC dos 3 dias seguintes.", status: "no painel" },
    { titulo: "Sono × volume do treino", texto: "Sono profundo + REM da noite contra as séries feitas no dia.", status: "no painel" },
    { titulo: "Alerta precoce de doença", texto: "FC de repouso, respiração e VFC fora do seu normal ao mesmo tempo.", status: "no painel" },
    { titulo: "VO2max e idade de condicionamento", texto: "Tendência de aptidão aeróbica ao longo dos meses.", status: sinal(tem((d) => d.vo2max)) },
    { titulo: "SpO2 noturna", texto: "Detecção de queda de oxigênio (apneia, altitude).", status: sinal(tem((d) => d.spo2Media)) },
    { titulo: "Temperatura cutânea", texto: "Sinal extra de doença e de ciclo hormonal. Depende do modelo do relógio.", status: "seu relógio não envia" },
    { titulo: "Deriva cardíaca no bike", texto: "FC para a mesma potência ao longo das semanas. Precisa de potência ou cadência no bike.", status: "ideia" },
    { titulo: "Grupo muscular × recuperação", texto: "Quanto a VFC cai depois de pernas, empurrar ou puxar. Precisa cruzar as séries com o grupo de cada exercício.", status: "ideia" },
    { titulo: "Diário subjetivo de 10 segundos", texto: "Dor muscular, humor e RPE para calibrar os pesos da prontidão contra o que o senhor sente.", status: "ideia" },
    { titulo: "Cafeína, álcool e refeição tardia", texto: "Registro rápido para medir o efeito na VFC e no sono profundo.", status: "ideia" },
    { titulo: "Glicemia contínua (CGM) × treino e sono", texto: "Se o senhor usar sensor, mostra o efeito do treino em jejum e da ceia no sono.", status: "ideia" },
    { titulo: "Clima e calor na hora do treino", texto: "FC mais alta em dia quente não é perda de forma. Belém pede essa correção.", status: "ideia" },
    { titulo: "Fotos de progresso alinhadas à bioimpedância", texto: "Foto de cada data de medição ao lado dos números.", status: "ideia" },
    { titulo: "Previsão de e1RM para 8 semanas", texto: "Regressão sobre o histórico de cada exercício, com faixa de incerteza.", status: "ideia" },
    { titulo: "Detector de overreaching não funcional", texto: "ACWR alto com VFC abaixo do normal por 5 dias seguidos.", status: "ideia" },
    { titulo: "Garmin Health API oficial", texto: "Plano B se a biblioteca não oficial parar de funcionar. Exige aprovação da Garmin.", status: "ideia" },
  ];
}

export function AbaRoadmap({ dias }: { dias: DiaRecuperacao[] }) {
  return (
    <Cartao titulo="O que já existe e o que ainda dá para captar" sub="O status de cada item é calculado a partir dos dados que o seu relógio realmente enviou">
      <ul className="divide-y divide-line/60">
        {itens(dias).map((i) => (
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
