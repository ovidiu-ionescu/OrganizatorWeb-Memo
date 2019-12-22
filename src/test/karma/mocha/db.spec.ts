import { Memo, ServerMemo, CacheMemo, AccessTime } from '../../../main/memo_interfaces';

import * as db from '../../../main/memo_db.js';
import { sendMessageEvent } from '../../../main/events';

describe("Testing the database functions", () => {
  before(() => {
    return new Promise((resolve) => {
      const dbDeleteRequest = window.indexedDB.deleteDatabase(db.DBName);
      dbDeleteRequest.onsuccess = event =>  {
        resolve();
      }
    });
  });

  // save_memo_after_fetching_from_server V
  // save_memo_after_saving_to_server V
  // saveMemo (old one)
  // save_local_only V
  // delete_memo
  // unsaved_memos V
  // access_times V

  let clock;
  let millis;

  beforeEach(() => {
    millis = (+ new Date);
    clock = sinon.useFakeTimers(millis);
  });

  afterEach(() => {
    clock.restore();
  });

  it('Should save the server memo and access time should be read time', async () => {
    await db.save_memo_after_fetching_from_server({
      id:        2,
      memogroup: null,
      title:     'Title\r\n',
      memotext:  'Body',
      savetime:  100,
      user: {
        id:      1,
        name:    'root'
      }
    });
    clock.tick(10);
    let memo = await db.read_memo(2);
    expect(memo).to.deep.equal({
      id:        2,
      memogroup: null,
      text:      'Title\nBody',
      timestamp: 100,
      user: {
        id:      1,
        name:    'root'
      }
    });

    const access_times = await db.access_times();
    expect(access_times).to.be.an('array').that.has.lengthOf(1);
    expect(access_times[0].last_access).to.equal(millis + 10);
  });

  it('should refuse to save if nothing changed', async () => {
    const saved = await db.save_local_only({
        id:        2,
        memogroup: null,
        text:      'Title\nBody',
        timestamp: 100,
      });
    expect(saved).to.be.false;
  });

  it('should appear as unsaved after a save local', async () => {
    clock.tick(10);
    let saved = await db.save_local_only({
        id: 2,
        memogroup: null,
        text: 'Title\nBody2'
    });
    expect(saved).to.be.true;
    let unsaved = await db.unsaved_memos();
    expect(unsaved).to.be.an('array').that.has.lengthOf(1);
  });

  it('should save a new memo without the server part', async () => {
    let saved = await db.save_local_only({
      id: -2,
      text: 'New memo\nNew body',
    });
    expect(saved).to.be.true;
    let unsaved = await db.unsaved_memos();
    expect(unsaved).to.be.an('array').that.has.lengthOf(2);
    const new_memo = unsaved.filter( m => m.id < 0)[0];
    expect(new_memo.server).to.be.undefined;
  });


  // it('should not override the local if server is older', async () => {});

  it('should remove the old negative number entries when saving to server', async () => {
    clock.tick(10);
    const memo = await db.save_memo_after_saving_to_server(-2, {
      id:       3,
      memogroup: {
        id:     2,
        name:   'memogroup 2'
      },
      user: {
        id:     5,
        name:   'username'
      },
      title:    'Title 3\r\n',
      memotext: 'Body3',
      savetime: 200 
    });
    expect(memo).to.be.deep.equal({
      id:       3,
      memogroup: {
        id:     2,
        name:   'memogroup 2'
      },
      user: {
        id:     5,
        name:   'username'
      },
      text:    'Title 3\nBody3',
      timestamp: 200 
    });
  });

  // it('', async () => {});
});