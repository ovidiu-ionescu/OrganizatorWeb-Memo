import * as pa from '/events.js';

export const initiateDB = execute => {
  const request = window.indexedDB.open("MemoDatabase", 1);
  
  let db;

  request.onerror = event => {
    console.log("Why didn't you allow my web app to use IndexedDB?!");
  };
  
  prepare_db_if_needed(request);

  request.onsuccess = event => {
    console.log('Request onsucces', event);
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
    console.log({db_memo});
    if(!db_memo) {
      db_memo = {
        id: memo.id,
        server: JSON.parse(JSON.stringify(memo)),
        local: memo
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
        if(!db_memo.server || db_memo.server.text !== memo.text) {
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
  const no_promise = () => {};
  initiateDB(db => insertMemo(db, memo, resolve || no_promise, reject || no_promise));
}

export const readMemo = id => {
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

export const deleteMemo = id => {
  initiateDB(db => zapMemo(db, id));
}

