import * as db from "/indexdb.js";
import * as memo_processing from '/memo_processing.js';
import konsole from './console_log.js';

const routerInterceptor = evt => {
  // check if we are trying to navigate via a href
  const target = evt.target;
  // console.log(target);
  if (
    target.nodeName.toLowerCase() === "a" &&
    target.pathname.startsWith("/memo/")
  ) {
    // console.log('route');
    history.pushState(null, null, target.href);
    evt.preventDefault();
    evt.stopPropagation();
    handleMemo();
    evt.preventDefault();
  }
};

export const handleMemo = () => {
  if(window.location.pathname.match(/\/memo\/(\d+)/)) {
    activatePage('singleMemo');
    loadMemo();
    return;
  }
  if(window.location.pathname.match(/\/memo\/new/)) {
    activatePage('singleMemo');
    const editor = document.getElementById("editor");
    editor.new();

    return;
  }
  if(window.location.pathname === '/memo/') {
    activatePage('memoTitles');
    loadMemoTitles();
    return;
  }
  if(window.location.pathname === '/memo/search') {
    activatePage('memoTitles');
    searchMemos();
  }
}

/**
 * Makes the name element visible and hides all others
 * @param {*} name 
 */
const activatePage = (name) => {
  // console.log('Activate', name);
  [...document.querySelectorAll('section')].forEach(art => {
    art.style.display = art.id === name ? '' : 'none';
  });
}


document.addEventListener("click", routerInterceptor);
window.addEventListener('popstate', handleMemo);

const options = {
  credentials: "include",
  headers: {
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    "X-Requested-With": "XMLHttpRequest",
    "x-organizator-client-version": "3"
  },
  referrer: "https://ionescu.net/organizator/2/memo.html",
  method: "GET",
  mode: "cors"
};

const postOptions = {
  "credentials": "include",
  "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
  },
  "referrer": "https://ionescu.net/organizator/2/memo.html",
  "method": "POST",
  "mode": "cors"
};

/**
 * Fetches the memo in the url from local storage and server
 */
async function loadMemo() {
  const path = window.location.pathname;
  //console.log(path);
  const m = path.match(/\/memo\/(\d+)/);
  const id = m ? m[1] : 19;
  console.log('check local storage for memo');
  let local_memo;
  const db_memo = await db.readMemo(id);
  console.log('Fetched this from local storage', db_memo);
  if(db_memo) {
    local_memo = db_memo.local;
    set_memo_in_editor(local_memo);
  } else {
    console.log('Failed to get memo from local storage', id);
  }

  const response = await fetch(
    `/organizator/memo/${id}?request.preventCache=${+new Date()}`,
    options
  );
  if (response.status === 401) {
    // more info at https://www.w3schools.com/howto/howto_js_redirect_webpage.asp
    window.location.replace("/login.html");
    return;
  } else if (response.status === 200) {
    const obj = await response.json();
    const memo = await db.saveMemoAfterFetchingFromServer(obj.memo);
    set_memo_in_editor(memo);
  }

  /*
console.log(response);
const reader = response.body.getReader();
const chunk = await reader.read();
console.log(chunk);
const text = new TextDecoder("utf-8").decode(chunk.value);
console.log(text);
*/
}

function set_memo_in_editor(memo) {
  const editor = document.getElementById("editor");
  editor.memoId = memo.id;
  editor.memogroup = memo.memogroup;
  editor.value = memo.text;
}

/**
 * Fetches all memo titles from the server
 * @param {*} force_reload if false just keep the current list
 */
async function loadMemoTitles(force_reload) {
  if(!force_reload) {
    const dest = document.getElementById('memoTitlesList');
    if(dest.firstChild) {
      return;
    }
  }
  const response = await fetch(
    `/organizator/memo/?request.preventCache=${+new Date()}`,
    options
  );
  if (response.status === 401) {
    // more info at https://www.w3schools.com/howto/howto_js_redirect_webpage.asp
    window.location.replace("/login.html");
    return;
  } else if (response.status === 200) {
    const responseJson = await response.json();
    displayMemoTitles(responseJson);
    //console.log(responseJson);
  }

}

const headerStartRegex = /^#+\s+/

/**
 * Renders the list of memo titles in the DOM
 * @param {*} responseJson 
 */
const displayMemoTitles = async (responseJson) => {
  const dest = document.getElementById('memoTitlesList');
  dest.innerText = '';

  const access_times = (await db.access_times()).reduce((a, t) => { a[t.id] = t.last_access; return a; }, {});
  konsole.log({access_times});
  responseJson.memos.map(
    memo => ({ id: memo.id, title: memo.title.split('\r').join('')})
  )
  .map(
   memo => ({ id: memo.id, title: memo.title.replace(headerStartRegex, '')}) 
  )
  .map(
    memo => ({
      ...memo,
      last_access: access_times[memo.id] || memo.id
    })
  )
  .sort(
    (a, b) => b.last_access - a.last_access
  )
  .map(memo => {
    const a = document.createElement('a');
    a.style.display = 'block';
    a.href = `/memo/${memo.id}`;
    a.innerText = memo.title;
    return a;
  })
  .forEach(memo => {
    dest.appendChild(memo);
  });

}

/**
 * Do a search on the server. If no criteria is present just fetch all titles
 */
export async function searchMemos() {
  const criteria = document.getElementById('searchCriteria').value;
  if(!criteria) {
    console.log('No criteria supplied, just fetch everything');
    return loadMemoTitles(true);
  }

  const response = await fetch(`/organizator/memo/search?request.preventCache=${+ new Date()}`, {
    ...postOptions,
    "body": `search=${encodeURIComponent(criteria)}`,
  });
  const responseJson = await response.json();
  displayMemoTitles(responseJson);
  //console.log(responseJson);
}
