# REVIEW 결과 — 2048 게임

- 검증자: Review 서브에이전트 (코드 미작성, 제3자 검증)
- 대상: `apps/2048/index.html`, `apps/2048/style.css`, `apps/2048/game.js`
- 기준: `apps/2048/spec.md`, `apps/2048/BUILD.md`
- 일자: 2026-07-22

## 요약 판정: PASS (수정 필요 없음)

핵심 규칙(표준 2048 병합, 이중 병합 없음), localStorage 키(`2048-best`), 파일 자체 완결성, 범위 준수 모두 충족. 심각도 있는 결함 없음. 아래는 선택적 개선 제안(비차단).

## 1. 코드 리뷰 (game.js)

| 항목 | 결과 | 근거 |
|------|------|------|
| 이동 로직 | PASS | `getLine`/`collapse`/`setLine`로 4방향을 좌측 기준으로 정규화, 방향별 좌표 매핑 정확 (line 125-155) |
| 병합 규칙 | PASS | `collapse`에서 인접 동일값 병합 후 `i++`로 소비 처리 (line 107-117) |
| 이중 병합 없음 | PASS | 아래 시뮬레이션으로 검증 |
| 타일 생성 | PASS | 유효 이동(`moved`)일 때만 `addRandomTile`, 2=90%/4=10% (line 73, 186-194) |
| 점수 | PASS | 병합값 합산 `gainedTotal`을 score에 누적 (line 188) |
| 최고점수 | PASS | `score > best`일 때 갱신 및 저장 (line 189-192) |
| localStorage 키 | PASS | `var BEST_KEY = "2048-best"` (line 5), 사양과 정확히 일치 |
| 승리 판정 | PASS | 병합으로 2048 최초 생성 시 `won` 플래그로 1회만 오버레이, Keep Going 허용 (line 197-201) |
| 게임오버 판정 | PASS | 빈 칸 + 인접 동일쌍 없음 검사 `canMove` (line 209-221) |
| 입력(키보드) | PASS | ArrowKeys 매핑 + `preventDefault`로 스크롤 방지 (line 276-288) |
| 입력(스와이프) | PASS | touchstart/move/end, `SWIPE_MIN=24`, touchmove `passive:false`로 스크롤 방지 (line 291-320) |
| New Game | PASS | 보드/점수 초기화, best 유지 (line 263-273) |

### 이중 병합 검증 (독립 시뮬레이션)
`collapse` 로직을 별도 harness로 추출해 테스트한 결과:

```
[2,2,4,0] -> [4,4,0,0] gained=4     (정상)
[4,2,2,0] -> [4,4,0,0] gained=4     (정상)
[2,2,2,2] -> [4,4,0,0] gained=8     (정상: 4로 합쳐진 후 재병합 안 됨 — 8 아님)
[4,4,8,0] -> [8,8,0,0] gained=8     (정상: 새로 만든 8이 기존 8과 재병합 안 됨)
[8,8,8,0] -> [16,8,0,0] gained=16   (정상)
[2,4,8,16] -> 변화 없음 gained=0    (정상)
```
**표준 2048 규칙(한 이동에서 한 타일 1회 병합) 위반 없음.**

## 2. 정적 점검

| 항목 | 결과 | 근거 |
|------|------|------|
| JS 문법 | PASS | `node -c apps/2048/game.js` → 통과 |
| 상대경로 참조 | PASS | index.html이 `style.css`(line 7), `game.js`(line 42)를 상대경로로 참조 |
| 외부 라이브러리/CDN | PASS | http/cdn/import 등 외부 참조 grep 결과 없음. 로컬 `game.js`만 로드 |
| 콘솔 에러 유발 요소 | PASS(코드수준) | 모든 getElementById 대상 요소가 index.html에 존재, localStorage는 try/catch로 방어 |
| IIFE/strict mode | PASS | 전역 오염 없음, `"use strict"` |

## 3. 동작 확인

- **브라우저 자동화 불가**: 이 환경에는 브라우저 자동화/헤드리스 렌더 도구가 없어 실제 키/터치 인터랙션·화면 렌더는 실행 검증하지 못했습니다.
- 대신 (a) 병합/점수 로직을 독립 시뮬레이션으로 검증(위 1항), (b) DOM 요소 참조 정합성·이벤트 배선을 코드로 정적 검증했습니다.
- 코드상 다음이 정상 동작할 것으로 판단: 방향키/스와이프 이동·병합, 점수/최고점수 갱신·복원, 유효 이동 시 새 타일, 승리/게임오버 오버레이, New Game 리셋, 반응형(`.board`의 `aspect-ratio:1/1` + `max-width:480px` + `clamp()` 폰트).

## 4. 범위 준수

- `git status --porcelain` 결과: 신규 파일이 모두 `apps/2048/` 내부에만 존재.
  ```
  ?? apps/2048/{BUILD.md, REVIEW.md, game.js, index.html, spec.md, style.css}
  ```
- 블로그의 다른 파일(루트 index.html, css/, js/, posts/, CLAUDE.md 등) 변경·추가 없음. **범위 준수 PASS.**

## 발견된 문제
차단성(심각) 결함 없음.

## 권장 개선 사항 (선택, 비차단)
1. **뷰포트 확대 차단**: `<meta viewport>`에 `maximum-scale=1.0, user-scalable=no`(index.html line 5)가 있어 접근성상 핀치 줌이 막힙니다. 게임 UX상 흔한 선택이나, 접근성 관점에서 제거 고려 가능.
2. **슬라이드 애니메이션 미적용**: `render()`가 매 이동마다 `tilesEl.innerHTML=""`로 타일을 전부 재생성하므로(game.js line 78) `.tile { transition: transform }`(style.css line 151)은 사실상 미사용이고, 모든 타일이 매 이동 `appear` 애니메이션을 재생합니다. 사양의 "가벼운 트랜지션" 요구는 충족하나 부드러운 이동 연출은 없음.
3. **오버레이 접근성**: 오버레이 버튼에 포커스 이동/`aria-live`가 없어 스크린리더 사용자에게 승리·게임오버 상태가 즉시 안내되지 않음.

## 확인하지 못한 부분
- 실제 브라우저에서의 키/터치 인터랙션 및 시각 렌더(자동화 도구 부재).
- 실제 localStorage 지속(저장·재방문 복원)의 런타임 확인 — 코드 경로는 정상.
