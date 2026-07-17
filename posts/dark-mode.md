# 다크 모드는 어떻게 동작하나

이 블로그의 다크 모드는 세 가지 조각으로 이뤄져 있습니다.

## 1. CSS 변수로 팔레트 정의

색을 값으로 하드코딩하지 않고, `:root`에 변수로 모아둡니다.

```css
:root {
  --bg: #fbfaf7;
  --text: #23201c;
}
:root[data-theme="dark"] {
  --bg: #16140f;
  --text: #ece7de;
}
```

`data-theme` 속성만 바꾸면 전체 색이 한 번에 전환됩니다.

## 2. 토글 + localStorage

사용자가 버튼을 누르면 테마를 바꾸고, 선택값을 `localStorage`에 저장합니다. 다시 방문해도 취향이 유지됩니다.

## 3. 깜빡임(FOUC) 없애기

가장 중요한 부분입니다. 페이지가 그려지기 **전에** 저장된 테마를 적용해야 흰 화면이 번쩍이지 않습니다.

```html
<script>
  var saved = localStorage.getItem("theme");
  document.documentElement.setAttribute("data-theme", saved || "light");
</script>
```

> 이 스크립트만 `<head>` 최상단에 인라인으로 두고, 나머지 로직은 모두 별도 파일로 분리했습니다.

시스템 설정(`prefers-color-scheme`)도 자동으로 반영하니, 처음 방문하는 분께도 자연스럽게 맞춰집니다.
