import { merge } from "../../../main/diff_match_patch_uncompressed.js";

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

const base = alignedText`
  This is the main
  initial text.
  Mainly used for adding tests.
`;

describe("Testing text merging", () => {
  it("should add a line at the end and one at the beginning", () => {
    const base = "initial line";
    const local = "added first line\ninitial line";
    const remote = "initial line\nadded last line";

    const merged = merge(base, local, remote);

    expect(merged).to.be.equal(
      "added first line\ninitial line\nadded last line"
    );
  });

  it("should fail to merge unrelated stuff", () => {
    const base = "abcd";
    const local = "ebgd";
    const remote = "ibkd";

    const merged = merge(base, local, remote);
    console.log(merged);
  });



  it('should combine two modifications', () => {
    const add1 = alignedText`
      _2020_01_02_
      - [ ] Add feature 1
    `;

    const add2 = alignedText`
      _2020_01_02_
      - [ ] Add feature 2
    `;
  
    console.log(`Prepending 1: [${add1}${base}]`)
    const merged = merge(base, `${add1}${base}`, `${add2}${base}`);
    console.log(merged);

  });

});
