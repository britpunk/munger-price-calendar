#!/bin/sh
# 启动每小时自动更新：禁止休眠 + 后台循环
if [ -d /mnt/base-us ]; then MNT=/mnt/base-us; else MNT=/mnt/us; fi
EXT_DIR="$MNT/extensions/buddhism-cal"
PIDFILE="$EXT_DIR/auto.pid"

# 已有循环则先停掉
if [ -f "$PIDFILE" ]; then
  kill "$(cat "$PIDFILE")" 2>/dev/null
  rm -f "$PIDFILE"
fi

# 阻止屏幕休眠，保证循环不被挂起
lipc-set-prop -i com.lab126.powerd preventScreenSaver 1 >/dev/null 2>&1

# loop 第一个循环会立即刷一次
nohup sh "$EXT_DIR/bin/loop.sh" >/dev/null 2>&1 &
echo $! > "$PIDFILE"
