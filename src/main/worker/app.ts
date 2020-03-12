if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('service worker registered, scope is', reg.scope))
    .catch(err => console.log('service worker not registered', err));
}