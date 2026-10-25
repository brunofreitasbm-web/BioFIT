// Service worker do BioFIT: deixa o app abrir sem rede na academia.
// Adaptado de openGym (frontend/public/sw.js, AGPL-3.0, https://github.com/DuarteSantos8/openGym).
// Os dados do treino já moram no localStorage; aqui só se guarda o "casco" do app.
//   - navegação (HTML): rede primeiro, cópia em cache como reserva (deploy novo aparece logo
//     que há rede; sem rede, abre a última versão vista)
//   - /_next/static, ícones, fontes: cache primeiro (arquivos com hash, imutáveis)
// Trocar VERSAO descarta os caches antigos no próximo activate.
const VERSAO = "biofit-v5";
const PAGINAS = ["/", "/relatorio", "/relatorio/frequencia", "/relatorio/exercicios", "/relatorio/corpo", "/relatorio/postura", "/relatorio/postura/nova", "/isabela", "/isabela/relatorio", "/isabela/relatorio/frequencia", "/isabela/relatorio/exercicios", "/isabela/conquistas"];
const ARQUIVOS = ["/manifest.webmanifest", "/icon-192.png"];

// Só o HTML não basta offline: a tela é montada pelos scripts da página (client components).
// Por isso, além do HTML, guarda os /_next/static que ele referencia (scripts, estilos, fontes).
async function guardarPagina(cache, url) {
  const res = await fetch(url, { cache: "reload" });
  if (!res.ok) return [];
  await cache.put(url, res.clone());
  const html = await res.text();
  return html.match(/\/_next\/static\/[^"'\s\\)]+\.(?:js|css|woff2)/g) ?? [];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSAO)
      .then(async (cache) => {
        // allSettled: uma rota que falhe não impede a instalação.
        const achados = await Promise.allSettled(PAGINAS.map((url) => guardarPagina(cache, url)));
        const assets = new Set(achados.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
        await Promise.allSettled([...ARQUIVOS, ...assets].map((url) => cache.add(url)));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

function estatico(url) {
  return url.pathname.startsWith("/_next/static/") || /\.(png|svg|woff2?|webmanifest|task)$/.test(url.pathname);
}

// WASM do MediaPipe (detector de pose): vem do CDN com versão fixa na URL, então é imutável.
// Guardado na primeira vez para a avaliação postural funcionar sem rede depois.
function wasmMediaPipe(url) {
  return url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/npm/@mediapipe/tasks-vision@");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !wasmMediaPipe(url)) return;

  if (estatico(url) || wasmMediaPipe(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSAO).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Navegação e payloads RSC do App Router: rede primeiro.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("/")) || Response.error();
        return Response.error();
      }),
  );
});
