const fs = require('fs');

const files = ['build/main/worker/service-worker.js', 'build/main/worker/tsconfig.tsbuildinfo'];
files.forEach(f => { 
  console.log('removing', f);
  try {
  fs.unlinkSync(f) 
  } catch(e) {
    console.warn(e);
  }
});