import { MemoEditor } from "./memo-editor"

export interface Memo {
  id:           number;
  text:         string;
  memogroup?:    IdName;
  timestamp?:   number;
  user?:        IdName;
}

export interface IdName {
  id:           number;
  name:         string;
}

export interface ServerMemo {
  id:           number;
  memogroup?:   IdName;
  user:         IdName;
  title:        string;
  memotext:     string;
  savetime?:    number;
}

export interface ServerMemoTitle {
  id:           number;
  group_id:     number;
  title:        string;
  userId:       number;
}

export interface ServerMemoList {
  memo:         ServerMemo;
  memos:        Array<ServerMemoTitle>;
}

export interface MemoTitle {
  id:           number;
  last_access:  number;
  title:        string;
}

export interface CacheMemo {
  id:           number;
  local:        Memo;
  server?:      Memo;
}

export interface AccessTime {
  id:           number;
  last_access:  number;
}

export interface PasswordThen {
  then: {
    // resolve: <T>(value?: T | PromiseLike<T>) => void;
    resolve: (value?: string | PromiseLike<string>) => void;
    reject: (reason?: any) => void;
  }
}

export interface GenericReject {
  (reason: any): void;
}

export interface UpdateMemoLogic {
  (
    memo:    Memo, 
    db_memo: CacheMemo, 
    resolve: (value?: Memo | PromiseLike<Memo>) => void, 
    reject:  GenericReject,
  ): CacheMemo
};

export interface HasType {
  type: string;
}

