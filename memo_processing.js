/**
 * Common operations on memos
 * @param {*} memo 
 */

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

  return memo;
}

/**
 * Checks if two memos are equal
 * @param {*} memo1 
 * @param {*} memo2 
 */
export const equal = (memo1, memo2) => {
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
 * @param {*} memo 
 */
export const memo_has_clear_secrets = memo => {
  return memo.text.indexOf("\u300c") > -1;
}

/**
 * Determines if the first argument is a memo more recent than the second one
 */
export const first_more_recent = (first, second) => {
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