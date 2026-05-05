/**
 * Service Worker avançado para funcionamento offline e cache inteligente.
 */
const CACHE_NAME = 'vales-v1';
const API_CACHE_NAME = 'vales-api-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ---------------------------------------------------------
  // CORREÇÃO CRÍTICA: Bloqueia erros de "chrome-extension://"
  // Só fazemos cache de requisições GET e de protocolos HTTP/HTTPS.
  // ---------------------------------------------------------
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return; // Ignora e deixa o navegador seguir o fluxo normal
  }

  // Estratégia para chamadas de API (Google Apps Script)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Salva uma cópia da resposta da API no cache para funcionar offline
          const clonedResponse = response.clone();
          caches.open(API_CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => {
          // Se falhar (offline), busca a última consulta do cache
          return caches.match(event.request);
        })
    );
  } else {
    // Estratégia para arquivos estáticos: Cache Primeiro, depois Rede
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
           // Verifica de novo antes de salvar se a resposta é válida
           if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
           }
           const clonedResponse = response.clone();
           caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
           return response;
        });
      })
    );
  }
});