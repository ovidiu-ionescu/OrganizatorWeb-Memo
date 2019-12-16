#!/bin/bash

# mkdir /mirror/WWW/organizator/pkg
DEST=/mirror/WWW/organizator/

sudo rsync -av \
memo.html \
memo-editor.js \
memo-router.js \
login.html \
logout.html \
org-manifest.json \
images \
$DEST

sudo rsync -av \
pkg/concatenate_bg.wasm \
pkg/concatenate.js \
$DEST/pkg

