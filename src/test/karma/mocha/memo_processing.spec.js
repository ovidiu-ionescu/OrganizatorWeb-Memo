import * as memo_processing from '../../../main/memo_processing.js';

describe("Testing memo processing", () => {

  it("should convert a server memo to a local memo", () => {
    const server_memo = {
      id:        1,
      title:     'Title\r\n',
      memotext:  'body',
      memogroup: null,
      savetime:  100
    };

    const local_memo = memo_processing.server2local(server_memo);
    expect(local_memo.text).to.be.equal('Title\nbody')

  });

  it('should toggle a checkbox if clicked inside it', () => {
    const text = ' - [ ] this - [x] aha';
    expect(memo_processing.toggle_checkbox(text, 2)).to.be.equal(' - [x] this - [x] aha');

    expect(memo_processing.toggle_checkbox(text, 14)).to.be.equal(' - [ ] this - [ ] aha');
  });

  it('should not return anythinf if clicked outside a checkbox', () => {
    const text = ' - [ ] this - [x] aha';
    expect(memo_processing.toggle_checkbox(text, 2)).to.be.equal(' - [x] this - [x] aha');

    expect(memo_processing.toggle_checkbox(text, 8)).to.be.undefined;
  });
});

