import * as memo_processing from '../../../main/memo_processing.js';

describe("Testing memo processing", () => {

  it("convert a server memo to a local memo", () => {
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
});

