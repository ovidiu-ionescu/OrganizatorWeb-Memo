// https://muffinresearch.co.uk/removing-leading-whitespace-in-es6-template-strings/
export function alignedText(strings: TemplateStringsArray, ...values: string[]) {
  // Interweave the strings with the
  // substitution vars first.
  let output = '';
  for (let i = 0; i < values.length; i++) {
    output += strings[i] + values[i];
  }
  output += strings[values.length];

  // Split on newlines.
  let lines = output.split(/(?:\r\n|\n|\r)/);

  let indent = 0;
  if(lines.length > 1 && !lines[0]) {
    lines.shift();
    // https://stackoverflow.com/questions/25823914/javascript-count-spaces-before-first-character-of-a-string
    indent = lines[0].search(/\S|$/);
  }
  const align_regex = new RegExp(`^\\s\{0,${indent}\}`, 'gm');

  // Rip out the leading whitespace.
  return lines.map(line => line.replace(align_regex, '')).join('\n');
}