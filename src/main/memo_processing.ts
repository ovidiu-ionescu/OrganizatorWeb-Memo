/**
 * Common operations on memos
 */

import { Memo, ServerMemo, CacheMemo } from './memo_interfaces';

/**
 * Change the structure returned by the server into the one used by the client
 * @param {ServerMemo} server_memo 
 */
export const server2local = (server_memo: ServerMemo): Memo => {
  // rename savetime to timestamp for consistency
  
  const text: string = `${server_memo.title}${server_memo.memotext}`.split("\r").join("");
  const memo: Memo = {
    id:        server_memo.id,
    text:      text,
    memogroup: server_memo.memogroup,
    timestamp: server_memo.savetime || undefined,
    user:      server_memo.user,
  }
  return memo;
}

/**
 * Checks if two memos are equal
 * @param {Memo} memo1 
 * @param {Memo} memo2 
 */
export const equal = (memo1: Memo, memo2: Memo): boolean => {
  if(!memo1 || !memo2) {
    return false;
  }
  if(memo1.text !== memo2.text) {
    return false;
  }

  // TODO: ownership could also change!
  return true;
}

/**
 * Checks if a memo has secret information in clear by looking for 
 * Japanese quotes
 * 
 * @param {Memo} memo 
 */
export const memo_has_clear_secrets = (memo: Memo): boolean => {
  return memo.text.indexOf("\u300c") > -1;
}

/**
 * Determines if the first argument is a memo more recent than the second one
 */
export const first_more_recent = (first: Memo, second: Memo): boolean => {
  if(!first) {
    return false;
  }
  if(!second.timestamp) {
    return true;
  }
  if(first.timestamp > second.timestamp) {
    return true;
  }
  return false;
}

export const make_cache_memo = (memo: Memo, cache_memo?: CacheMemo): CacheMemo => {
  if(memo.id < 0) {
    // new memo, not on the server yet
    return {
      id:     memo.id,
      local:  memo
    }
  }
  
  if(!cache_memo) {
    return {
      id:     memo.id,
      local:  memo,
      server: memo
    }
  } else {
    // we update the local part in the cache
    return {
      id:     memo.id,
      local:  memo,
      server: cache_memo.server
    };
  }
}