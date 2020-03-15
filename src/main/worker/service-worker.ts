const staticCacheName = 'site-static-v5';
const assets = [
  '/memo/',
  '/dom/memo-router.js',
  '/dom/memo-editor.js',
  '/dom/journal.js',
  '/dom/memo_db.js',
  '/dom/memo_processing.js',
  '/dom/console_log.js',
  '/dom/server_comm.js',
  '/dom/events.js',
  '/dom/img-inline-svg.js',
  '/dom/group-list.js',
  '/dom/diff_match_patch_uncompressed.js',
  '/pkg/concatenate.js',
  '/pkg/concatenate_bg.wasm',

  '/images/ic_clear_48px.svg',
  '/images/ic_create_48px.svg',
  '/images/ic_done_48px.svg',
  '/images/ic_file_download_48px.svg',
  '/images/ic_inbox_48px.svg',
  '/images/ic_insert_comment_48px.svg',
  '/images/ic_link_48px.svg',
  '/images/ic_lock_48px.svg',
  '/images/ic_lock_open_48px.svg',
  '/images/ic_no_encryption_48px.svg',
  '/images/ic_save_48px.svg',
  '/images/ic_search_48px.svg',
  '/images/ic_today_48px.svg',
  '/images/lock-reset.svg',
  '/images/save_alt-24px.svg',

  '/worker/app.js',
  '/org-manifest.json',
  '/favicon.ico'
];

// install event
self.addEventListener('install', (evt:ExtendableEvent) => {
  //console.log('service worker installed');
  evt.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      console.log('caching shell assets');
      cache.addAll(assets).catch(reason => console.log('Failed to fetch', reason));
    })
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// activate event
self.addEventListener('activate', (evt:ExtendableEvent) => {
  //console.log('service worker activated');
  evt.waitUntil(
    caches.keys().then(keys => {
      //console.log(keys);
      return Promise.all(keys
        .filter(key => key !== staticCacheName)
        .map(key => caches.delete(key))
      );
    })
  );
});

// fetch event
self.addEventListener('fetch', (evt:FetchEvent) => {
  //console.log('fetch event', evt);
  evt.respondWith(
    caches.match(evt.request).then(cacheRes => {
      return cacheRes || fetch(evt.request);
    })
  );
});