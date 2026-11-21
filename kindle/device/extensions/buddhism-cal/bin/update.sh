#!/bin/sh
# 拉取今日日历卡片并刷新墨水屏。用法: update.sh [munger|buddhism]，默认 buddhism
CAL="${1:-buddhism}"
if [ -d /mnt/base-us ]; then MNT=/mnt/base-us; else MNT=/mnt/us; fi
EXT_DIR="$MNT/extensions/buddhism-cal"
LOG="$EXT_DIR/update.log"
IMG="$EXT_DIR/today-$CAL.png"
BASE="https://britpunk.github.io/munger-price-calendar/kindle/out"

log() { echo "$(date '+%F %T') [$CAL] $*" >> "$LOG"; }

# 读取屏幕分辨率，归一化为 宽<高
read -r W H < /sys/class/graphics/fb0/virtual_size
if [ "$W" -gt "$H" ]; then T=$W; W=$H; H=$T; fi
RES="${W}x${H}"
log "start, fb=${RES}"

# 记录 WiFi 初始状态，便于事后恢复
WAS_ON=$(lipc-get-prop -i com.lab126.wifid cm_enable 2>/dev/null)

# 打开 WiFi 并等待连接（最长 60 秒）
lipc-set-prop -i com.lab126.wifid cm_enable 1 >/dev/null 2>&1
ASSOC=""
i=0
while [ "$i" -lt 30 ]; do
  ASSOC=$(lipc-get-prop -s com.lab126.wifid cm_assoc 2>/dev/null)
  case "$ASSOC" in *CONNECTED*) break ;; esac
  i=$((i + 1))
  sleep 2
done
log "wifi assoc=$ASSOC"

# 下载图片，失败重试 3 次
ok=0
for try in 1 2 3; do
  if wget -q -T 30 -O "$IMG.tmp" "$BASE/today-$RES-$CAL.png" 2>>"$LOG"; then
    ok=1
    break
  fi
  log "fetch attempt $try failed"
  sleep 5
done
if [ "$ok" -ne 1 ]; then
  log "FETCH FAILED for $RES-$CAL"
  rm -f "$IMG.tmp"
  exit 1
fi
mv -f "$IMG.tmp" "$IMG"

# 刷新墨水屏：优先 eips，回退 fbink
if eips -g "$IMG" >/dev/null 2>&1; then
  log "drawn via eips"
elif command -v fbink >/dev/null 2>&1; then
  fbink -q "$IMG" >/dev/null 2>&1
  log "drawn via fbink"
else
  log "NO DRAW TOOL"
fi

# 记录本次展示的是哪个日历（供循环切换用）
echo "$CAL" > "$EXT_DIR/last_cal"

# 恢复 WiFi 初始状态，省电
if [ "$WAS_ON" != "1" ]; then
  lipc-set-prop -i com.lab126.wifid cm_enable 0 >/dev/null 2>&1
fi
log "done"
