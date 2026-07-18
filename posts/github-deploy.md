# GitHub로 블로그 배포하기 — 커밋부터 자동 배포까지

오늘은 만든 블로그를 실제로 인터넷에 올리는 과정을 처음부터 끝까지 실습했다. `git`으로 코드를 기록하고, GitHub에 올리고, GitHub Pages로 배포하고, 마지막엔 **push만 하면 자동으로 배포되는** 파이프라인까지 만들었다. 오늘 배운 것을 순서대로, 그리고 실제로 막혔던 지점들과 함께 정리한다.

## 1. 커밋과 푸시는 다른 단계다

가장 먼저 헷갈렸던 개념. 둘은 별개의 단계였다.

- **커밋(commit)**: 변경 내용을 **내 컴퓨터(로컬)** 의 기록에 저장하는 것
- **푸시(push)**: 그 로컬 커밋을 **GitHub(원격)** 으로 올려 보내는 것

즉 커밋만 하면 아직 GitHub에는 아무것도 안 올라간 상태다. 푸시해야 비로소 원격에 반영된다.

### 푸시가 됐는지 확인하는 법

```bash
git status -sb
```

브랜치 옆에 `[ahead 1]`이 보이면 → 아직 안 올라간 커밋이 1개 있다는 뜻. 아무 표시가 없으면 로컬과 원격이 같다(= 푸시 완료).

더 확실하게는 "원격에 없는 커밋"만 뽑아볼 수 있다.

```bash
git log origin/main..HEAD --oneline
```

이게 아무것도 출력하지 않으면 전부 푸시된 것이다.

## 2. GitHub 계정은 Claude 계정과 별개

로컬 컴퓨터의 GitHub 로그인은 `gh`(GitHub CLI)라는 도구가 관리한다. 이건 Claude 계정이 아니라 **이 컴퓨터에 저장된 별도의 자격증명**이었다.

```bash
gh auth status   # 어떤 GitHub 계정으로 로그인돼 있는지 확인
```

저장소를 만들고 연결하고 올리는 것도 한 줄로 됐다.

```bash
gh repo create my-blog --private --source=. --remote=origin --push
```

## 3. 배포하려면 공개 범위가 중요하다

배포(GitHub Pages)를 켜려다 여기서 막혔다. Settings → Pages에 들어가니 **"Upgrade or make this repository public to enable Pages"** 라는 메시지가 떠 있었다.

![GitHub Pages 설정 화면 — 저장소를 공개로 바꾸거나 업그레이드해야 Pages를 켤 수 있다는 안내](images/deploy/pages-upgrade.png)

*Pages 설정 화면. 무료 플랜 + Private 저장소라 배포가 막혀 있다.*

정리하면:

- **무료 플랜**에서는 **Public(공개) 저장소만** GitHub Pages를 쓸 수 있다.
- Private 저장소를 배포하려면 유료 플랜(Pro 이상)이 필요하다.

그래서 블로그 저장소를 **Public으로 전환**했다. (Settings → General → 맨 아래 Danger Zone → Change visibility → Make public)

![Public으로 전환된 저장소 메인 화면](images/deploy/repo-public.png)

*Public으로 바뀐 뒤의 저장소 메인. 이름 옆에 `Public` 배지가 붙었다.*

## 4. GitHub Pages 배포 방식은 두 가지

| 방식 | 설명 | 언제 |
| --- | --- | --- |
| Deploy from a branch | 특정 브랜치 파일을 그대로 서빙 | 빌드 없는 정적 사이트 |
| GitHub Actions | 워크플로우로 빌드/배포 자동화 | 자동화·빌드가 필요할 때 |

우리 블로그는 빌드가 없는 순수 정적 사이트라 둘 다 가능했다. 배포 주소는 이런 형태였다.

```
https://<사용자명>.github.io/<저장소명>/
```

## 5. GitHub Actions로 자동 배포

가장 재미있었던 부분. `.github/workflows/` 폴더에 워크플로우 파일(`static.yml`)을 두면, 정해진 조건에서 GitHub가 자동으로 작업을 실행해 준다.

```yaml
on:
  push:
    branches: ["main"]   # main 에 push 될 때마다 자동 실행
```

이렇게 해두면 이제 **글을 쓰고 `git push` 하기만 하면** GitHub Actions가 알아서 사이트를 다시 배포한다. 배포 버튼을 따로 누를 필요가 없다.

![GitHub Actions 탭에서 배포 워크플로우가 실행되어 성공한 화면](images/deploy/actions-run.png)

*push 직후 Actions 탭. "Deploy static content to Pages" 워크플로우가 자동 실행되어 초록 체크로 완료됐다.*

> 참고: `.github`처럼 점(`.`)으로 시작하는 폴더는 숨김 처리돼서 파일 탐색기에서 안 보일 수 있다. 없어진 게 아니라 가려진 것뿐이다.

## 실습하며 나온 질문들 (Q&A)

오늘 배포를 진행하면서 실제로 막히고 궁금했던 것들을 정리했다.

**Q). 커밋했는데 GitHub에 안 올라갔다. 푸시됐는지 어떻게 확인하지?**
A). `git status -sb`에서 브랜치 옆에 `[ahead 1]`처럼 뜨면 아직 안 올라간 커밋이 있는 것이다. 표시가 없으면 완료. 더 확실히는 `git log origin/main..HEAD --oneline`이 아무것도 출력하지 않으면 전부 푸시된 상태다.

**Q). 배포는 어떤 단계로 이뤄지나?**
A). 저장소를 GitHub에 올리고 → GitHub Pages를 켜면 → 정적 파일이 `https://<사용자명>.github.io/<저장소명>/` 주소로 호스팅된다. 이후 push할 때마다 사이트가 갱신된다.

**Q). Enterprise 계정인데도 Private 저장소 배포는 30일 체험만 되나?**
A). 설정 화면의 "GitHub Enterprise" 배지는 "사이트를 비공개로 게시"하는 **기능 라벨**일 뿐, 내 계정이 Enterprise라는 뜻이 아니다. 그 30일 체험은 그 Enterprise 전용 기능에 한정된 이야기다. 당시엔 무료 플랜이라 Private 저장소 배포 자체가 안 됐다.

**Q). 그럼 Enterprise 조직의 저장소를 쓸 때만 Private 배포가 가능한가?**
A). 맞다. GitHub Pages 요금제는 **저장소 소유자**를 따른다. 내 개인 계정은 어떤 Enterprise의 멤버이긴 했지만, 그건 개인 계정 저장소에까지 혜택을 주지 않는다. Enterprise 산하 **조직이 소유한 저장소**여야 비공개 배포가 가능하다(조직 관리자가 정책을 허용한 경우).

![개인 계정이 vtt-media-ai Enterprise의 Member로 소속된 화면](images/deploy/enterprises.png)

*개인 계정(jek-alti)이 Enterprise(vtt-media-ai)의 Member이긴 하지만, 이 소속만으로 개인 저장소가 Enterprise 혜택을 받지는 않는다.*

**Q). 저장소를 Public으로 어떻게 바꾸나?**
A). Settings → General → 맨 아래 **Danger Zone** → Change visibility → Make public. 단, 전체 코드와 커밋 히스토리가 공개되므로 민감정보가 없는지 먼저 확인해야 한다.

**Q). 저장소 화면의 Releases / Packages가 배포 메뉴인가?**
A). 아니다. **Releases**는 소프트웨어 버전 배포, **Packages**는 npm·Docker 같은 패키지 발행용이다. 웹사이트 배포(GitHub Pages)는 그 화면이 아니라 **Settings → Pages**에 있다.

**Q). 워크플로우 `yml` 파일은 뭐하는 파일인가?**
A). GitHub Actions에게 "언제, 무엇을 자동으로 실행할지"를 알려주는 **설정 파일**이다. `.github/workflows/` 폴더 안에 `.yml`(YAML 형식)로 두면 GitHub가 인식한다. 우리 `static.yml`은 "`main`에 push되면 → 저장소 전체를 GitHub Pages로 배포하라"는 지시를 담고 있다. 핵심은 실행 조건을 정하는 `on:` 부분이었다.

```yaml
on:
  push:
    branches: ["main"]   # main 에 push 될 때마다
  workflow_dispatch:      # Actions 탭에서 수동 실행도 허용
```

**Q). 워크플로우에서 step의 `id`를 바꾸면 어떻게 되나?**
A). `id`는 그 step에 붙이는 **이름표**로, 자유롭게 지을 수 있다(job 안에서 유일해야 하고, 문자나 `_`로 시작). 예를 들어 `id: deployment`을 `id: deployment_1`로 바꿔도 된다. 단, 그 출력을 참조하는 쪽도 **같은 이름**으로 바꿔야 한다 — `url: ${{ steps.deployment_1.outputs.page_url }}`. 한쪽만 바꾸면 참조가 빈 값이 되어 배포된 사이트 URL 링크가 안 뜬다(배포 자체는 될 수 있지만 Environments에 주소가 안 나옴).

```yaml
    environment:
      name: github-pages
      url: ${{ steps.deployment_1.outputs.page_url }}   # 참조 (이름 일치)
    ...
      - name: Deploy to GitHub Pages
        id: deployment_1                                  # 이름표
        uses: actions/deploy-pages@v5
```

**Q). pull 받았는데 워크플로우 `yml` 파일이 안 보인다?**
A). `.github`처럼 점(`.`)으로 시작하는 폴더는 숨김 처리라 화면에서 가려질 뿐, 파일은 정상적으로 존재한다(pull은 제대로 받아진 것). VS Code 탐색기 맨 위의 `.github`를 펼치거나 `Cmd+P`로 `static.yml`을 검색하면 된다. Finder에서는 `Cmd+Shift+.`로 숨김 파일을 표시한다. 터미널에서는 `git ls-files .github/`로 추적 여부를 바로 확인할 수 있다.

## 정리하며

오늘의 흐름을 한 줄로 요약하면:

**수정 → `git commit` → `git push` → (Actions 자동 실행) → 사이트 배포**

처음엔 커밋·푸시·배포가 다 같은 말인 줄 알았는데, 각 단계가 무슨 역할인지 직접 해보니 확실히 구분됐다. 그리고 이 글 자체가 그 파이프라인을 테스트하는 첫 콘텐츠가 된다. 🚀

![배포된 블로그가 브라우저에 표시된 화면](images/deploy/live-site.png)

*`https://jek-alti.github.io/my-blog/` 에 실제로 배포된 블로그.*
