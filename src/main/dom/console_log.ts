const journal = [];

const add = (...args: any) => {
  if(journal.length > 100) {
    journal.shift();
  }
  journal.push(args.join(' '));
}

const konsole = {
  log: (...args: any) => { console.log(...args); add(...args); },
  error: (...args: any) => { console.log(...args); add(...args); },
  journal: () => journal,
}
const default_export = konsole;
export default default_export;