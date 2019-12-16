import * as pa from '/events.js';
import * as memo_processing from '/memo_processing.js';
import konsole from './console_log.js';

export const initiateDB = execute => {
  const request = window.indexedDB.open("MemoDatabase", 1);
  
  let db;

  request.onerror = event => {
    console.log("Why didn't you allow my web app to use IndexedDB?!");
  };
  
  prepare_db_if_needed(request);

  request.onsuccess = event => {
    db = event.target.result;

    db.onerror = event => {
      // Generic error handler for all errors targeted at this database's
      // requests!
      console.error("Database error: " + event.target.errorCode);
    };

    execute(db);
  };

};

const prepare_db_if_needed = request => {
  // This event is only implemented in recent browsers   
  request.onupgradeneeded = event => { 
    // Save the IDBDatabase interface 
    console.log('Request onupgradeneeded', event);
    const db = event.target.result;

    console.log('Create an objectStore for this database');
    const memo_store = db.createObjectStore("memo", { keyPath: "id" });
    const access_store = db.createObjectStore("memo_access", { keyPath: "id" });
    access_store.createIndex("last", "last_access");
  }
}

/**
 * Save the memo locally if it has been modified since the last save
 * @param {*} db 
 * @param {*} memo
 */
const insertMemo = (db, memo, resolve, reject) => {
  const transaction = db.transaction(["memo", "memo_access"], "readwrite");
  const memo_store = transaction.objectStore("memo");
  const request = memo_store.get(memo.id);
  request.onsuccess = event => {
    let db_memo = request.result;
    if(!db_memo) {
      // memo is not in local cache, insert it
      db_memo = {
        id:     memo.id,
        server: JSON.parse(JSON.stringify(memo)),
        local:  memo
      }
      memo_store.put(db_memo);
      const access_store = transaction.objectStore("memo_access");
      pa.updateStatus(`Creating entry for memo ${memo.id}`);
      access_store.put({ id: memo.id, last_access: + new Date })
      resolve(db_memo.text);
    } else {
      // save over existing local entry
      if(db_memo.local.text !== memo.text) {
        const serverTimestamp = db_memo.local.timestamp;
        db_memo.local.timestamp = (+ new Date);
        db_memo.local.text = memo.text;
        memo_store.put(db_memo);
        pa.updateStatus(`Saved locally memo ${db_memo.id}`);
        const access_store = transaction.objectStore("memo_access");
        access_store.put({ id: memo.id, last_access: + new Date });
      } else {
        pa.updateStatus("Local memo hasn't changed since last save");
      }
      // determine if a save to server is indicated
      if(!db_memo.server || db_memo.server.text !== memo.text) {
        console.log('Determined a server save is necessary');
        resolve(memo.text);
      } else {
        pa.updateStatus('server version is the same as current');
        // this will throw an exception in await
        reject('server version is the same as current');
      }
    }
  }
  request.onerror = event => {
    pa.updateStatus('Failed fetching memo', memo);
  }
}

/**
 * Saving memo to cache
 * @param {IDBDatabase} db 
 * @param {*} memo 
 * @param {Function} logic 
 * @param {Function} resolve 
 * @param {Function} reject 
 */
const updateLocal = (db, memo, logic, resolve, reject) => {
  const transaction = db.transaction(["memo", "memo_access"], "readwrite");
  const memo_store = transaction.objectStore("memo");
  const request = memo_store.get(memo.id);
  request.onsuccess = event => {
    let db_memo = request.result;

    // update last accessed
    const access_store = transaction.objectStore("memo_access");
    access_store.put({ id: memo.id, last_access: + new Date })

    db_memo = logic(memo, db_memo, resolve, reject);

    if(db_memo) {
      memo_store.put(db_memo);
      // pa.updateStatus(`Saved locally memo ${db_memo.id}`);
    }
  }

  request.onerror = event => {
    pa.updateStatus('Failed fetching memo', memo.id);
  }
}

/**
 * Saves to the local cache what was just saved on the server
 * There are no checks at this point, it is presumed conflicts are 
 * already fixed
 * @param {*} server_memo 
 */
export const saveMemoAfterSavingToServer = server_memo => {
  if(!server_memo) {
    return;
  }
  konsole.log('Save memo after saving to server');
  // sanitize the input first
  const memo = memo_processing.normalize(server_memo);
  const logic = memo => JSON.parse(JSON.stringify(
    {
      id:     memo.id,
      server: memo,
      local:  memo
    }
  ));

  initiateDB(db => updateLocal(db, memo, logic));
}

/**
 * Caches the memo fetched from the server, provided it's not older than 
 * an existing cache
 * Resolves a promise so it can be awaited
 * @param {*} server_memo 
 */
export const saveMemoAfterFetchingFromServer = server_memo => {
  konsole.log('Save memo after fetching from server');
  // sanitize the input first
  const memo = memo_processing.normalize(server_memo);
  const logic = (memo, db_memo, resolve, reject) => {
    if(db_memo && memo_processing.first_more_recent(db_memo.local, memo)) {
      pa.updateStatus('Local version more recent than server version');
      resolve && resolve(db_memo.local);
      return undefined;
    } else {
      resolve && resolve(memo);
      return JSON.parse(JSON.stringify(
        {
          id:     memo.id,
          server: memo,
          local:  memo
        }
      ));
    }
  }
  return new Promise((resolve, reject) => {
    initiateDB(db => updateLocal(db, memo, logic, resolve, reject));
  });
}

/**
 * Saves a local copy of the memo. Refuses to do so if the text contains
 * private data (Japanese quotes)
 * Updates the timestamp of the locally saved memo
 * @param {*} memo 
 */
export const saveLocalOnly = memo => {
  if(!memo.id) {
    konsole.error('Error, trying to save without a proper memo id');
    return;
  }
  konsole.log(`saveLocalOnly ${memo.id}`);
  const logic = (memo, db_memo, resolve, reject) => {
    if(memo_processing.memo_has_clear_secrets(memo)) {
      konsole.error("Can't save clear version of text containing secret information");
      reject && reject('Memo contains secret information in clear, encrypt first');
      return undefined;
    } else {
      if(db_memo && db_memo.local && memo_processing.equal(memo, db_memo.local)) {
        if(reject) {
          reject('Memo text not changed compared to local save');
        } else {
          konsole.log('Memo text not changed compared to local save');
        }
        return undefined;
      } else {
        const result = JSON.parse(JSON.stringify({
          id:     memo.id,
          local:  memo,
          server: db_memo ? db_memo.server : undefined
        }));
        result.local.timestamp = (+ new Date);

        resolve && resolve(result.local);
        pa.updateStatus(`Save locally memo ${memo.id}`);
        return result;
      }
    }
  }

  initiateDB(db => updateLocal(db, memo, logic));
}

/**
 * Fetches the memo from local store
 * @param {IDBDatabase} db 
 * @param {number} ex_id 
 * @param {Function} resolve 
 * @param {Function} reject 
 */
const fetchMemo = (db, ex_id, resolve, reject) => {
  const id = ex_id === 'new' ? ex_id : parseInt(ex_id);
  console.log('Entering fetchMemo');
  const transaction = db.transaction(["memo", "memo_access"], "readwrite");
  const memo_store = transaction.objectStore("memo");
  const request = memo_store.get(id);
  request.onerror = event => { 
    console.log('Get rejected', event);
    reject();
  }
  request.onsuccess = event => {
    console.log('Get succesfull', event);
    const access_store = transaction.objectStore("memo_access");
    access_store.put({ id: id, last_access: + new Date })
    resolve(request.result);
  }
  // console.log("request.readyState", request.readyState, request.readyState === 'done');
  // if(request.readyState === 'done') {
  //   resolve(request.result);
  // }
}

export const saveMemo = (memo, resolve, reject) => {
  console.log('Save memo in local cache', reject);
  const no_promise = () => {};
  const no_promise_reject = () => { console.log('Reject'); };
  initiateDB(db => insertMemo(db, memo, resolve || no_promise, reject || no_promise_reject));
}

export const readMemo = id => {
  console.log('Fetch memo from local cache');
  return new Promise((resolve, reject) => {
    initiateDB(db => fetchMemo(db, id, resolve, reject));
  });
}

const zapMemo = (db, id) => {
  console.log('Deleting memo', id);
  const transaction = db.transaction(["memo", "memo_access"], "readwrite");
  const memo_store = transaction.objectStore("memo");
  memo_store.delete(id);
  const access_store = transaction.objectStore("memo_access");
  access_store.delete(id);
}

export const delete_memo = id => {
  initiateDB(db => zapMemo(db, id));
}

/**
 * List all memos that have not been saved
 */
const _unsaved_memos = (db, resolve, reject) => {
  const transaction = db.transaction(["memo", "memo_access"], "readwrite");
  const memo_store = transaction.objectStore("memo");
  const request = memo_store.getAll();
  request.onsuccess = event => {
    const cached_memos = event.target.result;
    const unsaved_memos = cached_memos.filter(m => !m.server || m.local.timestamp > m.server.timestamp);
    //konsole.log({unsaved_memos});
    resolve(unsaved_memos);
  }
  request.onerror = event => {
    reject(event);
  };
};

/**
 * Gets all the memos that need saving on the server side
 */
export const unsaved_memos = () => {
  return new Promise((resolve, reject) => {
    initiateDB(db => _unsaved_memos(db, resolve, reject));
  });
}


const _access_times = (db, resolve) =>  {
  const transaction = db.transaction(["memo_access"], "readonly");
  transaction.objectStore("memo_access").getAll().onsuccess = event =>  {
    resolve(event.target.result);
  }
}

/**
 * Get the last accessed list
 */
export const access_times = () => {
  return new Promise((resolve, reject) => {
    initiateDB(db => _access_times(db, resolve, reject));
  });
}