#!/bin/bash

# mkdir /mirror/WWW/organizator/pkg
DEST=/mirror/WWW/organizator/

sudo rsync -av \
memo.html \
console_log.js \
events.js \
img-inline-svg.js \
memo_db.js \
memo_processing.js \
memo-editor.js \
memo-router.js \
server_comm.js \
login.html \
logout.html \
org-manifest.json \
images \
$DEST

sudo rsync -av \
pkg/concatenate_bg.wasm \
pkg/concatenate.js \
$DEST/pkg

