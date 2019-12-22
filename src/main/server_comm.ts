import { Memo, ServerMemo } from './memo_interfaces';
import konsole from './console_log.js';

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
