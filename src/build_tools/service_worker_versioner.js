const fs = require ('fs');


const version_file = 'src/build_tools/version_counter.txt'
const files = ['build/main/worker/service-worker.js'];
const marker = '{AUTOINCREMENT_CACHE_VERSION}';


let version = parseInt(fs.readFileSync(version_file, 'utf8'), 10) + 1;
console.log('Incrementing versions to', version);

fs.writeFileSync(version_file, version);

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(marker, version);
  fs.writeFileSync(f, content);
});