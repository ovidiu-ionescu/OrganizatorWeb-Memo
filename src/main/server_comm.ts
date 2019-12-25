import konsole from './console_log.js';
import * as db from './memo_db.js';
import { Memo, ServerMemo, CacheMemo, PasswordThen, IdName } from './memo_interfaces';


/**
 * The code communicating with the server
 */

/**
 * Save a memo on the server.
 * 
 * @param {Memo} memo body of the memo
 */
export const save_to_server = async (memo: Memo) => {
  konsole.log(`Saving to server memo ${memo.id}`);
  const memogroup = memo.memogroup ? `group_id=${memo.memogroup}&` : "";
  const memoId = memo.id < 0 ? "" : `memoId=${memo.id}&`;
  const text = `text=${encodeURIComponent(memo.text)}&`;
  const body = `${memogroup}${memoId}${text}`;

  const response = await fetch("/organizator/memo/", {
    credentials: "include",
    headers: {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      "x-organizator-client-version": "3"
    },
    body: body,
    method: "POST",
    mode: "cors"
  });

  if (response.status === 200) {
    const responseJson = await response.json();
    return responseJson.memo;
  } else {
    throw new Error(`Save failed with status ${response.status}`);
  }
}

export const save_all = async () => {
  const unsaved_memos = await db.unsaved_memos();
  konsole.log({unsaved_memos});
  // save to server and get the server instance
  for(let memo: CacheMemo; memo = unsaved_memos.pop();) {
    const id = memo.id;
    const server_memo = await save_to_server(memo.local);
    // TODO: need to take care of current URL
    db.save_memo_after_saving_to_server(id, server_memo);
  }

  // .map(async memo => ({
  //   id:          memo.id,
  //   server_memo: await server_comm.save_to_server(memo.local)
  // }))
  // remove the old memo and save the new one into local cache
  // .forEach(async m => {
  //   const memo = await m;
  //   if(memo.id < 0) {
  //     db.delete_memo(id);
  //   }
  //   db.saveMemoAfterSavingToServer(memo.server_memo);
  // });
}
