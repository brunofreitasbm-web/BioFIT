// Fotos de início e fim do movimento (free-exercise-db, Unlicense — ver NOTICE.md), sobrepostas
// e alternando em loop: um "GIF" de duas poses sem precisar de GIF. São só referência do
// padrão de movimento; a máquina exata da academia pode ser outra.
export function ImagemExercicio({ pasta, nome }: { pasta: string; nome: string }) {
  const src = (i: number) => `/exercicios/${pasta}/${i}.jpg`;
  return (
    <div className="relative mb-2 aspect-square w-full max-w-[160px] overflow-hidden rounded-lg border border-line bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- estático em public/, sem otimização do Next */}
      <img src={src(0)} alt={`${nome}: posição inicial`} loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src(1)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="anim-alternar-foto absolute inset-0 h-full w-full object-contain"
      />
    </div>
  );
}
