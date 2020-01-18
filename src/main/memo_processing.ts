import konsole from './console_log.js';

/**
 * Common operations on memos
 */

import { Memo, ServerMemo, ServerMemoReply, CacheMemo, ServerMemoTitle, AccessTime, IdName } from './memo_interfaces.js';

function XOR(a: any, b: any) {
  return ( a || b ) && !( a && b );
}

/**
 * Change the structure returned by the server into the one used by the client
 * @param {ServerMemo} server_memo 
 */
export const server2local = (server_memo_reply: ServerMemoReply): Memo => {
  // rename savetime to timestamp for consistency
  
  const server_memo = server_memo_reply.server_memo;
  const text: string = `${server_memo.title}${server_memo.memotext}`.split("\r").join("");
  const memo: Memo = {
    id:         server_memo.id,
    text:       text,
    memogroup:  server_memo.memogroup,
    timestamp:  server_memo.savetime || undefined,
    user:       server_memo.user,
    readonly:   server_memo.user.id !== server_memo_reply.user.id,
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
    konsole.log(`equal: One of the memos is false`)
    return false;
  }
  if(memo1.text !== memo2.text) {
    konsole.log(`equal: Text content different between memo ${memo1.id} and ${memo2.id}`)
    return false;
  }

  if(memo1.id !== memo2.id) {
    konsole.log(`equal: Id is different between memo ${memo1.id} and ${memo2.id}`)
    return false;
  }

  if(XOR(memo1.memogroup, memo2.memogroup)) {
    return false;
  }

  if(memo1.memogroup && memo2.memogroup && (memo1.memogroup.id != memo2.memogroup.id)) {
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

const headerStartRegex = /^#+\s+/

/**
 * Sort the title list putting the most recently accessed records on top
 * @param titles 
 * @param access_times 
 */
export const make_title_list = (titles: ServerMemoTitle[], access_times: AccessTime[]): ServerMemoTitle[] => {
  const access_times_map: Record<number, number> = access_times.reduce((a, t) => { a[t.id] = t.last_access; return a; }, {});
  return titles.map(
    memo => ({ ...memo, title: memo.title.split('\r').join('')})
  )
  .map(
   memo => ({ ...memo, title: memo.title.replace(headerStartRegex, '')}) 
  )
  .map(
    memo => ({
      ...memo,
      last_access: access_times_map[memo.id] || memo.id
    })
  )
  .sort(
    (a, b) => b.last_access - a.last_access
  )
};

export const toggle_checkbox = (text: string, index: number): string => {
  const regex = /- \[(x| )\]/g;
  let m: RegExpExecArray;
  while(m = regex.exec(text)) {
    if(index >= m.index && index < m.index + m[0].length) {
      return text.slice(0, m.index) + `- [${m[1] === ' ' ? 'x' : ' '}]` + text.slice(m.index + m[0].length);
    }
  }
}