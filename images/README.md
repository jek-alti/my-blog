# images

배경 이미지를 여기에 넣습니다.

- 파일명을 **`bg.jpg`** 로 저장하면 `css/style.css`가 자동으로 배경에 옅게 깔아줍니다.
- 다른 파일명(예: `bg.png`)을 쓰려면 `css/style.css`의 `body::before { background-image: url("../images/bg.jpg"); }` 한 줄만 바꾸면 됩니다.
- 배경 농도는 같은 파일의 `--bg-image-opacity` 값(라이트 0.18 / 다크 0.12)으로 조절합니다.
