// Fonte gratuita e sem chave de API de imagens de exercícios (fork de dados
// do estilo ExerciseDB), servida via raw.githubusercontent.com.
// https://github.com/yuhonas/free-exercise-db
const IMAGE_BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export function exerciseDbImageUrl(id: string, index = 0) {
  return `${IMAGE_BASE_URL}${id}/${index}.jpg`;
}
