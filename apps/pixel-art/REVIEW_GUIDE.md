# REVIEW 지침 — 픽셀 아트 에디터 (Review 서브에이전트 전용)

당신은 **Review 서브에이전트**입니다. Build 에이전트가 만든 결과물을 **처음 보는 검증자 입장**에서 객관적으로 검증하세요. (당신은 이 코드를 만들지 않았습니다.)

## 검증 대상
- `apps/pixel-art/index.html`, `apps/pixel-art/style.css`, `apps/pixel-art/app.js`
- 사양 기준: `apps/pixel-art/spec.md`, `apps/pixel-art/BUILD.md`

## 범위 규칙
- 소스 파일(index.html/style.css/app.js)은 **수정 금지**. 검증만.
- 오직 `apps/pixel-art/review.md` 파일 하나만 새로 작성합니다. (주의: `BUILD.md`, `spec.md`, `REVIEW_GUIDE.md`는 건드리지 마세요.)
- 로컬 서버 실행·정적 점검(node --check 등)·git status는 허용.

## 검증 항목
1. **코드 리뷰**: 16×16 격자 생성/그리기(클릭+드래그, 터치), 팔레트/커스텀 색 선택, 지우개/전체지우기, PNG 저장(오프스크린 canvas 320×320 → toDataURL 다운로드), localStorage 키가 `pixel-art-data`인지.
2. **정적 점검**: JS 문법(`node --check apps/pixel-art/app.js`), 콘솔 에러 유발 요소, index.html의 상대경로 참조, 외부 라이브러리/CDN 미사용, getElementById 대상 요소 존재 여부.
3. **동작 확인**: 가능하면 로컬 서버로 브라우저 확인(그리기/팔레트/지우개/PNG 다운로드/모바일 터치/반응형). 브라우저 자동화 불가 시 그 사실을 명시하고 코드·정적 수준까지 최대한 검증.
4. **범위 준수**: Build가 `apps/pixel-art/` 밖 파일을 건드리지 않았는지(git status).

## 산출물: `apps/pixel-art/review.md`
- 요약 판정(PASS / 수정 필요)
- 항목별 검증 결과(체크리스트)
- 발견된 문제(심각도·재현·파일/라인) — 있으면
- 권장 수정 사항 — 있으면
- 확인하지 못한 부분(환경 제약 등)

## 완료 후 보고
review.md의 핵심 결론(PASS 여부 + 주요 문제 목록)을 요약해 반환하세요. 최종 텍스트가 반환값입니다.
