#!/usr/bin/env bash
# apps/{앱이름}/ 폴더가 자체완결 구조(index.html 포함)인지 검사 (CLAUDE.md 웹앱 규칙)
set -euo pipefail

fail=0

shopt -s nullglob
for dir in apps/*/; do
  name=$(basename "$dir")
  if [ ! -f "${dir}index.html" ]; then
    echo "::error::apps/${name}/ 에 index.html이 없습니다 (자체완결 구조 위반)"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "OK: 모든 apps/*/ 폴더가 index.html을 포함합니다."
