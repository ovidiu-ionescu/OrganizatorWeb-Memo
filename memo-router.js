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

const handleMemo = () => {
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

async function loadMemo() {
  const path = window.location.pathname;
  //console.log(path);
  const m = path.match(/\/memo\/(\d+)/);
  const id = m ? m[1] : 19;
  // check local storage for memo
  const memo_string = localStorage.getItem(`memo_${id}`);
  if(memo_string) try {
    const memo = JSON.parse(memo_string);
    const editor = document.getElementById("editor");
    editor.memoId = memo.id;
    editor.memogroup = memo.memogroup;
    editor.value = memo.text;
    return;
  } catch(e) {
    console.error('Failed to get memo from local storage', e);
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
    const memo = obj.memo;
    let text = `${memo.title}${memo.memotext}`.split("\r").join("");
    //console.log(text);
    const editor = document.getElementById("editor");
    editor.memoId = memo.id;
    editor.memogroup = memo.memogroup;
    editor.value = text;
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

const displayMemoTitles = (responseJson) => {
  const dest = document.getElementById('memoTitlesList');
  dest.innerText = '';
  responseJson.memos.map(
    memo => ({ id: memo.id, title: memo.title.split('\r').join('')})
  )
  .map(
   memo => ({ id: memo.id, title: memo.title.replace(headerStartRegex, '')}) 
  )
  .map(memo => {
    const a = document.createElement('a');
    a.style.display = 'block';
    a.href = `/memo/${memo.id}`;
    a.innerText = memo.title;
    return a;
  })
  // .map(memo => `[${memo.title}](/memo/${memo.id})`)
  // .map(memo => {
  //   const edi = document.createElement('memo-editor');
  //   edi.value = memo;
  //   return edi;
  // })
  .forEach(memo => {
    dest.appendChild(memo);
  });

}

async function searchMemos() {
  const criteria = document.getElementById('searchCriteria').value;

  const response = await fetch(`/organizator/memo/search?request.preventCache=${+ new Date()}`, {
    ...postOptions,
    "body": `search=${encodeURIComponent(criteria)}`,
  });
  const responseJson = await response.json();
  displayMemoTitles(responseJson);
  //console.log(responseJson);
}
