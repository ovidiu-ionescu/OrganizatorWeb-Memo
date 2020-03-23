/**
 * @prettier
 *
 * Component for editing a memo
 */

import * as db from "./memo_db.js";
import konsole from "./console_log.js";
import * as server_comm from "./server_comm.js";
import {
  Memo,
  ServerMemo,
  CacheMemo,
  PasswordThen,
  IdName,
  HasType,
} from "./memo_interfaces.js";
import * as events from "./events.js";
import "./img-inline-svg.js";
import "./group-list.js";
import * as memo_processing from "./memo_processing.js";

import init, {
  concatenate,
  encrypt,
  memo_decrypt,
  memo_encrypt,
  process_markdown,
} from "../pkg/concatenate.js";

let WASM_LOADED = false;
let WASM_LOADING = undefined;

const loadWasm = async () => {
  if (WASM_LOADED) return;
  konsole.log("wasm init", WASM_LOADING);
  if (!WASM_LOADING) {
    konsole.log("Initiate wasm loading");
    WASM_LOADING = init();
  } else {
    konsole.log("wasm already loading", WASM_LOADING);
  }
  await WASM_LOADING;
  WASM_LOADED = true;
  konsole.log("wasm was loaded, from now on it should not load again");
};

//loadWasm();

const template = `
    <style type="text/css">
      :host {
        height: 100%;
        display: flex;
        flex: 1;
      }
      #editing {
        display: flex;
        flex-flow: column;
        flex: 1;
      }
      #source {
        resize: none;
        width: 100%;
        min-height: 20px;
        padding: 5px;
        overflow: scroll;
        box-sizing: border-box;
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
      nav img, img-inline-svg {
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
      #edit_meta {
        display: flex;
        justify-content: space-between;
      }
      #presentation p {
        overflow-wrap: anywhere;
        word-break: break-all;
      }

    </style>
    <div id="container">
    <nav id="toolbar">
    <img-inline-svg id="password_button" src="/images/lock-reset.svg"></img-inline-svg>
    <img-inline-svg id="decrypt_button" src="/images/ic_lock_open_48px.svg"></img-inline-svg>
    <img-inline-svg id="encrypt_button" src="/images/ic_lock_48px.svg"></img-inline-svg>
    <img-inline-svg id="edit_button" src="/images/ic_create_48px.svg"></img-inline-svg>
    <img-inline-svg id="journal_button" src="/images/ic_inbox_48px.svg"></img-inline-svg>
    </nav>
    <!-- <img id="expand_img" src="/images/ic_expand_more_48px.svg"> -->
    <div id="presentation">Loading...</div>
    <div id="editing" style="display: none">
    <nav id="edit_toolbar">
      <img-inline-svg id="crypto_button" src="/images/ic_insert_comment_48px.svg"></img-inline-svg>
      <img-inline-svg id="today_button" src="/images/ic_today_48px.svg"></img-inline-svg>
      <img-inline-svg id="checkbox_button" src="/images/ic_done_48px.svg"></img-inline-svg>
      <img-inline-svg id="link_button" src="/images/ic_link_48px.svg"></img-inline-svg>
      <span style="display: inline-block; width: 48px;"></span>
      <img-inline-svg id="save_all_button" src="/images/save_alt-24px.svg"></img-inline-svg>
    </nav>
    <div id="edit_meta">
      <span id="edit_user"></span>
      <time id="edit_timestamp"></time>
      <memogroup-list id="edit_memogroup"></memogroup-list>
    </div>
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

declare global {
  interface Date {
    toIsoString: () => string;
  }
}

Date.prototype.toIsoString = function () {
  var tzo = -this.getTimezoneOffset(),
    dif = tzo >= 0 ? "+" : "-",
    pad = function (num) {
      var norm = Math.floor(Math.abs(num));
      return (norm < 10 ? "0" : "") + norm;
    };
  return (
    this.getFullYear() +
    "-" +
    pad(this.getMonth() + 1) +
    "-" +
    pad(this.getDate()) +
    "T" +
    pad(this.getHours()) +
    ":" +
    pad(this.getMinutes()) +
    ":" +
    pad(this.getSeconds()) +
    dif +
    pad(tzo / 60) +
    ":" +
    pad(tzo % 60)
  );
};

type MyElement = HTMLElement & HTMLInputElement & PasswordThen;
export class MemoEditor extends HTMLElement {
  private $: { [key: string]: MyElement };
  private _edit: boolean;
  private _memoId: number;
  private _memogroup: IdName;
  private _user: IdName;
  private _timestamp: number;
  private _readonly: boolean;

  constructor() {
    super();
    this.initialize();
  }

  get memoId() {
    return this._memoId;
  }
  async initialize() {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = template;

    // build a cache of elements with an id
    this.$ = {};
    shadow.querySelectorAll("[id]").forEach((e: MyElement) => {
      this.$[e.getAttribute("id")] = e;
    });

    // this.$.source.style.display = 'none';
    // this.$.source.addEventListener('input', () => {
    //   this._resizeTextArea();
    // });

    // this.$.source.addEventListener('change', () => this.value = this.$.source.value);

    // show the password dialog
    this.$.password_button.addEventListener("click", () => {
      //this.$.password_dialog.style.display = this.$.password_dialog.style.display === 'none' ? 'table' : 'none';
      this.$.modal_password.style.display = "flex";
    });

    // collect the password
    this.$.done_password.addEventListener("click", () => {
      this.$.modal_password.style.display = "none";
      const then = this.$.password.then;
      this.$.password.then = undefined;
      if (then) {
        const pwd = this.$.password.value;
        if (pwd) {
          then.resolve(pwd);
        } else {
          then.reject("Empty password");
        }
      }
    });

    this.$.cancel_password.addEventListener("click", () => {
      this.$.modal_password.style.display = "none";
      const then = this.$.password.then;
      this.$.password.then = undefined;

      if (then) {
        then.reject("Refused to give password");
      }
    });

    this.$.decrypt_button.addEventListener("click", async () => {
      const password = await this._get_password();
      const clear_text = memo_decrypt(this.$.source.value, password);
      if (this._edit) {
        this.value = clear_text;
      } else {
        this.$.presentation.innerHTML = process_markdown(clear_text);
      }
    });

    this.$.encrypt_button.addEventListener("click", async () => {
      const encrypted_source = await this._encrypt();
      this.value = encrypted_source;
      this.save_local_only({ type: "Encryption button" });
    });

    // Editing
    this.$.edit_button.addEventListener("click", () => {
      if (this._readonly) {
        return;
      }
      if (this._edit) {
        this._show_presentation();
      } else {
        this._show_editor();
      }
    });

    this.$.crypto_button.addEventListener("click", async () => {
      if (!this._edit) return;
      await this._get_password();

      const start_quote = "\u300c";
      const end_quote = "\u300d";

      const start_offset = this.$.source.selectionStart;
      const end_offset = this.$.source.selectionEnd;
      let s = this.$.source.value;
      s = s.slice(0, end_offset) + end_quote + s.slice(end_offset);
      s = s.slice(0, start_offset) + start_quote + s.slice(start_offset);
      this.$.source.value = s;
    });

    this.$.today_button.addEventListener("click", () => {
      const today = new Date().toISOString().substring(0, 10);
      const start_offset = this.$.source.selectionStart;
      let s = this.$.source.value;
      s =
        s.slice(0, start_offset) +
        `\n_${today}_  \n\n\n` +
        s.slice(start_offset);
      this.$.source.value = s;
    });

    this.$.checkbox_button.addEventListener("click", async () => {
      const start_offset = this.$.source.selectionStart;
      let s = this.$.source.value;
      s = s.slice(0, start_offset) + "- [ ] " + s.slice(start_offset);
      this.$.source.value = s;
    });

    this.$.link_button.addEventListener("click", async () => {
      const start_offset = this.$.source.selectionStart;
      const end_offset = this.$.source.selectionEnd;
      let text = "";
      // Can we read the clipboard content?
      // if(start_offset === end_offset) {
      //   text = await navigator.clipboard.readText();
      // }

      let s = this.$.source.value;
      try {
        text = new URL(s.slice(start_offset, end_offset)).hostname;
      } catch (error) {}
      s = s.slice(0, end_offset) + ")" + s.slice(end_offset);
      s = s.slice(0, start_offset) + `[${text}](` + s.slice(start_offset);
      this.$.source.value = s;
    });

    this.$.save_all_button.addEventListener("click", async () => {
      await this.save_local_only({ type: "Sync with server" });
      server_comm.save_all();
    });

    // pasting links
    this.$.source.addEventListener("paste", (event) => {
      const text = event.clipboardData.getData("text/plain");
      if (!text.startsWith("http://") && !text.startsWith("https://")) return;
      const editor = this.$.source;
      event.preventDefault();
      const link_text =
        editor.value.slice(0, editor.selectionStart) +
        `[${new URL(text).hostname}](${text})` +
        editor.value.slice(editor.selectionEnd);
      editor.value = link_text;
    });

    this.$.source.addEventListener("click", (event) => {
      const editor = this.$.source;
      const interestPoint = editor.selectionStart;
      const new_text = memo_processing.toggle_checkbox(
        editor.value,
        interestPoint
      );
      if (new_text) {
        editor.value = new_text;
      }
    });

    // listen to saving events
    document.addEventListener(events.SAVING_EVENT, (event) => {
      konsole.log("Received saving event", event);
      this.$.status.innerText = (event as CustomEvent).detail;
    });

    document.addEventListener(events.SAVE_ALL_STATUS, (event) => {
      konsole.log(
        `Received ${events.SAVE_ALL_STATUS} event, detail ${
          (event as CustomEvent).detail
        }`
      );
      this.$.save_all_button.style.color = (event as CustomEvent).detail;
      konsole.log(`Button color is: [${this.$.save_all_button.style.color}]`);
    });

    document.addEventListener(events.MEMO_CHANGE_ID, (event: CustomEvent) => {
      konsole.log(
        `Received ${events.MEMO_CHANGE_ID} event, detail ${event.detail}`
      );
      if (event.detail.old_id === this._memoId) {
        this._memoId = event.detail.new_id;
        window.history.replaceState(null, "", `/memo/${event.detail.new_id}`);
      }
    });

    document.addEventListener(events.MEMO_DELETED, (event: CustomEvent) => {
      konsole.log(
        `Received ${events.MEMO_DELETED} event, detail ${event.detail}`
      );
      if (this.memoId === event.detail) {
        this.show_status(`# Memo ${this.memoId} has been deleted`);
      }
    });

    // save every time we might get rid of the page content
    const save = this.save_local_only.bind(this);
    window.addEventListener("blur", save);
    window.addEventListener("beforeunload", save);
    window.addEventListener("pagehide", save);
    window.addEventListener("pageshow", save);
    window.addEventListener("popstate", save);
    document.addEventListener(events.NAVIGATE, save);

    this.$.journal_button.addEventListener("click", (evt) => {
      evt.stopPropagation();
      events.navigate("/journal");
    });
  } // end of initialize

  _show_presentation() {
    this.$.presentation.style.display = "block";
    this.$.editing.style.display = "none";
    this._edit = false;
    this._display_markdown();
  }
  _show_editor() {
    this.$.presentation.style.display = "none";
    this.$.editing.style.display = "";
    this._edit = true;
  }

  _resizeTextArea() {
    //console.log(this.$.source.scrollHeight, this.$.source.style.height);
    let scrollHeight = this.$.source.scrollHeight;
    if (scrollHeight > 400) scrollHeight = 400;
    this.$.source.style.height = scrollHeight + "px";
  }

  connectedCallback() {
    this._resizeTextArea();
  }

  set memoId(memoId: number) {
    this._memoId = memoId;
  }

  set memogroup(memogroup: IdName) {
    this._memogroup = memogroup;
  }

  _display_markdown() {
    let text = this.$.source.value;
    if (!text.startsWith("#")) {
      text = "```\n" + text + "\n```";
    }
    loadWasm().then(() => {
      this.$.presentation.innerHTML = process_markdown(text);
    });
  }

  set value(markdown: string) {
    this.$.source.value = markdown;
    this._display_markdown();
    if (this.isConnected) this._resizeTextArea();
  }

  _get_password() {
    if (this.$.password.value) {
      return Promise.resolve<string>(this.$.password.value);
    }
    return new Promise<string>((resolve, reject) => {
      this.$.password.then = { resolve, reject };
      this.$.modal_password.style.display = "flex";
    });
  }

  async _encrypt() {
    let src = this.$.source.value;
    if (src.indexOf("\u300c") > -1) {
      const password = await this._get_password();
      return memo_encrypt(this.$.source.value, password, +new Date());
    } else {
      return src;
    }
  }

  async save_local_only(event: HasType) {
    const cause = (event && event.type) || "no event supplied";
    if (!this._memoId) {
      konsole.log(
        "save_local_only, triggered by",
        cause,
        "; no memo in the editor, nothing to save"
      );
      return;
    }
    konsole.log(`save_local_only ${this._memoId}, triggered by: ${cause}`);
    const saved_memo = await db.save_local_only(await this.get_memo());
    if (saved_memo.timestamp > this._timestamp) {
      konsole.log(
        `save_local_only ${
          this._memoId
        }, save happened, current timestamp: ${new Date(
          this._timestamp
        ).toIsoString()}, cache timestamp ${new Date(
          saved_memo.timestamp
        ).toIsoString()}`
      );
      this._timestamp = saved_memo.timestamp;
      this._display_timestamp();
      events.save_all_status(events.SaveAllStatus.Dirty);
    } else {
      konsole.log(
        `Save local of memo ${this._memoId} did not happen, we didn't get a new timestamp, old ${this._timestamp}, new ${saved_memo.timestamp}`
      );
    }
  }

  new_memo() {
    this._memoId = -+new Date();
    konsole.log("New memo in editor", this._memoId);
    window.history.replaceState(null, "", `/memo/${this._memoId}`);
    this.memogroup = null;
    this._user = null;
    this._timestamp = 0;
    this.$.source.value = "";
    this.$.edit_memogroup.value = "-1";
    this._readonly = false;
    this._show_editor();
  }

  /**
   * Extracts a full memo structure. It is always encrypted
   */
  async get_memo(): Promise<Memo> {
    const encrypted_source = await this._encrypt();
    const result = {
      id: this._memoId,
      memogroup: (this.$.edit_memogroup as any).memogroup,
      text: encrypted_source,
      user: this._user,
      timestamp: this._timestamp,
      readonly: this._readonly,
    };
    return result;
  }

  async set_memo(memo: Memo) {
    konsole.log("Activating memo in editor", memo.id);

    await this.save_local_only({ type: "set_memo" });

    this._memoId = memo.id;
    this._memogroup = memo.memogroup;
    this._user = memo.user;
    this.value = memo.text;
    this.$.edit_user.innerText = (memo.user && memo.user.name) || "";
    if (memo.memogroup) {
      this.$.edit_memogroup.value = memo.memogroup.id.toString();
    } else {
      this.$.edit_memogroup.value = "-1";
    }
    this._timestamp = memo.timestamp;
    this._readonly = !!memo.readonly;
    this._display_timestamp();

    this._show_presentation();
  }

  /**
   * Display some status text like loading... etc
   * @param text
   */
  show_status(text: string) {
    konsole.log("Display status in editor", text);
    this._memoId = null;
    this._memogroup = null;
    this._user = null;
    this.value = text;
    this.$.edit_user.innerText = "";
    this.$.edit_memogroup.value = "-1";
    this._timestamp = null;
    this._readonly = true;
    this._display_timestamp();
    this._show_presentation();
  }

  _display_timestamp() {
    if (!this._timestamp) {
      return "";
    }
    this.$.edit_timestamp.innerText = new Date(this._timestamp).toIsoString();
  }
}

konsole.log("Registering memo-editor web component");
customElements.define("memo-editor", MemoEditor);
