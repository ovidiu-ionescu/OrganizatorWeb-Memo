if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/worker/service-worker.js', { scope: "/" })
    .then(reg => console.log('service worker registered, scope is', reg.scope))
    .catch(err => console.log('service worker not registered', err));
}
