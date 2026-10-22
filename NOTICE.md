# Avisos de terceiros

BioFIT é licenciado sob a **GNU AGPL v3.0** (ver [LICENSE](LICENSE)).

## openGym

Partes do app treino foram adaptadas de [**openGym**](https://github.com/DuarteSantos8/openGym)
— Copyright (C) 2026 Duarte Santos — licenciado sob a GNU AGPL v3.0. Foram reescritas em
TypeScript para o BioFIT; cada arquivo indica no cabeçalho de qual arquivo do openGym veio:

- `apps/treino/lib/timerDescanso.ts` — timer de descanso por instante absoluto + bipe
  (`frontend/src/store/useUI.js`, `frontend/src/lib/sound.js`)
- `apps/treino/lib/wakelock.ts` — tela ligada durante o treino (`frontend/src/lib/wakelock.js`)
- `apps/treino/public/sw.js` — service worker offline (`frontend/public/sw.js`)
- `apps/treino/components/MapaMuscular.tsx` — mapa muscular (`frontend/src/components/BodyMap.jsx`)
- `apps/treino/lib/heatmapAnual.ts` — heatmap anual (`frontend/src/components/Heatmap.jsx`)

Nada do banco de exercícios do openGym (dados de hasaneyldrm/exercises-dataset) foi usado.

## MediaPipe Pose Landmarker (avaliação postural)

A detecção de pose por foto em `apps/treino/lib/detectorPose.ts` usa
[**MediaPipe Tasks Vision**](https://github.com/google-ai-edge/mediapipe) (`@mediapipe/tasks-vision`),
Copyright Google LLC, sob licença **Apache-2.0**. O modelo `pose_landmarker_lite.task` em
`apps/treino/public/modelos/` é o publicado pelo Google (mesma licença); o WASM é carregado do
jsDelivr com a versão fixada no código. Os pontos da coluna (C7, ápice, T12) não vêm do modelo:
são marcados pelo usuário.

## Fotos de exercícios (free-exercise-db)

As fotos em `apps/treino/public/exercicios/` vêm do
[**free-exercise-db**](https://github.com/yuhonas/free-exercise-db), de yuhonas, publicado sob
**The Unlicense** (domínio público). Foram reduzidas para 320px por
`scripts/importar-imagens.sh`; a lista de pastas usadas está em `apps/treino/lib/exercicios.ts`
(`IMAGENS`). O free-exercise-db reestrutura o [wrkout/exercises.json](https://github.com/wrkout/exercises.json),
que não documenta a origem das fotos — se algum titular reclamar, basta remover a pasta.

Nada da ExerciseDB/AscendAPI (dados proprietários) foi usado.

## Contornos do corpo (MuscleMap)

Os contornos em `apps/treino/lib/body-paths.ts` vêm de
[**MuscleMap**](https://github.com/melihcolpan/MuscleMap), de Melih Colpan, sob licença **MIT**,
na conversão para SVG feita pelo openGym (`frontend/src/lib/body-paths.js`). Só a figura
masculina foi mantida; o desenho não foi alterado.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
