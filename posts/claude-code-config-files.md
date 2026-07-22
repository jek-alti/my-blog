# 클로드 코드 지침과 설정 파일

권한 모드(permission mode)보다 **더 확실하고 체계적으로** 클로드 코드를 통제하는 방법은 **설정 파일을 직접 수정**하는 것이다. 그러려면 클로드 코드를 구성하는 주요 파일들의 종류와 역할을 알아두는 게 좋다. 종류별로 정리했다.

## 1. 지침 문서 (CLAUDE.md 계열)

클로드 코드가 작업할 때 참고하는 지침 문서다.

| 파일 | 역할 | 위치 / 비고 |
| --- | --- | --- |
| `CLAUDE.md` | 클로드 코드가 작업 시 **가장 먼저 읽는 지침 문서**. 가장 중요하며, 프로젝트 전체에 적용되는 내용을 적는다. | 프로젝트 폴더 바로 아래. `~/.claude/CLAUDE.md`에 두면 **모든 프로젝트에 적용되는 전역 지침**이 된다. |
| `CLAUDE.local.md` | `local`이 들어간 파일은 **깃에 올리지 않는 개인용** 설정이라는 뜻. | 개인 오버라이드용 |
| `AGENTS.md` | 커서(Cursor), 코덱스(Codex) 등 **다른 에이전트에서 `CLAUDE.md`와 같은 역할**을 하는 문서. | 에이전트 공용 지침 |

## 2. MCP 설정 파일

MCP(외부 도구·서비스 연결) 설정을 담는 파일이다.

| 파일 | 역할 | 적용 범위 |
| --- | --- | --- |
| `.mcp.json` | 프로젝트 MCP를 설정하는 파일 | 해당 프로젝트 |
| `~/.claude.json` | 전역 MCP를 설정하는 파일 | 모든 프로젝트 |

## 3. 커넥터 설정 파일 (macOS 기준)

| 파일 | 역할 |
| --- | --- |
| `~/Library/Application Support/Claude/claude_desktop_config.json` | 클로드 데스크톱 앱의 커넥터 설정 |

## 4. 클로드가 무시할 파일 설정

| 파일 | 역할 |
| --- | --- |
| `.claudeignore` | 클로드가 **읽지 않았으면 하는 파일**을 지정. 깃의 `.gitignore`와 비슷하다. 민감한 정보나 불필요하게 컨텍스트를 차지하는 폴더를 적어두면, 클로드 코드가 그 파일을 읽거나 검색 결과에 포함하지 않는다. |

## 5. 환경변수

| 파일 | 역할 |
| --- | --- |
| `.env` / `.env.local` | 환경변수를 저장하는 파일. API 키나 데이터베이스 접속 정보처럼 **코드에 직접 쓰면 안 되는 민감한 값**을 보관한다. 클로드 코드는 작업 시작 시 이 파일들을 자동으로 불러온다. |

## 6. 권한과 동작 제어

| 파일 | 역할 |
| --- | --- |
| `settings.json` | 클로드 코드의 **권한과 동작을 제어**하는 설정 파일. 도구·명령어 실행 권한과 훅 등 대부분의 설정을 여기에 저장한다. |
| `settings.local.json` | 위와 동일하되 **개인용**(깃에 올리지 않음). |

이 파일에서 자주 쓰는 두 가지:

| 항목 | 키 | 설명 |
| --- | --- | --- |
| **훅(hook)** | `"hooks"` | 하네스를 구축하다 보면 매번 반복되는 작업(예: 각 작업마다 커밋, 작업 종료 시 알림 띄우기)이 생긴다. 훅을 설정해 두면 클로드 코드가 **조건에 따라 특정 작업을 반드시 수행**한다. |
| **권한 허용 규칙** | `"permissions"` → `"allow"` / `"ask"` / `"deny"` | 퍼미션 설정. 허용(allow)·확인(ask)·거부(deny)로 도구·명령어 실행 권한을 정한다. |

### 예시 — 전역 settings.json (`~/.claude/settings.json`)

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

이 예시는 **설정·훅 파일 자체의 수정을 막고**(`permissions.deny`), Bash 명령 실행 직전에 위험 명령을 검사하는 훅(`hooks.PreToolUse`)을 등록한 구성이다. 권한 모드로 매번 승인하는 것보다, 이렇게 설정 파일로 규칙을 박아두면 훨씬 일관되게 클로드 코드를 통제할 수 있다.
