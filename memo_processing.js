/**
 * Change the structure returned by the server into the one used by the client
 * @param {*} memo 
 */
export const normalize = memo => {
  // rename savetime to timestamp for consistency
  if(memo.savetime) {
    memo.timestamp = memo.savetime;
    memo.savetime = undefined;
  }
  memo.text = `${memo.title}${memo.memotext}`.split("\r").join("");
  memo.title = undefined;
  memo.memotext = undefined;
}