# 클로드 코드 지침과 설정 파일

권한 모드(permission mode)보다 **더 확실하고 체계적으로** 클로드 코드를 통제하는 방법은 **설정 파일을 직접 수정**하는 것이다. 그러려면 클로드 코드를 구성하는 주요 파일들의 종류와 역할을 알아두는 게 좋다. 종류별로 정리했다.

## 1. 지침 문서 (CLAUDE.md 계열)

클로드 코드가 작업할 때 참고하는 지침 문서다.

| 파일 | 역할 | 위치 / 비고 |
| --- | --- | --- |
| `CLAUDE.md` | 클로드 코드가 작업 시 **가장 먼저 읽는 지침 문서**. 가장 중요하며, 프로젝트 전체에 적용되는 내용을 적는다. | 프로젝트 폴더 바로 아래. `~/.claude/CLAUDE.md`에 두면 **모든 프로젝트에 적용되는 전역 지침**이 된다. |
| `CLAUDE.local.md` | `local`이 들어간 파일은 **깃에 올리지 않는 개인용** 설정이라는 뜻. `.gitignore`에 `**/CLAUDE.local.md` 패턴을 추가해야 하며, 개인 테스트 URL이나 샌드박스 설정 등을 저장하기 좋다. | 개인 오버라이드용 |
| `AGENTS.md` | 커서(Cursor), 코덱스(Codex) 등 **다른 에이전트에서 `CLAUDE.md`와 같은 역할**을 하는 문서. | 에이전트 공용 지침 |

### 유형에 따른 메모리 위치

CLAUDE.md는 유형에 따라 아래 세 위치 중 하나에 둘 수 있고, 공유 범위가 각각 다르다.

| 유형 | 위치 | 용도 | 공유 범위 |
| --- | --- | --- | --- |
| 프로젝트 메모리 | `[프로젝트]/CLAUDE.md`<br>`[프로젝트]/.claude/CLAUDE.md` | 팀 공유 프로젝트 설정 | 팀(깃 커밋) |
| 사용자 메모리 | `~/.claude/CLAUDE.md` | 개인 전역 설정 | 본인만 |
| 프로젝트 로컬 | `[프로젝트]/CLAUDE.local.md` | 개인 프로젝트별 설정 | 본인만(`.gitignore`) |

`CLAUDE.local.md`는 반드시 `.gitignore`에 `**/CLAUDE.local.md` 같은 패턴으로 추가해야 한다. 개인적인 테스트 URL이나 샌드박스 설정 등, 팀과 공유하면 안 되는 값을 저장하기에 좋다.

### 전역 디렉터리 (`~/.claude/`)

모든 프로젝트에 공통으로 적용되는 설정으로, 개인 코딩 스타일·선호 도구·공통 명령어 등을 저장한다. 깃에는 포함되지 않는다.

```
~/.claude/
├── CLAUDE.md         # 개인 전역 메모리
├── settings.json     # 사용자 설정
└── commands/
    └── my-review.md  # 개인 커스텀 명령어
```

| 파일 | 용도 |
| --- | --- |
| `CLAUDE.md` | 기술 스택, 코딩 원칙, 네이밍 규칙, 커밋 규칙, 선호/비선호 패턴 |
| `settings.json` | 들여쓰기, 따옴표, TS strict 등 기계적 설정 |
| `my-review.md` | 타입/보안/성능 체크리스트 기반 리뷰 |

### 프로젝트 디렉터리 (`[프로젝트]/.claude/`)

특정 프로젝트에만 적용되는 팀 공유 설정이다. `settings.local.json`은 `.gitignore`에 추가해서 깃 추적 대상에서 제외하면, `settings.json`(팀 공유)과 분리된 개인용 설정만 남길 수 있다.

```
my-project/
├── CLAUDE.md                    # 프로젝트 개요 (기술 스택, API 명세)
└── .claude/
    ├── CLAUDE.md                # 상세 코딩 컨벤션
    ├── settings.json             # 팀 공유 설정 (Git 커밋 ✓)
    ├── settings.local.json       # 개인 설정 (Git 제외 X)
    ├── commands/
    │   ├── deploy.md             # Vercel 배포 명령어
    │   └── migrate.md            # Prisma 마이그레이션 명령어
    ├── agents/
    │   └── todo-crud.md          # TODO CRUD 구현 에이전트
    └── rules/
        ├── api-rules.md          # API 작업 시 자동 적용 규칙
        └── component-rules.md    # 컴포넌트 작업 시 자동 적용 규칙
```

| 파일 | 깃 | 용도 |
| --- | --- | --- |
| `CLAUDE.md`(루트) | ✓ | 프로젝트 개요, 도메인 모델, API 명세 |
| `.claude/CLAUDE.md` | ✓ | 코딩 컨벤션, 네이밍 규칙, 금지 사항 |
| `settings.json` | ✓ | TS 설정, 린트 규칙, 배포 환경 변수 |
| `settings.local.json` | x | 로컬 DB URL, 개인 환경설정 |
| `deploy.md` | ✓ | 배포 체크리스트 + 롤백 가이드 |
| `migrate.md` | ✓ | Prisma 마이그레이션 가이드 |
| `todo-crud.md` | ✓ | TODO 기능 구현 템플릿 |
| `api-rules.md` | ✓ | `src/api/**` 작업 시 자동 적용 |
| `component-rules.md` | ✓ | `src/components/**` 작업 시 자동 적용 |

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
