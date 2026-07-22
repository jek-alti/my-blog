# 픽셀 아트 에디터 — spec (승인본)

## 개요
16×16 격자에 도트를 찍어 그림을 그리고, PNG로 저장할 수 있는 픽셀 아트 에디터. 색상 팔레트 포함. `/apps/pixel-art/`에 순수 HTML/CSS/JS로 자체 완결.

## 사양
- **격자**: 16×16 셀. 클릭/드래그로 선택 색 칠하기.
- **팔레트**: 미리 정의된 색(약 16색) + `<input type="color">` 커스텀 색 선택. 현재 선택 색 표시.
- **도구**: 지우개(셀을 투명으로), 전체 지우기(Clear).
- **PNG 저장**: 그림을 `<canvas>`에 확대 렌더(도트당 20px → 320×320) 후 `toDataURL('image/png')`로 다운로드.
- **모바일**: 터치로 그리기(드래그) 지원, 스크롤 방지.
- **(옵션)** 현재 그림을 `localStorage`에 저장/복원.
- 외부 라이브러리 없음. 반응형 다크 톤.

## 파일
```
apps/pixel-art/
├── index.html
├── style.css
├── app.js
└── spec.md (본 문서)
```

## 진행 단계
Plan(승인 완료) → Build → Review → Embed(index.html 카드 + 커밋).
