# REVIEW — 픽셀 아트 에디터

- 검증자: Review 서브에이전트 (코드 미작성, 객관적 검증)
- 대상: `apps/pixel-art/index.html`, `style.css`, `app.js`
- 기준: `spec.md`, `BUILD.md`
- 일자: 2026-07-22

## 요약 판정: **PASS** (경미한 개선 제안만 존재, 기능 결함 없음)

사양 1~8 요구사항을 모두 충족한다. 소스 파일 수정 없이 검증만 수행했고, `apps/pixel-art/` 밖 파일은 변경되지 않았다. 치명적/기능적 버그는 발견되지 않았으며, 발견된 항목은 모두 경미(minor)·개선 제안 수준이다.

## 항목별 체크리스트

### 1. 코드 리뷰
- [x] **16×16 격자 생성**: `buildGrid()`가 256개(`GRID_SIZE*GRID_SIZE`) 셀을 `data-index`와 함께 생성. CSS `grid-template: repeat(16,1fr)`와 일치.
- [x] **클릭 그리기**: `mousedown`(좌클릭만, `e.button!==0` 가드)에서 `e.target`의 셀에 `applyToCell`.
- [x] **드래그 그리기**: `mouseover` + `isDrawing` 플래그로 연속 칠하기. `mouseup`은 `window`에 바인딩되어 격자 밖에서 놓아도 상태 해제됨(견고).
- [x] **터치 그리기**: `touchstart`/`touchmove` + `{passive:false}` + `e.preventDefault()`로 스크롤 방지. 좌표 매핑은 `document.elementFromPoint(clientX, clientY)` 사용 — 아래 "터치 좌표 매핑" 참고.
- [x] **팔레트**: 16색 `PALETTE` 스와치 버튼 생성, 클릭 시 `selectColor()`로 선택 + `.is-selected` 표시.
- [x] **커스텀 색**: `<input type="color">` `input` 이벤트 → `selectColor(value)`.
- [x] **현재 색 표시**: `updateCurrentUI()`가 `currentSwatch` 배경 갱신 + 일치 스와치 강조(대소문자 무시 비교).
- [x] **지우개**: `setEraser()` 토글, `applyToCell`에서 `eraserOn`이면 `null` 대입 → `paintCellDom`이 배경 제거(빈 칸).
- [x] **전체 지우기**: 내용이 있을 때만 `confirm()` 후 초기화 + `renderAll` + `save`.
- [x] **PNG 저장**: 오프스크린 `canvas#exportCanvas`(320×320), `DOT_PX=20`(=320/16). `x=(i%16)*20`, `y=floor(i/16)*20`으로 셀 채움, 빈 셀은 skip → 투명 유지. `toDataURL('image/png')` → 동적 `<a download="pixel-art.png">` click. **로직 정확.**
- [x] **localStorage 키**: `STORAGE_KEY = "pixel-art-data"` — 사양과 정확히 일치. `save()`(setItem)/`load()`(getItem+검증) 모두 try/catch로 감쌈. 복원 시 배열 길이(256)·타입 검증 후 문자열 아니면 `null`로 정규화 → 손상 데이터에 견고.

### 2. 정적 점검
- [x] **JS 문법**: `node --check apps/pixel-art/app.js` → OK.
- [x] **IIFE 전역 오염 방지**: 전체가 `(function(){ "use strict"; ... })()`로 감싸짐.
- [x] **getElementById 대상 존재**: `grid, palette, colorPicker, currentSwatch, eraserBtn, clearBtn, saveBtn, exportCanvas` 8개 모두 HTML에 존재(확인 완료).
- [x] **상대경로 참조**: `href="style.css"`, `src="app.js"` — 상대경로, 자체 완결.
- [x] **외부 라이브러리/CDN 미사용**: `http(s)://`·CDN·외부 `<script>`/`<link>` 없음.
- [x] **콘솔 에러 유발 요소**: 미발견. 이벤트 핸들러는 모두 존재하는 요소에 바인딩되고, null 인덱스 방어(`applyToCell`의 범위 가드) 있음.

### 3. 동작 확인
- **브라우저 자동화 미수행(환경 제약)**: 이 세션은 비대화형이며 Playwright 등 브라우저 자동화 MCP는 인증 필요 상태로 사용 불가. (로컬에 Google Chrome.app은 존재하나 구동 드라이버 없음.) 따라서 실제 렌더/클릭/터치/다운로드는 **코드·정적 수준까지** 검증함.
- 코드 트레이스 기준으로 그리기/드래그/팔레트/커스텀 색/지우개/전체 지우기/PNG 저장/localStorage 복원 경로가 모두 정합적. 반응형은 `.grid`의 `width:100%; max-width:384px; aspect-ratio:1/1`로 모바일 폭에서 넘치지 않도록 처리됨.

### 4. 범위 준수
- [x] `git status`: `apps/pixel-art/`만 신규(untracked). 블로그의 다른 파일(루트 `index.html`, `css/`, `js/`, `posts/`, 다른 `apps/*`) 변경 **없음**. 범위 준수.
- (참고) 본 리뷰는 `apps/pixel-art/review.md` 한 파일만 신규 작성.

## 발견 사항 (모두 경미 / 개선 제안)

1. **[minor] 접근성 — 확대 차단**: `index.html:5` viewport에 `maximum-scale=1.0, user-scalable=no`. 그리는 동안 핀치 줌으로 인한 오작동을 막으려는 의도로 보이나, 저시력 사용자의 페이지 확대를 막는 접근성 제약. 스크롤 방지는 이미 `.grid`의 `touch-action:none` + 터치 핸들러 `preventDefault`로 처리되므로 `user-scalable=no`는 제거를 고려해도 됨.
2. **[minor] localStorage 쓰기 빈도**: `applyToCell`이 셀 하나 칠할 때마다 `save()`(JSON.stringify + setItem) 호출. 드래그로 다수 셀을 지날 때 매 셀마다 저장이 일어남(최대 256회). 기능상 문제는 없으나, 드래그 종료(mouseup/touchend) 시점에만 저장하도록 디바운스하면 효율적.
3. **[nit] a11y 시맨틱**: `role="grid"` 하위에 `role="row"` 없이 `role="gridcell"`만 존재. 스크린리더 그리드 탐색 규격상 row 래핑이 권장되나, 시각 사용자 동작에는 영향 없음.

## 터치 좌표 매핑 검증 (중점 항목)
`indexFromPoint(clientX, clientY)`는 `document.elementFromPoint(clientX, clientY)`로 실제 히트테스트를 수행하고, 반환 요소가 `.cell`일 때만 `dataset.index`를 파싱한다. 터치 이벤트의 `clientX/clientY`는 뷰포트 기준 좌표이고 `elementFromPoint`도 뷰포트 기준이므로 좌표계가 일치한다. 격자가 `1fr`/`aspect-ratio`로 화면에 따라 크기가 달라져도, getBoundingClientRect 기반 수동 계산이 아니라 브라우저 히트테스트에 위임하므로 스케일 변화에 강건하다. 격자 밖으로 나가면 non-cell 또는 null → `applyToCell`의 가드로 무시. **매핑 정확·견고.**

## PNG 저장 로직 검증 (중점 항목)
- 오프스크린 canvas 크기 320×320, `DOT_PX=20`으로 16×20=320 정합.
- 셀 인덱스 → 좌표: `x=(i%16)*20`, `y=floor(i/16)*20`. 행 우선(row-major) 인덱싱이 DOM 생성 순서와 동일하여 격자 배치와 정확히 대응.
- 빈 셀(`null`)은 `continue`로 건너뛰어 canvas 투명 배경 유지 → 사양의 "빈 셀 투명" 충족.
- `clearRect`로 매 저장마다 초기화, `toDataURL('image/png')` → 임시 `<a download>` 생성·click·제거. 타 도메인 리소스 없어 canvas taint 없음. **정확.**

## 확인하지 못한 부분
- 실제 브라우저에서의 렌더링/터치/PNG 다운로드 동작(환경상 브라우저 자동화 불가). 코드·정적 검증으로 대체함. 실기기 최종 확인은 사용자/Embed 단계에서 권장.
