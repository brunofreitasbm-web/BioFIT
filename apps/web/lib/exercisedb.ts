// Fonte gratuita e sem chave de API de imagens de exercícios (fork de dados
// do estilo ExerciseDB), servida via raw.githubusercontent.com.
// https://github.com/yuhonas/free-exercise-db
const DATASET_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export interface ExerciseDbEntry {
  id: string;
  name: string;
  images: string[];
}

let cache: ExerciseDbEntry[] | null = null;
let inflight: Promise<ExerciseDbEntry[]> | null = null;

export async function carregarExerciseDb(): Promise<ExerciseDbEntry[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch(DATASET_URL)
      .then((res) => res.json())
      .then((dados: ExerciseDbEntry[]) => {
        cache = dados;
        return dados;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export function exerciseDbImageUrl(id: string, index = 0) {
  return `${IMAGE_BASE_URL}${id}/${index}.jpg`;
}

export async function buscarExerciseDb(query: string, limite = 8): Promise<ExerciseDbEntry[]> {
  const termo = query.trim().toLowerCase();
  if (termo.length < 2) return [];
  const dados = await carregarExerciseDb();
  return dados.filter((e) => e.name.toLowerCase().includes(termo)).slice(0, limite);
}
