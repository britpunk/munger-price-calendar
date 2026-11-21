#!/bin/sh
# 自动轮换循环：每隔 INTERVAL 秒在芒格/佛学两个日历间切换（由 autostart.sh 启动）
INTERVAL=3600
if [ -d /mnt/base-us ]; then MNT=/mnt/base-us; else MNT=/mnt/us; fi
EXT_DIR="$MNT/extensions/buddhism-cal"
STATE="$EXT_DIR/last_cal"
while true; do
  PREV=$(cat "$STATE" 2>/dev/null)
  if [ "$PREV" = "buddhism" ]; then NEXT=munger; else NEXT=buddhism; fi
  sh "$EXT_DIR/bin/update.sh" "$NEXT"
  sleep "$INTERVAL"
done
