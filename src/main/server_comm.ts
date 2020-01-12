import konsole from './console_log.js';
import * as db from './memo_db.js';
import { Memo, ServerMemo, CacheMemo, PasswordThen, IdName, ServerMemoTitle } from './memo_interfaces.js';
import * as events from './events.js';
import {merge} from './diff_match_patch_uncompressed.js';
import * as memo_processing from './memo_processing.js';
import { MemoEditor } from './memo-editor.js';


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
  const memogroup = memo.memogroup ? `group_id=${memo.memogroup.id}&` : "";
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
  if(unsaved_memos.length) {
    events.save_all_status(events.SaveAllStatus.Processing);
  }
  konsole.log({unsaved_memos});
  // save to server and get the server instance
  for(let memo: CacheMemo; memo = unsaved_memos.pop();) {
    const id = memo.id;
    if(memo.id > -1) {
      // this is an existing memo, might have changed on the server since we got it
      const server_memo = await read_memo(id);
      if(server_memo.savetime && memo.server && memo.server.timestamp && server_memo.savetime > memo.server.timestamp) {
        konsole.log(`we have a conflict`);
        konsole.log(`compute a merge, the server memo has been modified since last save`);
        const remote_memo = memo_processing.server2local(server_memo);
        const text = merge(memo.server.text, memo.local.text, remote_memo.text);
        memo.local.text = text;

        // if this is loaded in the current editor we need to swap in the new text
        const editor = <MemoEditor>(document.getElementById("editor"));
        if(editor.memoId === memo.id) {
          editor.set_memo(memo.local);
        }
        // events.save_all_status(events.SaveAllStatus.Failed);
        // throw `Time conflict saving memo ${memo.id}`;
      }
    }

    const server_memo = await save_to_server(memo.local);
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

  events.save_all_status(events.SaveAllStatus.Success);
}

const get_options: RequestInit = {
  credentials: "include",
  headers: {
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    "X-Requested-With": "XMLHttpRequest",
    "x-organizator-client-version": "3"
  },
  method: "GET",
  mode: "cors"
};

export const read_memo = async (id: number): Promise<ServerMemo> => {
  const server_response = await fetch(`/organizator/memo/${id}?request.preventCache=${+new Date()}`, get_options);
  if (server_response.status === 200) {
    const json = await server_response.json();
    return json.memo;
  } else {
    throw {
      errorCode: server_response.status,
      message: `Failed to fetch memo ${id}`,
    };
  }
}

export const read_memo_groups = async(): Promise<IdName[]> => {
  const server_response = await fetch(`/organizator/memogroup/?request.preventCache=${+new Date()}`, get_options);
  if (server_response.status === 200) {
    const json = await server_response.json();
    return json.memogroups;
  } else {
    throw {
      errorCode: server_response.status,
      message: `Failed to fetch memogroups`,
    };
  }
}
