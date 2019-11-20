import init, {
  concatenate,
  encrypt,
  memo_decrypt,
  memo_encrypt,
  process_markdown
} from "./pkg/concatenate.js";

let WASM_LOADED = false;
const WASM_LOADED_EVENT = 'memo_wasm_loaded';

const loadWasm = async () => {
  if(WASM_LOADED) return;
  await init();
  WASM_LOADED = true;

  let event = new Event(WASM_LOADED_EVENT);
  // console.log('wasm loaded, dispatch an event');
  document.dispatchEvent(event);
}

loadWasm();

const template = `
    <style type="text/css">
      :host {
        height: 100%;
        display: flex;
        flex: 1;
      }
      #source {
        resize: none;
        width: 100%;
        min-height: 20px;
        padding: 5px;
        overflow: scroll;
        box-sizing: border-box;
        display: none;
        flex: 1;
        font-size: 16px;
      }
      * {
        font-family: sans-serif;
        background-color: #1F1F1F;
        color: white;
      }
      #presentation {
        padding: 0;
        flex: 1;
      }
      #presentation del {
        color: gray;
      }
      #presentation  a {
        color: steelblue;
      }
      #container {
        position: relative;
        margin: 5px 2px 10px 2px;
        padding: 1px 2px 1px 5px;
        border-radius: 10px;
        display: flex;
        flex-flow: column;
        flex: 1;
      }
      #expand_img {
        position: absolute;
        top: 0;
        right: 0;
        border-radius: 10px;
      }
      nav img {
        width: 48px;
      }
      #modal_password {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(2px);
        justify-content: center;
        background-color: rgb(0,0,0,0.3);
        display: none;
      }
      #password_dialog {
        display: inline-block;
        width: 300px;
        margin: 0 auto 0 auto;
        border-radius: 10px;
        box-shadow: 5px 5px #101010;
        position: absolute;
        top: 150px;
        left:0;
        right: 0;
        background-color: #383838;
        padding: 0 10px 0 10px;
        opacity: 1;
      }
      #password_dialog * {
        background-color: #383838;
      }
      #password_dialog footer {
        text-align: right;
        margin-bottom: 10px;
      }
      #password_dialog input {
        font-size: 16px;
        border-radius: 5px;
      }
      #password {
        width: 100%;
      }

    </style>
    <div id="container">
    <nav id="toolbar">
    <img id="password_button" src="/images/lock-reset.svg">
    <img id="decrypt_button" src="/images/ic_lock_open_48px.svg">
    <img id="encrypt_button" src="/images/ic_lock_48px.svg">
    <img id="edit_button" src="/images/ic_create_48px.svg">
    <img id="crypto_button" src="/images/ic_insert_comment_48px.svg">
    <span style="display: inline-block; width: 48px;"></span>
    <img id="save_button" src="/images/ic_save_48px.svg" style="display: none">
    </nav>
    <!-- <img id="expand_img" src="/images/ic_expand_more_48px.svg"> -->
    <div id="presentation">Loading...</div>
    <div id="editing">
    <nav id="edit_toolbar">
    </nav>
    <textarea id="source" autocomplete="off" ></textarea>
    </div>
    <footer id="status"></footer>
    </div>
    <div id="modal_password">
    <div id="password_dialog">
      <p>Enter password</p>
      <input id="password" type="text">
      
      <footer>
      <img id="done_password" src="/images/ic_done_48px.svg">
      <img id="cancel_password" src="/images/ic_clear_48px.svg">
      </footer>
    </div>
    </div>
`;

class MemoEditor extends HTMLElement {
  constructor() {
    super();
    this.initialize();
  }

  async initialize() {
    
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = template;

    // build a cache of elements with an id
    this.$ = {};
    shadow.querySelectorAll('[id]').forEach((e) => this.$[e.getAttribute('id')] = e);

    // this.$.source.style.display = 'none';
    // this.$.source.addEventListener('input', () => {
    //   this._resizeTextArea();
    // });

    // this.$.source.addEventListener('change', () => this.value = this.$.source.value);

    // show the password dialog
    this.$.password_button.addEventListener('click', () => {
      //this.$.password_dialog.style.display = this.$.password_dialog.style.display === 'none' ? 'table' : 'none';
      this.$.modal_password.style.display = 'flex';
    });

    // collect the password
    this.$.done_password.addEventListener('click', () => {
      this.password = this.$.password.value;
      this.$.modal_password.style.display = 'none';
      if(this._savePending) {
        this._savePending = false;
        this.save();
      }
    });

    this.$.cancel_password.addEventListener('click', () => {
      this.$.modal_password.style.display = 'none';
      this._savePending = false;
    });

    this.$.decrypt_button.addEventListener('click', () => {
      this.value = memo_decrypt(this.$.source.value, this.password);
    });

    this.$.encrypt_button.addEventListener('click', () => {
      this.value  = memo_encrypt(this.$.source.value, this.password, (+ new Date()));
    });

    this.$.edit_button.addEventListener('click', () => {
      if(this._edit) {
        this.$.presentation.style.display = 'block';
        this.$.source.style.display = 'none';
        this._edit = false;
        this.$.save_button.style.display = 'none';
        this._display_markdown();

      } else {
        this.$.presentation.style.display = 'none';
        this.$.save_button.style.display = '';
        this.$.source.style.display = 'block';
        this._edit = true;
      }
    });

    this.$.crypto_button.addEventListener('click', () => {
      if(!this._edit) return;

      const start_quote = '\u300c';
      const end_quote = '\u300d';

      const start_offset = this.$.source.selectionStart;
      const end_offset = this.$.source.selectionEnd + 1;
      let s = this.$.source.value
      s = s.slice(0, start_offset) + start_quote + s.slice(start_offset);
      s = s.slice(0, end_offset) + end_quote + s.slice(end_offset);
       this.$.source.value = s;
    });

    this.$.save_button.addEventListener('click', () => { 
      this.save();
    });
  }

  _resizeTextArea() {
    //console.log(this.$.source.scrollHeight, this.$.source.style.height);
    let scrollHeight = this.$.source.scrollHeight;
    if (scrollHeight > 400) scrollHeight = 400;
    this.$.source.style.height = (scrollHeight) + 'px';
  }

  connectedCallback() {
    this._resizeTextArea();
  }

  set memoId(memoId) {
    this._memoId = memoId;
  }

  set memogroup(memogroup) {
    this._memogroup = memogroup;
  }

  _display_markdown() {
    let text = this.$.source.value;
    if(!text.startsWith('#')) {
      text = "```\n" + text + "\n```";
    }

    this.$.presentation.innerHTML = process_markdown(text);
}

  set value(markdown) {
    this.$.source.value = markdown;
    const proc = () => {
      // console.log('process', WASM_LOADED_EVENT);
      document.removeEventListener(WASM_LOADED_EVENT, proc);
      this._display_markdown();
    }
    if(WASM_LOADED) {
      proc();
    } else {
      // console.log('wasm not loaded, add an event listener');
      document.addEventListener(WASM_LOADED_EVENT, proc);
    }
    if(this.isConnected) this._resizeTextArea();
  }

  async save() {
    let src = this.$.source.value;
    if(src.indexOf('\u300c') > -1) {
      if(!this.password) {
        this._savePending = true;
        this.$.password_button.click();
        return;
      }
      src = memo_encrypt(this.$.source.value, this.password, (+ new Date()));
    }
    const memogroup = this._memogroup ? `group_id=${this._memogroup}&` : '';
    const memoId = ('' + this._memoId) ? `memoId=${this._memoId}&` : ''; 
    const text = `text=${encodeURIComponent(src)}&`;
    const body = `${memogroup}${memoId}${text}`;
    //console.log("Saving", body);

    const response = await fetch("/organizator/memo/", {
      "credentials": "include",
      "headers": {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "x-organizator-client-version": "3"
       },
      "body": body,
      "method": "POST",
      "mode": "cors"
    });

    if (response.status === 401) {
      // more info at https://www.w3schools.com/howto/howto_js_redirect_webpage.asp
      window.location.replace("/login.html");
      return;
    } else if (response.status === 200) {
      const responseJson = await response.json();
      //console.log(responseJson);
      if(!responseJson.memo) {
        window.history.replaceState(null, '', '/memo/');
      } else {
       this.memoId = responseJson.memo.id;
        window.history.replaceState(null, "", `/memo/${responseJson.memo.id}`);
        this.$.status.innerText = `Saved at ${new Date()}`;
      }
    }
  }

  new() {
    this.memoId = undefined;
    this.memogroup = undefined;
    this.$.source.value = '';

    this._savePending = false;
    this.$.presentation.style.display = 'none';
    this.$.source.style.display = 'block';
    this._edit = true;
  }
}

/*
Save memo
POST /memo/
memoId
text


*/

customElements.define('memo-editor', MemoEditor);