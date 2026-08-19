# OWNERS — 누가 무엇을 소유하나

> **이 파일은 통합자만 수정한다.** 바꿀 게 있으면 카톡으로 요청한다.
> 담당·통합자는 **2026-08-19 확정.** A=영원 · B=서정 · C=미리(통합자 겸임).

## 소유권 지도

3명 팀이므로 **폴더 수 = 인원 수(3) + `shared/`** 이고, 통합자는 폴더 하나를 겸임한다.

| 폴더 | 레인 | 담당 | 카톡 | 하는 일 | 파일 |
|------|------|------|------|---------|------|
| `screen/` | A 화면 | 영원 | `[미정]` | 화면 7개 DOM·화면 전환·클릭 위임·도움바 DOM·진행 표시(F17) | `bank-ui.html`, `styles.css` |
| `mission/` | B 로직 | 서정 | `[미정]` | 미션 데이터·상태머신·오답 문구·용어 퀴즈(F16) | `missions.json`, `mission-engine.js`, `quiz-data.json`, `quiz.js` |
| `guide/` | C 답변·음성 | 미리 | `[미정]` | 미리 쓴 답변·askAI 폴백(F13)·도움바 배선(F14)·마이크·TTS(F12, F11) | `qa-data.json`, `ai-guide.js`, `voice.js` |
| `shared/` | 통합 | **통합자 = 미리** | `[미정]` | 인터페이스 계약, LLM 설정 자리 | `CONTRACT.md`, `llm-config.js`(커밋 안 함) |

카톡 아이디는 아직 이 문서에 적지 않았다 — 채울 사람은 통합자(미리).

**레인 A/B/C 는 `SPEC.md` 11절과 `plan.md` 의 레인 이름과 같다.** 폴더 이름만 새로 붙었다.

| 루트 파일 | 누가 고치나 |
|---|---|
| `CLAUDE.md`, `OWNERS.md` | **통합자만** |
| `SPEC.md`, `plan.md` | **통합자만** (내용 변경은 팀 합의 후) |
| `tasks.md` | **전원.** 자기 레인의 체크박스만 채운다 |
| `SYNC-LOG.md`, `VERSION.txt` | **통합자만** — `main` 에 머지할 때 한 줄 남긴다 |
| `README.md`, `.gitignore`, `.github/**` | **통합자만** (원격 저장소에서 온 파일) |
| `docs/research/**` | 작성자 = 김미리. 고칠 게 있으면 PR 로 제안한다 |
| `CHANGELOG-INBOX/` | 전원 (쪽지를 남기는 곳) |
| `personal/` | 팀 앱과 무관한 day1 개인 소개 페이지. 배포판(ZIP)에 넣지 않는다 |

## 규칙 3줄

1. **내 폴더 밖은 읽기만.** 고칠 게 있으면 카톡으로 부탁한다.
2. 루트 `CLAUDE.md` 는 **통합자만.** 내 규칙은 `내폴더/CLAUDE.md` 에 쓴다.
3. 그래도 뚫었으면 → `CHANGELOG-INBOX/` 에 쪽지를 남기고 **카톡으로 통보**한다.

## 공통 약속 (바꾸려면 고치기 전에 카톡)

폴더를 나눠도 이것만은 겹친다. 말 없이 바꾸면 팀 전체가 멈춘다.
근거는 `SPEC.md` 8·11절이고, 확정본은 `shared/CONTRACT.md` 에 둔다.

| 약속 | 지금 값 |
|------|---------|
| 화면 이름 7개 | `home` `bank` `account` `amount` `confirm` `done` + `quiz`(미션 아님) |
| 미션 단계 6개 | `home` → `bank` → `account` → `amount` → `confirm` → `done` |
| `data-action` 값 | `transfer` `pick-bank` `submit-account` `submit-amount` `confirm` `restart` (+ 키패드는 `data-key`) |
| 미션 데이터 파일 | `mission/missions.json` — 객체 **하나**(미션은 송금 1개, 배열 아님) |
| 미션 단계 스키마 | `{ step, action, value?, next, label, wrong }` — `label` 은 진행 표시(F17) 문구, `home` 은 빈 문자열 |
| 화면 전환 | `BankUI.showStep(name)` / `BankUI.showAnswer(text)` / `BankUI.showError(message, selector?)` |
| 판정 | `MissionEngine.submit({action, value})` → `{ok, step, message}` / `getStep()` / `getMission()` / `reset()` |
| AI 답변 | `AIGuide.askAI(question, currentStep, mission)` → `Promise<string>` — **인자 3개.** 절대 reject 하지 않는다 |
| 음성 | `Voice.isSupported()` / `Voice.startListening(onResult, onError)` |
| 퀴즈 | `Quiz.start()` — `#screen-quiz` 안을 `mission/quiz.js` 가 그린다 |
| 진입 파일 | `screen/bank-ui.html` — `<script src>` 선언은 **A만** 고친다 |
| 로드 순서 | 인라인 `BankUI` → `mission-engine.js` → `voice.js` → `ai-guide.js` → `quiz.js` |

`askAI` 의 인자를 2개로 줄이거나, `missions.json` 의 `label` 을 지우거나, `data-action` 값을 바꾸는 것이
**폴더 독점으로 못 막는 유일한 충돌**이다. 이것만 카톡으로 잠근다.

**바꾸는 순서:** 카톡에 제안 → 관련 담당자 OK → 통합자가 이 표와 `shared/CONTRACT.md` 갱신 → 배포판에 반영 → 그다음에 코드 고침.

## 검증 명령 (통합자가 합칠 때마다 1번)

테스트 러너가 없다. 그래서 **누가 봐도 같은 절차**를 검증으로 쓴다.

```bash
python3 -m http.server 8000
# 브라우저: http://localhost:8000/screen/bank-ui.html
```

1. 이체 → 한걸음은행 → `11022233344` → `50000` → 보내기 → 완료 화면까지 간다
2. 홈에서 "거래내역" 을 누르면 화면이 넘어가지 않고 오답 설명이 뜬다
3. "다시 설명해주세요" 를 누르면 답변이 화면에 뜬다 (소리는 나지 않는다)

세 개 중 하나라도 실패하면 **배포하지 않고** 담당자를 카톡으로 부른다.
자세한 판정 기준은 `plan.md` 의 Task S2 와 `SPEC.md` 6.1.

## 담당이 정해지면 할 일 (3단계)

담당이 위 표대로 확정됐다. 아래 3단계는 **각자** 자기 컴퓨터에서 한다. `settings.json` 은 사람마다 다르다.

**1. 내 폴더 밖을 못 고치게 한다** — `.claude/settings.json` 의 `permissions.deny` 에 아래를 넣는다.
자기 폴더는 **적지 않는다.** 적힌 곳이 못 고치는 곳이다. 예는 A(`screen/`) 담당.

```json
"deny": [
  "Edit(CLAUDE.md)",
  "Edit(OWNERS.md)",
  "Edit(mission/**)",
  "Edit(guide/**)",
  "Edit(shared/**)"
]
```

- `Edit` 규칙 하나가 `Write`·`NotebookEdit` 까지 덮는다. **`Write(...)` 를 따로 쓰면 무시된다**
- **`Read` 는 막지 않는다.** 남의 코드는 읽어야 하고, `Read` deny 는 같은 경로의 `Edit` 까지 막는다
- 항상 `**` 를 쓴다. `mission/*` 는 하위 폴더가 생기면 뚫린다
- 자연어(`"mission 폴더 건드리지 마"`)는 **에러도 안 나고 조용히 무시된다**
- 통합자는 `deny` 를 비우고 `ask` 에 `Edit(CLAUDE.md)`·`Edit(OWNERS.md)` 만 넣는다
- 문법 지뢰 요약: 자연어는 조용히 무시된다 / `Write(...)` 경로 규칙은 참조되지 않는다 / `Read` deny 는 같은 경로의 `Edit` 까지 막는다 / `*` 는 한 단계만 덮는다
- 공식 문서: `code.claude.com/docs/en/permissions`

**2. 확인은 두 번 한다.** `/permissions` 로 내 규칙이 목록에 보이는지 → 안 보이면 무시된 것.
그다음 **일부러 어겨 본다**: "`mission/mission-engine.js` 맨 아래에 주석 한 줄 추가해줘" → 막혀야 정상.

**3. 알림 훅을 켠다** — `.claude/hooks/owner-guard.py` 의 맨 위 두 줄(`MY_FOLDER`, `MY_NAME`)을 내 것으로 고치고,
`.claude/settings.json` 의 `PostToolUse` 에 등록한다. 등록 JSON 은 그 파일 주석에 있다.
`MY_FOLDER` 가 비어 있으면 훅은 **아무 일도 하지 않는다** — 지금이 그 상태다.
등록 후 `/hooks` 로 확인하고, deny 를 잠깐 풀어 남의 폴더를 고쳐 `CHANGELOG-INBOX/` 에 쪽지가 생기는지 본다.

> **손으로 고치지 말고 Claude 에게 시킨다.** `settings.json` 의 JSON 모양이 깨지면 파일이 통째로 거부되고 **훅까지 같이 죽는다.**
