#!/bin/sh
set -e
exec node ./ops/headless/bin/run.js --data-dir /data
