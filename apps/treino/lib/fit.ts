// Gerador de arquivo .FIT (Garmin) de uma sessão de musculação, sem dependências.
// Estrutura: file_id → event(start) → set* → lap → session → activity. O Garmin Connect lê as
// mensagens `set` como séries de treino de força (exercício, reps e carga).

// Segundos entre o epoch Unix e o epoch do FIT (1989-12-31T00:00:00Z).
const EPOCH_FIT_S = 631065600;

const INVALIDO_U16 = 0xffff;
const INVALIDO_U32 = 0xffffffff;

// Tipos base do FIT: código, tamanho em bytes.
const ENUM = { cod: 0x00, tam: 1 };
const U16 = { cod: 0x84, tam: 2 };
const U32 = { cod: 0x86, tam: 4 };
const U32Z = { cod: 0x8c, tam: 4 };

type Tipo = typeof ENUM;
type Campo = { num: number; tipo: Tipo; valor: number };

// Categorias de exercício de força do perfil FIT (exercise_category).
const CATEGORIA: Record<string, number> = {
  supino: 0,
  panturrilha: 1,
  rosca: 6,
  "stiff": 7,
  "terra": 7,
  crucifixo: 8,
  "peck deck": 8,
  "elevação pélvica": 9,
  "hip thrust": 9,
  "elevação lateral": 13,
  "mesa flexora": 14,
  "cadeira flexora": 14,
  flexora: 14,
  afundo: 16,
  "búlgaro": 16,
  "barra fixa": 20,
  puxada: 20,
  graviton: 20,
  remada: 22,
  "desenvolvimento": 23,
  encolhimento: 25,
  agachamento: 27,
  "hack": 27,
  "leg press": 27,
  tríceps: 29,
  triceps: 29,
  extensora: 27,
};
const CATEGORIA_DESCONHECIDA = 65534;

export function categoriaFit(nomeExercicio: string): number {
  const n = nomeExercicio.toLowerCase();
  for (const [chave, cod] of Object.entries(CATEGORIA)) if (n.includes(chave)) return cod;
  return CATEGORIA_DESCONHECIDA;
}

export function crc16(bytes: Uint8Array, crc = 0): number {
  const tabela = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];
  for (const b of bytes) {
    let tmp = tabela[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ tabela[b & 0xf];
    tmp = tabela[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ tabela[(b >> 4) & 0xf];
  }
  return crc;
}

class Escritor {
  private bytes: number[] = [];

  u8(v: number) {
    this.bytes.push(v & 0xff);
  }
  u16(v: number) {
    this.u8(v);
    this.u8(v >> 8);
  }
  u32(v: number) {
    this.u16(v);
    this.u16(v >>> 16);
  }
  valor(tipo: Tipo, v: number) {
    if (tipo.tam === 1) this.u8(v);
    else if (tipo.tam === 2) this.u16(v);
    else this.u32(v);
  }
  definicao(local: number, global: number, campos: Campo[]) {
    this.u8(0x40 | local);
    this.u8(0); // reservado
    this.u8(0); // little endian
    this.u16(global);
    this.u8(campos.length);
    for (const c of campos) {
      this.u8(c.num);
      this.u8(c.tipo.tam);
      this.u8(c.tipo.cod);
    }
  }
  dados(local: number, campos: Campo[]) {
    this.u8(local);
    for (const c of campos) this.valor(c.tipo, c.valor);
  }
  // Definição + dados de uma mensagem que aparece uma vez só.
  mensagem(local: number, global: number, campos: Campo[]) {
    this.definicao(local, global, campos);
    this.dados(local, campos);
  }
  get tamanho() {
    return this.bytes.length;
  }
  toBytes() {
    return Uint8Array.from(this.bytes);
  }
}

export interface SerieFit {
  nomeExercicio: string;
  cargaKg: number | null;
  reps: number | null;
  fim: Date; // quando a série foi registrada
}

export interface SessaoFit {
  inicio: Date;
  fim: Date;
  series: SerieFit[];
}

const MSG = { FILE_ID: 0, SESSION: 18, LAP: 19, EVENT: 21, ACTIVITY: 34, SET: 225 };
const TS = 253;

function tsFit(d: Date): number {
  return Math.max(0, Math.floor(d.getTime() / 1000) - EPOCH_FIT_S);
}

// Duração estimada de uma série: o app não guarda o início, só o instante do registro.
const SEG_POR_REP = 4;
const SEG_MINIMO_SERIE = 15;

export function gerarFit(sessao: SessaoFit): Uint8Array {
  const ordenadas = [...sessao.series].sort((a, b) => a.fim.getTime() - b.fim.getTime());
  const inicioMs = sessao.inicio.getTime();
  // O fim nunca pode ficar antes da última série (registro tardio, relógio ajustado).
  const fimMs = Math.max(sessao.fim.getTime(), ordenadas.at(-1)?.fim.getTime() ?? 0, inicioMs + 1000);
  const inicio = sessao.inicio;
  const fim = new Date(fimMs);
  const duracaoMs = fimMs - inicioMs;

  const w = new Escritor();

  w.mensagem(0, MSG.FILE_ID, [
    { num: 0, tipo: ENUM, valor: 4 }, // type = activity
    { num: 1, tipo: U16, valor: 255 }, // manufacturer = development
    { num: 2, tipo: U16, valor: 0 },
    { num: 3, tipo: U32Z, valor: 1 },
    { num: 4, tipo: U32, valor: tsFit(inicio) },
  ]);

  w.mensagem(1, MSG.EVENT, [
    { num: TS, tipo: U32, valor: tsFit(inicio) },
    { num: 0, tipo: ENUM, valor: 0 }, // timer
    { num: 1, tipo: ENUM, valor: 0 }, // start
  ]);

  // Todas as séries compartilham a mesma definição (local 2).
  const camposSet = (s: SerieFit, inicioSerie: Date, duracaoS: number): Campo[] => [
    { num: TS, tipo: U32, valor: tsFit(s.fim) },
    { num: 0, tipo: U32, valor: Math.round(duracaoS * 1000) },
    { num: 3, tipo: U16, valor: s.reps == null ? INVALIDO_U16 : Math.min(s.reps, 0xfffe) },
    { num: 4, tipo: U16, valor: s.cargaKg == null ? INVALIDO_U16 : Math.min(Math.round(s.cargaKg * 16), 0xfffe) },
    { num: 5, tipo: ENUM, valor: 1 }, // active
    { num: 6, tipo: U32, valor: tsFit(inicioSerie) },
    { num: 7, tipo: U16, valor: categoriaFit(s.nomeExercicio) },
    { num: 10, tipo: U16, valor: 0 }, // message_index, ajustado abaixo
  ];
  let definiu = false;
  let anteriorMs = inicioMs;
  ordenadas.forEach((s, i) => {
    const fimSerieMs = Math.min(Math.max(s.fim.getTime(), inicioMs), fimMs);
    const estimadaS = Math.max(SEG_MINIMO_SERIE, (s.reps ?? 0) * SEG_POR_REP);
    const inicioSerieMs = Math.max(anteriorMs, fimSerieMs - estimadaS * 1000);
    const duracaoS = Math.max(1, (fimSerieMs - inicioSerieMs) / 1000);
    const campos = camposSet({ ...s, fim: new Date(fimSerieMs) }, new Date(inicioSerieMs), duracaoS);
    campos[campos.length - 1].valor = i;
    if (!definiu) {
      w.definicao(2, MSG.SET, campos);
      definiu = true;
    }
    w.dados(2, campos);
    anteriorMs = fimSerieMs;
  });

  const totalS = Math.round(duracaoMs / 1000) * 1000;
  w.mensagem(3, MSG.LAP, [
    { num: 254, tipo: U16, valor: 0 },
    { num: TS, tipo: U32, valor: tsFit(fim) },
    { num: 0, tipo: ENUM, valor: 9 }, // lap
    { num: 1, tipo: ENUM, valor: 1 }, // stop
    { num: 2, tipo: U32, valor: tsFit(inicio) },
    { num: 7, tipo: U32, valor: totalS },
    { num: 8, tipo: U32, valor: totalS },
  ]);

  w.mensagem(1, MSG.EVENT, [
    { num: TS, tipo: U32, valor: tsFit(fim) },
    { num: 0, tipo: ENUM, valor: 0 },
    { num: 1, tipo: ENUM, valor: 4 }, // stop_all
  ]);

  w.mensagem(4, MSG.SESSION, [
    { num: 254, tipo: U16, valor: 0 },
    { num: TS, tipo: U32, valor: tsFit(fim) },
    { num: 0, tipo: ENUM, valor: 8 }, // session
    { num: 1, tipo: ENUM, valor: 1 }, // stop
    { num: 2, tipo: U32, valor: tsFit(inicio) },
    { num: 7, tipo: U32, valor: totalS },
    { num: 8, tipo: U32, valor: totalS },
    { num: 5, tipo: ENUM, valor: 10 }, // sport = training
    { num: 6, tipo: ENUM, valor: 20 }, // sub_sport = strength_training
    { num: 25, tipo: U16, valor: 0 },
    { num: 26, tipo: U16, valor: 1 },
  ]);

  w.mensagem(5, MSG.ACTIVITY, [
    { num: TS, tipo: U32, valor: tsFit(fim) },
    { num: 0, tipo: U32, valor: totalS },
    { num: 1, tipo: U16, valor: 1 },
    { num: 2, tipo: ENUM, valor: 0 }, // manual
    { num: 3, tipo: ENUM, valor: 26 }, // activity
    { num: 4, tipo: ENUM, valor: 1 }, // stop
  ]);

  const corpo = w.toBytes();
  const cab = new Escritor();
  cab.u8(14);
  cab.u8(0x20); // protocolo 2.0
  cab.u16(2100); // versão do perfil
  cab.u32(corpo.length);
  for (const c of ".FIT") cab.u8(c.charCodeAt(0));
  const cabBytes = cab.toBytes();
  const cabCompleto = new Escritor();
  for (const b of cabBytes) cabCompleto.u8(b);
  cabCompleto.u16(crc16(cabBytes));
  const cabFinal = cabCompleto.toBytes();

  const sem = new Uint8Array(cabFinal.length + corpo.length);
  sem.set(cabFinal, 0);
  sem.set(corpo, cabFinal.length);
  const saida = new Uint8Array(sem.length + 2);
  saida.set(sem, 0);
  const crc = crc16(sem);
  saida[sem.length] = crc & 0xff;
  saida[sem.length + 1] = crc >> 8;
  return saida;
}
