import { Memo, ServerMemo, ServerMemoReply, CacheMemo, AccessTime, UpdateMemoLogic, GenericReject, IdName } from './memo_interfaces.js';

import * as pa from './events.js';
import * as memo_processing from './memo_processing.js';
import konsole from './console_log.js';

export const DBName = "MemoDatabase";

export const get_db = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DBName, 1);

    request.onerror = event => {
      reject("Why didn't you allow my web app to use IndexedDB?!");
    };

    prepare_db_if_needed(request);

    request.onsuccess = event => {
      const db: IDBDatabase = (event.target as IDBRequest).result;
  
      db.onerror = event => {
        // Generic error handler for all errors targeted at this database's
        // requests!
        pa.updateStatus("Database error: " + (<any>event.target).errorCode);
      };
  
      resolve(db);
    };    
  });
}

const prepare_db_if_needed = (request: IDBOpenDBRequest) => {
  // This event is only implemented in recent browsers   
  request.onupgradeneeded = event => { 
    // Save the IDBDatabase interface 
    konsole.log('Request onupgradeneeded', event);
    const db = (event.target as IDBOpenDBRequest).result;

    konsole.log('Create an objectStore for this database');
    const memo_store = db.createObjectStore("memo", { keyPath: "id" });
    const access_store = db.createObjectStore("memo_access", { keyPath: "id" });
    access_store.createIndex("last", "last_access");
  }
}

const update_access_time = async (transaction: IDBTransaction, id: number) => {
  const access_store = transaction.objectStore("memo_access");
  return new Promise(resolve => {
    access_store.put({ 
      id:          id, 
      last_access: + new Date 
    }).onsuccess = () => resolve(true);
  });
}

const get_memo_write_transaction = async () => {
  const db = await get_db();
  return db.transaction(["memo", "memo_access"], "readwrite");
}

/**
 * Read a CacheMemo entry from the local database
 * 
 * @param transaction 
 * @param id 
 */
const raw_read_memo = (transaction: IDBTransaction, id: number) => {
  const memo_store = transaction.objectStore("memo");
  const request = memo_store.get(id);
  return new Promise<CacheMemo>((resolve) => {
    request.onsuccess = () => {
      resolve(request.result);
    }
  }); 
}

/**
 * Write a CacheMemo to the local database
 * @param transaction 
 * @param db_memo 
 */
const raw_write_memo = (transaction: IDBTransaction, db_memo: CacheMemo): Promise<CacheMemo> => {
  konsole.log('writing memo to local storage', db_memo.id);
  const memo_store = transaction.objectStore("memo");
  const request = memo_store.put(JSON.parse(JSON.stringify(db_memo)));
  return new Promise(resolve => {
    request.onsuccess = () => {
      resolve(db_memo);
    }
  });
}

const write_memo_with_timestamp = (transaction: IDBTransaction, db_memo: CacheMemo) => {
  db_memo.local.timestamp = (+ new Date);
  konsole.log(`adding timestamp ${db_memo.local.timestamp} to memo ${db_memo.id} before writing`);
  return raw_write_memo(transaction, db_memo);
}

/**
 * Reads a memo from local database, updates access time
 * @param id 
 */
export const read_memo = async (id: number) => {
  const transaction = await get_memo_write_transaction();
  await update_access_time(transaction, id);
  const cache_memo = await raw_read_memo(transaction, id);
  return cache_memo ? cache_memo.local : null;
}

export const save_memo_after_fetching_from_server = async (server_memo_reply: ServerMemoReply):Promise<Memo> => {
  konsole.log('Save memo after fetching from server', server_memo_reply.memo.id);
  // sanitize the input first
  const memo = memo_processing.server2local(server_memo_reply);
  const transaction = await get_memo_write_transaction();

  await update_access_time(transaction, memo.id);

  const existing_db_memo = await raw_read_memo(transaction, server_memo_reply.memo.id);
  if(existing_db_memo) {
    // if the local one is more recent, skip the server one and return local
    if(memo_processing.first_more_recent(existing_db_memo.local, memo)) {
      konsole.log(`Local memo ${memo.id} has timestamp ${existing_db_memo.local.timestamp} more recent than server timestamp ${memo.timestamp}`)
      return existing_db_memo.local;
    } else {
      await raw_write_memo(transaction, memo_processing.make_cache_memo(memo));
      return memo;
    }
  } else {
    await raw_write_memo(transaction, memo_processing.make_cache_memo(memo));
    return memo;
  }
}

/**
 * Updates the local cache if the memo has changed
 * @param memo 
 */
export const save_local_only = async (memo: Memo): Promise<Memo> => {
  const transaction = await get_memo_write_transaction();
  const db_memo = await raw_read_memo(transaction, memo.id);

  await update_access_time(transaction, memo.id);
  
  if(!db_memo) {
    // no entry in cache, new memo
    const new_db_memo: CacheMemo = await write_memo_with_timestamp(transaction, memo_processing.make_cache_memo(memo));
    return new_db_memo.local;
  } else {
    if(memo_processing.equal(memo, db_memo.local)) {
      // no change, don't bother to write
      return memo;
    } else {
      const new_db_memo: CacheMemo = await write_memo_with_timestamp(transaction, memo_processing.make_cache_memo(memo, db_memo));
      return new_db_memo.local;
    }
  }
}

export const access_times = async () => {
  const db = await get_db();
  const transaction = db.transaction(["memo_access"], "readonly");
  return new Promise<Array<AccessTime>>(resolve => {
    transaction.objectStore("memo_access").getAll().onsuccess = event => {
      resolve((event.target as IDBRequest).result);
    }
  });
}

/**
 * List all memos that have not been saved
 */
export const unsaved_memos = async () => {
  const transaction = await get_memo_write_transaction();
  const memo_store = transaction.objectStore("memo");
  const request = memo_store.getAll();
  return new Promise<Array<CacheMemo>>(resolve => {
    request.onsuccess = event => {
      const cached_memos: Array<CacheMemo> = (<IDBRequest>event.target).result;
      // konsole.log(JSON.stringify(cached_memos, null, 2));
      const unsaved_memos = cached_memos.filter(m => !m.server || m.local.timestamp > m.server.timestamp);
      konsole.log('unsaved memos:', unsaved_memos.map(m => m.id).join(' '));
      resolve(unsaved_memos);
    }
  });
};

/**
 * Deletes a memo and the associated structures
 * @param id 
 */
export const delete_memo = async (id: number) => {
  konsole.log('Deleting memo', id);
  const transaction = await get_memo_write_transaction();
  const memo_store = transaction.objectStore("memo");
  const access_store = transaction.objectStore("memo_access");
  return Promise.all([
    new Promise(resolve => {
      memo_store.delete(id).onsuccess = () => resolve(true);
    }),
    new Promise(resolve => {
      access_store.delete(id).onsuccess = () => resolve(true);
    }),
  ]);
}

export const save_memo_after_saving_to_server = async (old_id: number, server_memo_reply: ServerMemoReply) => {
  const server_memo = server_memo_reply.memo;
  if(!server_memo) {
    konsole.log(`No memo came back from the server for ${old_id}, removing from local storage`);
    await delete_memo(old_id);
    return;
  }
  if(server_memo && old_id < 0) {
    // announce everybody this memo has a new id, especially the editor
    konsole.log(`Memo ${old_id} has been assigned ${server_memo.id} by the server`);
    await delete_memo(old_id);
    pa.memo_change_id(old_id, server_memo.id);
  }
  const memo = memo_processing.server2local(server_memo_reply);
  const transaction = await get_memo_write_transaction();
  await raw_write_memo(transaction, memo_processing.make_cache_memo(memo));
  // not sure if access time should be this one, it could be just a batch save
  await update_access_time(transaction, memo.id);
  return memo;
}