#!/bin/sh
# 停止自动更新并恢复休眠
if [ -d /mnt/base-us ]; then MNT=/mnt/base-us; else MNT=/mnt/us; fi
EXT_DIR="$MNT/extensions/buddhism-cal"
PIDFILE="$EXT_DIR/auto.pid"

if [ -f "$PIDFILE" ]; then
  # 连 loop 和其子 shell 一起停
  pkill -f "loop.sh" 2>/dev/null
  kill "$(cat "$PIDFILE")" 2>/dev/null
  rm -f "$PIDFILE"
fi
lipc-set-prop -i com.lab126.powerd preventScreenSaver 0 >/dev/null 2>&1
