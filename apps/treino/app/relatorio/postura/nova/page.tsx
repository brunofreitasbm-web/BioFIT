"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RotateCcw, Save } from "lucide-react";
import { CameraPostura, type FotoCapturada } from "@/components/CameraPostura";
import { OverlayPostura } from "@/components/OverlayPostura";
import { cn } from "@/lib/cn";
import { carregarDetector } from "@/lib/detectorPose";
import { ICON } from "@/lib/icones";
import { INFO_MEDIDA, MEDIDAS_POR_VISTA, type Medida } from "@/lib/postura";
import { LINHAS, MARCADORES, REFERENCIAS, medidasDe, pontosIniciais } from "@/lib/posturaMarcacao";
import { toISODate } from "@/lib/program";
import { getTodasPosturas, salvarPostura } from "@/lib/storage";
import type { Ponto2D, RegistroPostura, VistaPostura } from "@/lib/tipos";

// Nova avaliação postural: protocolo → foto → marcação → salvar. A foto vive só em memória
// (object URL revogado ao sair); o que persiste são os pontos e os ângulos.

type Etapa = "protocolo" | "camera" | "marcar" | "salvo";
type Deteccao = "aguardando" | "carregando" | "ok" | "sem_pessoa" | "falhou";

const CAPTURAS_POR_SESSAO = 3;

const PROTOCOLO = [
  "Celular apoiado na altura do peito, a 2–3 m, no mesmo lugar e com a mesma luz de sempre.",
  "Camiseta justa ou sem camisa; sem boné (ele esconde a orelha).",
  "Pés na largura do quadril, olhar no horizonte, respire e relaxe: a postura de sempre, não a “corrigida”.",
  `Faça ${CAPTURAS_POR_SESSAO} capturas por sessão: vale a mediana, que absorve o erro de marcação.`,
];

const fmt = (n: number | undefined) => (n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default function NovaPosturaPage() {
  const [vista, setVista] = useState<VistaPostura>("perfil");
  const [etapa, setEtapa] = useState<Etapa>("protocolo");
  const [foto, setFoto] = useState<FotoCapturada | null>(null);
  const [pontos, setPontos] = useState<Record<string, Ponto2D>>({});
  const [confianca, setConfianca] = useState<number | null>(null);
  const [deteccao, setDeteccao] = useState<Deteccao>("aguardando");
  const [salvasHoje, setSalvasHoje] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const proporcao = foto ? foto.largura / foto.altura : 1;
  const medidas = useMemo(() => (foto && Object.keys(pontos).length ? medidasDe(vista, pontos, proporcao) : {}), [foto, pontos, vista, proporcao]);

  useEffect(() => {
    const hoje = toISODate(new Date());
    setSalvasHoje(Object.values(getTodasPosturas()).filter((r) => r.data === hoje && r.vista === vista).length);
  }, [vista, etapa]);

  // Revoga a foto ao trocar ou sair: nada dela fica guardado.
  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.src);
  }, [foto]);

  async function aoCapturar(f: FotoCapturada) {
    setFoto(f);
    setEtapa("marcar");
    setDeteccao("carregando");
    const prop = f.largura / f.altura;
    try {
      const img = new Image();
      img.src = f.src;
      await img.decode();
      imgRef.current = img;
      const detector = await carregarDetector();
      const pose = await detector.detectar(img);
      const ini = pontosIniciais(vista, pose, prop);
      setPontos(ini.pontos);
      setConfianca(ini.confiancaDeteccao);
      setDeteccao(pose ? "ok" : "sem_pessoa");
    } catch {
      const ini = pontosIniciais(vista, null, prop);
      setPontos(ini.pontos);
      setConfianca(null);
      setDeteccao("falhou");
    }
  }

  function refazer() {
    setFoto(null);
    setPontos({});
    setEtapa("camera");
  }

  function salvar() {
    if (!foto) return;
    const agora = new Date();
    const quando = `${toISODate(agora)}T${agora.toTimeString().slice(0, 8)}`;
    const registro: RegistroPostura = {
      chave: `postura:${quando}:${vista}`,
      vista,
      data: quando.slice(0, 10),
      quando,
      proporcao: Math.round(proporcao * 1000) / 1000,
      pontos: Object.fromEntries(Object.entries(pontos).map(([k, p]) => [k, { x: Math.round(p.x * 10000) / 10000, y: Math.round(p.y * 10000) / 10000 }])),
      medidas: Object.fromEntries(Object.entries(medidas).filter(([, v]) => v != null)) as Record<string, number>,
      confiancaDeteccao: confianca,
      registradoEm: agora.toISOString(),
    };
    if (salvarPostura(registro)) setEtapa("salvo");
  }

  const marcadores = MARCADORES[vista];
  const manuais = marcadores.filter((m) => m.cor === "manual");

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center gap-2">
        <Link href="/relatorio/postura" className="toque flex h-11 w-11 items-center justify-center rounded-full text-ink-muted" aria-label="Voltar">
          <ArrowLeft size={ICON.md} aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-ink">Nova avaliação</h1>
          <p className="text-xs text-ink-muted">
            {vista === "perfil" ? "Perfil (cifose, cabeça, tronco)" : "Frontal (ombros, quadril, joelhos)"} · {salvasHoje}/{CAPTURAS_POR_SESSAO} hoje
          </p>
        </div>
      </header>

      {etapa === "protocolo" && (
        <>
          <section className="space-y-3 rounded-xl border border-line bg-base-800 p-4 shadow-sm">
            <div className="flex gap-1.5 rounded-full border border-line bg-base-700 p-1 text-sm font-medium">
              {(["perfil", "frontal"] as VistaPostura[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
                  aria-pressed={vista === v}
                  className={cn(
                    "toque flex min-h-11 flex-1 items-center justify-center rounded-full",
                    vista === v ? "bg-brand text-on-solid shadow-sm" : "text-ink-muted",
                  )}
                >
                  {v === "perfil" ? "Perfil" : "Frontal"}
                </button>
              ))}
            </div>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-muted">
              {PROTOCOLO.map((p) => (
                <li key={p}>{p}</li>
              ))}
              {vista === "perfil" && <li>De lado para a câmera, braços soltos. Depois da foto você marca C7, o ápice da curva e T12 nas costas.</li>}
            </ol>
            <p className="text-[11px] text-ink-faint">
              Medida de foto, não diagnóstico. O que vale é a comparação entre sessões feitas do mesmo jeito.
            </p>
          </section>
          <button
            type="button"
            onClick={() => setEtapa("camera")}
            className="toque flex min-h-12 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-solid shadow-sm"
          >
            Abrir câmera
          </button>
        </>
      )}

      {etapa === "camera" && <CameraPostura silhueta={vista} aoCapturar={aoCapturar} />}

      {etapa === "marcar" && foto && (
        <>
          <OverlayPostura
            src={foto.src}
            proporcao={proporcao}
            pontos={pontos}
            marcadores={marcadores}
            linhas={LINHAS[vista]}
            referencias={REFERENCIAS[vista]}
            aoMover={(nome, p) => setPontos((atual) => ({ ...atual, [nome]: p }))}
            editavel={deteccao !== "carregando"}
          />
          <section className="space-y-2 rounded-xl border border-line bg-base-800 p-4 shadow-sm">
            {deteccao === "carregando" && <p className="text-sm text-ink-muted">Detectando a pose… (na primeira vez baixa o modelo, ~20 MB)</p>}
            {deteccao === "sem_pessoa" && <p className="text-sm text-danger">Não achei ninguém na foto. Os pontos estão num gabarito: arraste cada um para o lugar, ou refaça a foto.</p>}
            {deteccao === "falhou" && <p className="text-sm text-danger">Detector indisponível (sem rede na primeira vez?). Marque todos os pontos à mão arrastando.</p>}
            {deteccao === "ok" && (
              <p className="text-sm text-ink-muted">
                Pose detectada{confianca != null && ` (confiança ${Math.round(confianca * 100)}%)`}. Confira os pontos verdes e arraste se precisar.
                {manuais.length > 0 && " Os laranja são seus: arraste cada um até o ponto certo nas costas."}
              </p>
            )}
            {manuais.length > 0 && (
              <ul className="space-y-1 text-xs text-ink-muted">
                {manuais.map((m) => (
                  <li key={m.nome}>
                    <span className="font-semibold text-ink">{m.rotulo}:</span> {m.ajuda}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-ink-faint">Arraste a partir de qualquer lugar do ponto: o deslocamento do dedo move o ponto, então ele não fica escondido.</p>
          </section>
          <section className="grid grid-cols-2 gap-2">
            {MEDIDAS_POR_VISTA[vista].map((m: Medida) => (
              <div key={m} className="rounded-xl border border-line bg-base-800 p-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">{INFO_MEDIDA[m].curto}</p>
                <p className="font-display text-2xl font-bold tabular-nums text-ink">
                  {fmt(medidas[m])}
                  <span className="text-sm font-medium text-ink-muted">{INFO_MEDIDA[m].unidade}</span>
                </p>
              </div>
            ))}
          </section>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refazer}
              className="toque flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-base-800 text-sm font-semibold text-ink-muted"
            >
              <RotateCcw size={ICON.sm} aria-hidden="true" /> Refazer foto
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={deteccao === "carregando"}
              className="toque flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-on-solid shadow-sm disabled:opacity-50"
            >
              <Save size={ICON.sm} aria-hidden="true" /> Salvar captura
            </button>
          </div>
        </>
      )}

      {etapa === "salvo" && (
        <>
          <section className="space-y-2 rounded-xl border border-line bg-base-800 p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-accent">
              <Check size={ICON.md} aria-hidden="true" /> Captura salva ({salvasHoje}/{CAPTURAS_POR_SESSAO} hoje)
            </h2>
            <ul className="divide-y divide-line text-sm">
              {MEDIDAS_POR_VISTA[vista].map((m) => (
                <li key={m} className="flex min-h-10 items-center justify-between py-1.5">
                  <span className="text-ink-muted">{INFO_MEDIDA[m].rotulo}</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {fmt(medidas[m])}
                    {INFO_MEDIDA[m].unidade}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-ink-faint">A foto foi descartada; só os pontos e os ângulos ficam guardados.</p>
          </section>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refazer}
              className="toque flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-solid shadow-sm"
            >
              {salvasHoje < CAPTURAS_POR_SESSAO ? `Mais uma (${salvasHoje + 1}/${CAPTURAS_POR_SESSAO})` : "Mais uma captura"}
            </button>
            <Link
              href="/relatorio/postura"
              className="toque flex min-h-12 flex-1 items-center justify-center rounded-full border border-line bg-base-800 text-sm font-semibold text-ink-muted"
            >
              Ver evolução
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
