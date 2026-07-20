# Claude Code에 전역 안전장치 설정하기 — 위험 명령 차단 훅 만들기

> Claude Code(v2.1.215 기준)에서 `rm -rf`, `sudo`, `curl | bash` 같은 위험한 명령이 실수로 실행되는 걸 막는 **전역 안전장치**를 만든 과정을 정리했다. 단순 거부(deny) 규칙에서 시작해, 더 견고한 **PreToolUse 훅** 방식으로 넘어가고, 마지막엔 그 설정 파일 자체를 보호하는 데까지 다뤘다.

---

## 1. 왜 이걸 하는가

Claude Code는 에이전트가 터미널 명령을 대신 실행해준다. 편리하지만, 그만큼 `rm -rf`처럼 되돌릴 수 없는 명령이 잘못 나갈 위험도 생긴다. 그래서 "특정 위험 명령은 승인 팝업조차 없이 아예 실행되지 않도록" 전역 차단 규칙을 걸어두기로 했다.

차단하고 싶었던 명령 목록:

- `rm -rf` 계열 (폴더/루트 전체 삭제)
- `sudo` (관리자 권한 실행)
- `chmod 777` (파일 권한 전체 개방)
- `curl` / `wget`으로 받은 스크립트를 바로 셸로 파이프 실행 (`curl ... | bash`)
- `git push --force` (강제 푸시)
- `git reset --hard` (하드 리셋)

---

## 2. 두 가지 접근: deny 규칙 vs 훅

Claude Code에서 명령을 막는 방법은 크게 두 가지다.

### 2-1. permissions.deny 규칙

`settings.json`의 `permissions.deny` 배열에 패턴을 넣는 방식이다.

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)",
      "Bash(chmod 777 *)"
    ]
  }
}
```

규칙 평가 순서는 **deny → ask → allow**이고, 먼저 매치되는 규칙이 이긴다. deny는 항상 최우선이라 승인 팝업 없이 바로 거부된다.

**한계:** deny 규칙은 명령 문자열 **패턴 매칭**이라 우회에 약하다. `-rf`를 `-fr`로 바꾸거나, 파이프 앞뒤 공백만 달라져도(`|bash` vs `| bash`) 빠져나갈 수 있다. 특히 "다운로드 후 셸 실행" 같은 인자 기반 패턴은 옵션 순서 변경·리다이렉션·변수로 쉽게 우회된다.

### 2-2. PreToolUse 훅 (최종 채택)

훅은 특정 타이밍에 내 스크립트를 끼워 넣는 기능이다. `PreToolUse`는 **도구를 실행하기 직전**에 발생하는 이벤트라, 이 시점에 스크립트가 "차단" 신호를 주면 실행 자체를 막을 수 있다. 스크립트 안에서 정규식으로 실제 명령을 검사하므로 패턴 변형까지 훨씬 촘촘하게 잡는다. 그래서 이 방식으로 갔다.

---

## 3. 구현

### 3-1. 차단 스크립트 만들기

`~/.claude/hooks/block-dangerous.sh`:

```bash
#!/usr/bin/env bash
# ~/.claude/hooks/block-dangerous.sh
# 위험한 Bash 명령을 실행 전에 차단한다.

payload=$(cat)
cmd=$(echo "$payload" | jq -r '.tool_input.command // ""')

block() { echo "차단됨: $1" >&2; exit 2; }

# rm -rf / -fr (플래그가 붙어있는 형태)
echo "$cmd" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f|rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*r' \
  && block "rm -rf 계열은 실행할 수 없습니다. 직접 실행하세요."

# sudo
echo "$cmd" | grep -Eq '(^|[[:space:]])sudo([[:space:]]|$)' \
  && block "sudo 명령은 실행할 수 없습니다."

# chmod 777
echo "$cmd" | grep -Eq 'chmod[[:space:]]+.*777' \
  && block "chmod 777 (권한 전체 개방)은 실행할 수 없습니다."

# curl/wget → 파이프로 셸 실행 (띄어쓰기/붙여쓰기 모두)
echo "$cmd" | grep -Eq '(curl|wget)[[:space:]].*\|[[:space:]]*(bash|sh|zsh)' \
  && block "외부 스크립트를 받아 바로 셸로 실행하는 것은 금지되어 있습니다."

# git push --force / -f
echo "$cmd" | grep -Eq 'git[[:space:]]+push[[:space:]].*(--force|(^|[[:space:]])-f)([[:space:]]|$)' \
  && block "git push --force (강제 푸시)는 실행할 수 없습니다."

# git reset --hard
echo "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]].*--hard' \
  && block "git reset --hard (하드 리셋)는 실행할 수 없습니다."

# Claude Code 설정/훅 파일 자체를 리다이렉션·tee로 덮어쓰려는 시도 차단
echo "$cmd" | grep -Eq '(>>?|tee([[:space:]]|$))[^|&;]*\.claude/(settings(\.local)?\.json|hooks/)' \
  && block "Claude Code 설정/훅 파일은 수정할 수 없습니다. 직접 편집하세요."

exit 0
```

**핵심 포인트 — `exit 2`:** 훅이 도구를 실제로 **차단**하고 stderr 메시지를 Claude에게 돌려주는 건 종료 코드 2다. `exit 1`은 차단이 안 되고 그냥 로그만 남으니 주의. 가장 흔한 실수다.

### 3-2. settings.json에 훅 등록

`~/.claude/settings.json`의 `hooks` 키에 등록한다.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/사용자명/.claude/hooks/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

구조를 한 줄씩 보면:

- `hooks` — settings.json 안에서 훅 설정을 담는 최상위 키
- `PreToolUse` — 이벤트 이름(예약어). 임의 이름이 아니라 Claude Code가 정해둔 생명주기 이벤트다. 오타가 나면 에러도 없이 조용히 무시된다.
- `matcher` — 어떤 도구에 반응할지 필터. `"Bash"`면 Bash 실행에만 반응. 비워두면 모든 도구.
- 안쪽 `hooks` — 매치됐을 때 실제로 실행할 훅 목록
- `type: "command"` — 셸 명령/스크립트 실행 방식
- `command` — 실행할 것. 작업 디렉터리에 안 휘둘리게 **절대경로** 권장

### 3-3. 마무리

```bash
chmod +x ~/.claude/hooks/block-dangerous.sh   # 실행 권한
jq . ~/.claude/settings.json                  # JSON 문법 검사
```

설정은 세션 시작 시 로드된다. 이미 켜둔 세션이 있으면 재시작하고, `/hooks`로 등록됐는지 확인한다.

---

## 4. 설정 파일 자체 보호하기 (두 겹)

가드를 만들어도, Claude가 나중에 그 설정 파일 자체를 수정해 무력화할 수 있으면 의미가 없다. 그래서 설정·훅 파일 수정도 막았다. 여기엔 두 겹이 필요하다. Claude가 파일을 고치는 경로가 둘이기 때문이다.

1. **Edit/Write 도구로 직접 수정** → `permissions.deny` 규칙으로 차단
2. **Bash 명령(리다이렉션 `>`, `tee` 등)으로 수정** → 훅으로 차단 (위 스크립트 마지막 규칙)

`settings.json`에 추가한 deny 규칙:

```json
{
  "permissions": {
    "deny": [
      "Edit(~/.claude/settings.json)",
      "Write(~/.claude/settings.json)",
      "Edit(~/.claude/settings.local.json)",
      "Write(~/.claude/settings.local.json)",
      "Edit(~/.claude/hooks/**)",
      "Write(~/.claude/hooks/**)"
    ]
  }
}
```

파일 경로 앵커 규칙(gitignore 스타일):

- `~/` — 홈 디렉터리
- `//` — 진짜 절대경로 (single `/`는 절대경로가 아니라 설정 소스 기준 상대경로다! 함정 주의)
- `/` — 프로젝트 루트 기준
- 맨 앞에 아무것도 없는 파일명 — 모든 깊이에서 매치

이 Edit/Write deny 규칙은 내장 도구뿐 아니라 Claude Code가 인식하는 Bash 파일 명령(`cat`, `sed`, `head`, `tail`)까지 함께 막아준다.

**남는 틈:** Python/Node 스크립트로 파일을 직접 여는 우회는 규칙·훅 둘 다 못 잡는다. OS 레벨로 완전 봉쇄하려면 Claude Code의 **sandbox** 기능이 필요하다. 실수·자동 무력화 방지 목적에는 위 두 겹으로 충분하다.

---

## 5. 최종 settings.json

```json
{
  "theme": "dark",
  "inputNeededNotifEnabled": true,
  "agentPushNotifEnabled": true,
  "permissions": {
    "deny": [
      "Edit(~/.claude/settings.json)",
      "Write(~/.claude/settings.json)",
      "Edit(~/.claude/settings.local.json)",
      "Write(~/.claude/settings.local.json)",
      "Edit(~/.claude/hooks/**)",
      "Write(~/.claude/hooks/**)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/사용자명/.claude/hooks/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 6. 테스트 방법과 함정

### 6-1. 스크립트 단독 테스트 (제일 확실)

Claude를 거치지 않고 훅 스크립트에 가짜 입력을 직접 던져서 로직만 검증한다.

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /tmp/test999"}}' \
  | ~/.claude/hooks/block-dangerous.sh; echo "exit: $?"
```

`차단됨: rm -rf...` 메시지와 `exit: 2`가 나오면 정상.

설정/훅 파일 보호 규칙도 같은 방식으로:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"echo hacked > ~/.claude/settings.json"}}' \
  | ~/.claude/hooks/block-dangerous.sh; echo "exit: $?"
```

### 6-2. 겪었던 함정 — "안 막히는 것처럼 보이는" 상황

Claude에게 `rm -rf /tmp/123`을 시켰더니 차단 메시지 없이 그냥 "지울 게 없다"고 넘어갔다. **훅이 고장 난 게 아니었다.** Claude가 먼저 `ls`로 폴더를 확인해봤는데 `/tmp/123`이 존재하지 않아서, `rm -rf`를 **아예 실행하지 않기로** 판단한 것이다. 실행 시도 자체가 없었으니 훅이 걸릴 일도 없었던 것.

훅은 "실제로 실행되려는 명령"만 검사한다. 그래서 실제 폴더를 만들어두고 삭제를 시키니(`mkdir -p ~/test/test123` 후 삭제 요청) 그제야 `rm -rf`가 실행 단계까지 가서 훅이 정확히 가로챘다.

> **교훈:** 훅 검증은 Claude의 판단(존재하지 않는 경로는 건너뛰기 등)에 휘둘린다. 순수하게 로직만 보려면 6-1의 단독 테스트가 가장 깔끔하다.

### 6-3. 필요할 땐 직접 실행

이 훅은 "실수/자동 실행"을 막는 용도다. 정말 위험 명령이 필요할 땐 프롬프트 앞에 `!`를 붙여 사람이 직접 실행하면 된다. deny 규칙도 **Claude(에이전트)에게만** 적용되므로, 터미널에서 사람이 직접 파일을 수정하는 건 아무 제약이 없다.

---

## 7. Q&A 정리

**Q). PreToolUse 훅으로 막으면 settings.json에 추가하지 않아도 되나?**

A). 아예 안 건드릴 수는 없다. 훅도 결국 `settings.json`의 `hooks` 키에 "등록"을 해야 작동한다. 다만 구조가 "deny 규칙 배열" 대신 "hooks 등록 + 별도 스크립트 파일" 조합으로 바뀌는 것이다. 즉 `permissions.deny`는 안 써도 되지만, `settings.json`에 훅 등록은 여전히 필요하다.

**Q). `brew install jq`의 jq는 별도 프로그램인가?**

A). 그렇다. 명령줄에서 JSON을 파싱·가공하는 독립 유틸리티다. macOS 기본 탑재가 아니라 따로 설치해야 한다. 훅 스크립트가 Claude Code로부터 받은 JSON 입력에서 `command` 값만 꺼낼 때 쓴다. 설치가 싫으면 macOS 기본 `python3`로도 대체 가능하다:

```bash
cmd=$(echo "$payload" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')
```

**Q). settings.json과 settings.local.json에 넣는 건 뭐가 다른가?**

A). 두 파일은 **구조(키·문법)는 완전히 동일**하고, 다른 건 적용 범위와 git 공유 여부다.

- `~/.claude/settings.json` — 유저 전역. 내 모든 프로젝트에 적용되는 개인 기본값.
- `.claude/settings.json` (프로젝트 폴더) — 그 프로젝트에만 적용되고 git에 커밋되어 팀원과 공유됨.
- `.claude/settings.local.json` (프로젝트 폴더) — 그 프로젝트에만 적용되지만 git에서 자동 무시(gitignore)되어 내 컴퓨터에만 남음. 개인 오버라이드용.

우선순위(높은 순): 관리자(managed) > CLI 플래그 > local > 프로젝트 > 유저 전역. "더 좁은 범위가 이긴다"고 기억하면 된다. 단 `permissions`의 deny 규칙만은 override가 아니라 **모든 범위에서 합쳐지며**, 어느 한 곳의 deny는 다른 곳의 allow로 절대 못 푼다.

→ 전역 개인 안전장치가 목적이므로 `~/.claude/settings.json`에 넣는 게 정답이었다.

**Q). `PreToolUse`는 그냥 이런 JSON으로 선언하는 키워드인가?**

A). 임의 키워드가 아니라 Claude Code가 미리 정해둔 **이벤트 이름(예약어)** 이다. 작동 중 여러 생명주기 시점에 이벤트가 발생하는데, `PreToolUse`는 도구 실행 **직전**이라 차단이 가능하다. `PostToolUse`는 실행 **후**라 차단 용도로는 못 쓴다. 이름이 정확히 일치해야 하고, 오타가 나면 에러 없이 조용히 무시된다. 그 외 자주 쓰는 이벤트로는 `PostToolUse`, `UserPromptSubmit`, `SessionStart`/`SessionEnd`, `Stop` 등이 있다.

**Q). 터미널에서 `claude`를 입력하면 그게 새 세션인가?**

A). 그렇다. `claude`를 입력하면 새 세션이 시작되고, 이때 `settings.json`을 처음부터 다시 읽으므로 변경한 훅 설정이 이 세션부터 적용된다. 단, 다른 탭/창에 이미 열려 있던 기존 세션은 예전 설정을 물고 있으니 종료 후 새로 켜야 한다. `claude --continue`(`-c`)로 직전 대화를 이어받아도 설정 자체는 시작 시 다시 읽으므로 훅은 적용된다.

**Q). settings.json을 command(터미널)에서 수정하는 코드는?**

A). deny 규칙은 Claude에게만 적용되므로 사람이 직접 CLI로 수정하는 건 자유롭다. 세 가지 방법:

에디터로 열기:
```bash
open -e ~/.claude/settings.json   # 기본 편집기
code ~/.claude/settings.json      # VS Code
```

jq로 특정 항목만 수정 (⚠️ 같은 파일로 바로 리다이렉션하면 파일이 비워져 날아가니, 반드시 임시 파일 경유):
```bash
# deny 규칙 추가
jq '.permissions.deny += ["Bash(git clean -fd *)"]' ~/.claude/settings.json > ~/.claude/settings.tmp \
  && mv ~/.claude/settings.tmp ~/.claude/settings.json

# 값 변경
jq '.theme = "light"' ~/.claude/settings.json > ~/.claude/settings.tmp \
  && mv ~/.claude/settings.tmp ~/.claude/settings.json
```

통째로 덮어쓰기(heredoc):
```bash
cat > ~/.claude/settings.json << 'EOF'
{ ... 원하는 전체 JSON ... }
EOF
```

어떤 방법이든 저장 후 `jq . ~/.claude/settings.json`으로 문법 검사. JSON이 깨지면 설정 전체가 무시된다. 변경 내용은 새 세션부터 반영.

---

## 8. 최종 상태 정리

| 목적 | 방식 |
|------|------|
| 위험 명령 차단 (`rm -rf`, `sudo`, `chmod 777`, `curl\|bash`, `git push --force`, `git reset --hard`) | PreToolUse 훅 |
| 설정·훅 파일 수정 차단 (리다이렉션) | 훅 |
| 설정·훅 파일 수정 차단 (Edit/Write 도구) | permissions.deny 규칙 |

- `~/.claude/hooks/block-dangerous.sh` — 차단 로직
- `~/.claude/settings.json` — 훅 등록 + deny 규칙 (전역 적용)

앞으로 규칙을 추가·수정하려면 스크립트의 `grep` 패턴 블록만 손보면 되고, settings.json은 다시 안 건드려도 된다. 사람이 직접 CLI로 편집하는 건 언제든 가능하다.

---

*작성 환경: Claude Code v2.1.215 / macOS*
