# 「금융한걸음」 구현 계획 (plan.md)

> **에이전트 작업자용:** 이 계획은 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans`로 Task 단위 실행하는 것을 전제로 쓴다. 모든 단계는 `- [ ]` 체크박스다.

**목표:** 데스크톱 Chrome에서 열면 가상 은행 화면으로 "김민수에게 5만원 보내기"를 완료 화면까지 수행할 수 있고, 틀리게 누르면 왜 틀렸는지 설명을 받고, 막히면 질문을 적어 보내 화면에 뜬 답을 읽고 다음으로 갈 수 있는 웹 데모 1개.

**접근:** 빌드 도구·프레임워크·번들러 없음. 정적 파일을 `localhost`로 서빙한다. **세 사람이 각자 자기 파일만 고치는 세 개의 독립 레인으로 나눈다.** 레인끼리는 `missions.json` 과 네 개의 전역 객체(`BankUI` / `MissionEngine` / `AIGuide` / `Voice`)로만 만난다. S0에서 그 계약과 **스텁**을 먼저 만들기 때문에, 세 사람 모두 첫 순간부터 동작하는 페이지를 보며 서로를 기다리지 않는다.

**기술 스택:** HTML5, CSS(커스텀 프로퍼티), 바닐라 JS(ES2020, 모듈 없이 전역), `fetch`, Web Speech API(F12, Should), `python3 -m http.server`.

**SPEC:** `SPEC.md` (2026-08-19 2차 MoSCoW 확정 + 3차 수정 반영본). 이 계획은 SPEC을 근거로 쓴 것이므로 둘을 같이 읽는다.

**UI/UX 레퍼런스:** 신한 SOL뱅크 「돈 보내기」 체험(`SPEC.md` 13절). 흐름·정보 구조·입력 방식·버튼 배치를 참고하되 **로고·브랜드명·색·아이콘은 복제하지 않는다.** 가상 은행이다. SOL과 다른 곳은 SPEC 13.3에 반영/단순화/제외/팀결정으로 분류해 뒀다 — **이 계획은 그 분류를 넘어서 기능을 더하지 않는다.**

**3차 수정으로 이 계획에 반영된 것:** `askAI` 인자 3개(`question, currentStep, mission`) · `MissionEngine.getMission()` 신설 · `missions.json` 의 `label` 과 F17 진행 표시 · 미션은 송금 1개 · F16 오답은 설명 후 다음. **팀 결정 대기 5건(SPEC 12절)은 2026-08-19에 전부 확정됐다** — F11 Should 상향, F16 오답 처리 확정, 은행명 `한걸음은행` 확정, 비밀번호 단계 제외 확정, 목표 금액 홈 1회 표시 확정. 아래 제약에 확정값을 반영했다.

---

## Global Constraints

SPEC에서 그대로 가져온 프로젝트 전역 제약. 모든 Task의 요구사항에 암묵적으로 포함된다.

- **인원 3명, 기간 1일, 산출물은 MVP 1개** (SPEC 5.1)
- **플랫폼은 웹.** 네이티브 앱 아님 (SPEC 5.1)
- **모든 데이터는 가짜.** 실제 금융 데이터·실제 개인정보 미사용 (SPEC 5.1)
- **AI는 사용자를 대신해 버튼을 누르지 않는다.** 설명·안내·피드백만 한다 (SPEC 1)
- **AI 답변은 Must 레인에서 화면 텍스트로만 출력한다.** `speechSynthesis` 를 Must 단계에서 쓰지 않는다 — F11은 **Should로 확정**됐다(SPEC 12.1). Should 착수 시 담당은 C(미리)이고, `.claude/agents/code-reviewer.md` 검토 항목 4번도 같이 고친다. **Must 레인(S0~S2) 완료 전까지는 착수하지 않는다**
- **MVP(Must)에 음성은 없다.** F12(마이크)·F11(TTS) 모두 Should라 Must 경로의 질문 수단은 텍스트 입력뿐이다 (SPEC 7)
- **Won't 기능을 만들지 않는다:** F9(반복 오답 힌트 상승), F10(단계별 안내 배너) (SPEC 4.2)
- **미션 내용은 `missions.json` 에만 있다.** 단계·정답·오답 문구·단계 이름(`label`)을 JS에 하드코딩하지 않는다 — F6 Must (SPEC 4.1)
  - **AI 답변 경로도 이 파일을 본다.** `askAI(question, currentStep, mission)` 의 세 번째 인자로 미션 객체를 받는다. 단계 설명을 `ai-guide.js` 안에 따로 적으면 미션 내용이 두 곳에 생겨 F6이 반쪽이 된다 (SPEC 8)
- **미션은 송금 1개다.** 미션 목록·선택 화면을 만들지 않는다. `missions.json` 은 객체 하나이고 배열로 감싸지 않는다 (SPEC 4.3)
- **진행 표시(F17)는 위치만 말한다.** `2 / 5 단계 — 계좌번호 입력`. "무엇을 하세요"라고 지시하면 F10(Won't)이 된다 (SPEC 4.1 F17)
- **한 폴더에 한 사람.** `screen/`(A=영원) · `mission/`(B=서정) · `guide/`(C=미리) · `shared/`(통합자=미리). 자기 폴더 밖은 **읽기만** 한다 (`OWNERS.md`)
  - 담당·통합자는 확정됐다. 각자 `OWNERS.md` 의 「담당이 정해지면 할 일」 3단계(deny·확인·훅)를 실행한다
- **상대 경로 기준은 열려 있는 페이지(`screen/`)다.** 다른 폴더의 파일은 `../mission/...` `../guide/...` 로 부른다. `fetch('missions.json')` 은 404 다
- **`file://` 로 열지 않는다.** 항상 `http://localhost:8000` (SPEC 5.2)
- **API 키를 저장소에 커밋하지 않는다** (SPEC 5.2). LLM 경로는 `[확인 필요]` Q3이므로 C2는 LLM 미연결을 기본값으로 만든다
- **화면 이름은 7개, 그중 미션 단계는 6개:** `home`, `bank`, `account`, `amount`, `confirm`, `done` + 미션 단계가 아닌 `quiz` (SPEC 11.1)

---

## 검증 방식 — 테스트 러너가 없다

테스트 프레임워크가 없고, 1일 안에 도입하는 것도 이득이 아니다. 각 Task의 게이트를 둘로 잡는다.

1. **눈 확인 (모든 Task 필수)** — 브라우저에서 실제로 조작해 기대한 화면이 나오는지 본다. Task마다 `조작 → 기대 결과`를 적어 놨다.
2. **콘솔 확인 (로직 Task)** — 화면이 아직 없어도 검증할 수 있게 DevTools 콘솔에 붙여넣을 한 줄과 기대 출력을 적어 놨다.

`console.assert` 는 통과 시 아무것도 출력하지 않아 "실행이 됐는지"를 구분할 수 없다. 값을 직접 출력해 눈으로 대조한다.

### 저장할 때 자동으로 도는 문법 검사

`.claude/settings.json` 의 PostToolUse 훅이 파일을 쓸 때마다 `.claude/hooks/syntax-check.py` 를 돌린다. `.js` 는 `node --check`, `.json` 은 파싱, `.css` 는 중괄호 짝, `.html` 은 태그 스택을 본다. 실패하면 저장이 거부되고 이유가 돌아온다. 즉 **구문 오류는 이 계획의 눈 확인 단계까지 오지 않는다.**

### git 커밋

원격 저장소가 이미 있다 — `https://github.com/MiriKim79/bank_simulator.git`. **셋 다 `develop` 에서 바로 커밋·푸시한다.** feature 브랜치를 따지 않고, `main` 은 `develop` 을 머지해서만 올라간다. 각 Task 의 커밋 메시지는 그대로 쓰면 된다.

같은 브랜치를 쓰지만 세 사람이 **다른 폴더만** 고치므로 merge 충돌은 원리상 나지 않는다. 충돌이 났다면 누군가 남의 폴더를 고친 것이다.

같은 브랜치라서 생기는 규칙 두 개: **커밋 전에 `git pull`**, **푸시 전에 검증 3단계**. PR 리뷰가 없으니 깨진 것을 잡아 줄 사람이 없다. 자세한 규칙은 `ZIP-PROTOCOL.md` 의 「Git 협업 규칙」.

---

## 파일 구조와 소유권

**폴더 하나 = 사람 하나.** 앱은 레인별 폴더로 나눈다(`OWNERS.md`). 개인 소개 페이지는 `personal/` 로 빠져 있다.

| 파일 | 소유자 | 책임 | 노출 전역 |
|---|---|---|---|
| `screen/bank-ui.html` | **A** | 화면 7개 DOM, 화면 전환, 클릭 위임, 도움바 DOM, `<script src>` 선언 | `window.BankUI` |
| `screen/styles.css` | **A** | 표시/숨김, 큰 글씨·큰 버튼, 흔들림, 폰 셸, 키패드 | — |
| `mission/missions.json` | **B** | 단계 6개 · 정답 `action`/`value` · 오답 문구 | — |
| `mission/mission-engine.js` | **B** | 현재 단계 보관 + 정답 판정 | `window.MissionEngine` |
| `mission/quiz-data.json` | **B** | 용어 퀴즈 문항 (F16, Should) | — |
| `mission/quiz.js` | **B** | 퀴즈 진행·채점·설명 (F16, Should) | `window.Quiz` |
| `guide/qa-data.json` | **C** | 단계별 미리 쓴 답변 + 키워드 | — |
| `guide/ai-guide.js` | **C** | `askAI` 폴백 + 도움바 배선 | `window.AIGuide` |
| `guide/voice.js` | **C** | 마이크 STT (F12, Should) | `window.Voice` |
| `shared/CONTRACT.md` | 공동 | S0에서만 작성. 이후 변경은 셋이 합의 | — |
| `shared/llm-config.js` | 통합자 | `window.LLM_CONFIG`. **커밋 안 함**(`.gitignore`). 없으면 LLM 미연결 | `window.LLM_CONFIG` |
| `screen/CLAUDE.md` `mission/CLAUDE.md` `guide/CLAUDE.md` | 각 담당 | 그 폴더 파일을 읽을 때 자동으로 함께 읽히는 내 규칙 | — |

**폴더 밖은 읽기만 한다.** 담당 표와 규칙은 `OWNERS.md`, 소유권 위반 추적은 `.claude/hooks/owner-guard.py`(담당 정해지면 켠다).

### 경로 함정 — `fetch` 와 `<script src>` 의 기준이 다르다

진입 페이지가 `screen/bank-ui.html` 이므로 **상대 경로의 기준은 `screen/`** 이다. 스크립트 파일이 어디 있든 상관없다.

```js
fetch('missions.json')                 // ✗ screen/missions.json 을 찾다가 404
fetch('../mission/missions.json')      // ✓
```

`<script src>` 도 같은 기준이라 `../mission/...` 로 쓴다. `styles.css` 만 같은 폴더라 그대로다.

### 병렬이 성립하는 이유 세 가지

**1. A가 `<script src>` 를 처음에 다 선언한다(5개 + LLM 설정 자리).** 파일이 없으면 콘솔에 404가 찍히지만 페이지는 정상 동작한다. B와 C가 자기 파일을 등록하려고 `bank-ui.html` 을 열 이유가 없어진다.

로드 순서는 고정이다. 뒤 파일이 앞 파일의 전역을 쓴다.

```
1. bank-ui.html 인라인 <script>  — BankUI + 클릭 위임
2. mission-engine.js             — MissionEngine
3. voice.js                      — Voice
4. ai-guide.js                   — AIGuide + 도움바 배선 (BankUI·MissionEngine·Voice 사용)
5. quiz.js                       — Quiz (BankUI 사용)
```

**2. S0에서 스텁 3개를 만든다.** 계약에 적힌 함수만 있고 내용은 가짜다. A는 B의 상태머신을 기다리지 않고 첫 순간부터 화면 7개를 클릭으로 왕복할 수 있다. B와 C는 자기 스텁 파일의 **내용을 통째로 교체**하는 것으로 작업을 시작한다.

**3. C가 자기 파일 안에서 도움바를 스스로 배선한다.** A는 DOM만 놓고, C는 `ai-guide.js` 에서 그 id를 찾아 이벤트를 붙인다. `ai-guide.js` 는 `</body>` 앞에서 로드되므로 DOM이 이미 있다. C는 A의 파일을 열지 않는다.

---

## 레인 구조

```
S0  계약 + missions.json + 스텁 3개 + 서버 + git        (셋이 같이, 30분)
     │
     ├── A 레인 ── A1 화면7개 → A2 F3 홈 → A3 F4+F15 → A4 배선·도움바 → A5 F8 흔들림
     ├── B 레인 ── B1 missions.json → B2 F7 상태머신 → B3 로딩 방어
     └── C 레인 ── C1 qa-data.json → C2 F13 askAI → C3 F14 배선
     │
S1  합류 — 스텁 전부 교체 확인 + 마우스로 완주
     │
S2  Must 합격 판정 — SPEC 6.1 기준 1~6            ← 여기까지가 MVP
     │
     ├── A 레인 ── A6 F1 폰셸 → A7 F5 키패드 → A8 F2 용어병기(Could)
     ├── B 레인 ── B4 퀴즈 데이터 → B5 F16 퀴즈 엔진
     └── C 레인 ── C4 F12 마이크 STT
     │
S3  시연 리허설
```

**S1 이전에는 서로를 부르지 않는다.** **S2를 통과하지 못하면 Should로 넘어가지 않는다.**

---

# S0 — 시작 전 합의 (셋이 같이, 30분 이내)

## Task S0: 계약 · missions.json · 스텁 · 서버 · git

SPEC 11.1이 "안 하면 통합이 불가능하다"고 못박은 단계다. 여기서 정한 이름을 나중에 바꾸면 세 사람 코드가 동시에 깨진다.

**Files:**
- Create: `screen/` `mission/` `guide/` `shared/` 디렉토리 (이미 있으면 그대로 쓴다)
- Create: `shared/CONTRACT.md`
- Create: `mission/missions.json`
- Create: `mission/mission-engine.js` (스텁)
- Create: `guide/ai-guide.js` (스텁)
- Create: `guide/voice.js` (스텁)

**Interfaces:**
- Produces: 화면 이름 7개, `data-action` 값 8개, DOM id, 네 전역의 함수 시그니처, `missions.json` 스키마. A1~C4 전부가 이걸 소비한다.

- [ ] **Step 1: 디렉토리와 git**

```bash
cd /Users/ywkim/Desktop/vibecoding
mkdir -p screen mission guide shared
```

**`git init` 은 하지 않는다.** 원격 저장소가 이미 있다(2026-08-19 확정).

```bash
git clone https://github.com/MiriKim79/bank_simulator.git   # 처음 받는 사람
cd bank_simulator
git checkout develop      # 작업은 여기서 바로 한다. feature 브랜치 없음
```

이미 로컬에 파일이 있는 사람은 `git init` → `git remote add origin <URL>` → `git fetch origin` → `git checkout -b develop --track origin/develop` 순서로 붙인다.

**셋이 같은 `develop` 을 쓴다.** 그래서 커밋 전에 항상 `git pull` 먼저 하고, 푸시 전에 `OWNERS.md` 의 검증 3단계를 본다. 깨진 `develop` 은 세 사람을 동시에 막는다.

`.gitignore` 는 **원격에 이미 있다**(`.claude/settings.local.json`·`.env`·`.DS_Store`·IDE 설정). 우리 계획에 필요한 두 줄이 빠져 있으니 **통합자가 PR 로 추가한다** — 남의 파일을 혼자 고치지 않는다.

```
shared/llm-config.js
_workspace/
```

`llm-config.js` 를 gitignore 에 넣는 이유: 나중에 LLM을 붙일 때 API 키가 들어갈 유일한 파일이고, 그게 저장소에 올라가면 안 된다.

- [ ] **Step 2: `mission/missions.json` 을 셋이 같이 작성**

**이 파일이 세 레인의 공통 참조점이다.** A는 여기 `action` 값에 맞춰 `data-action` 을 붙이고, B는 이걸 읽어 판정하고, C는 여기 단계 이름에 맞춰 답변을 쓴다. **여기서 한 번 같이 쓰고, 이후에는 B만 고친다.**

```json
{
  "id": "transfer-kimminsu-50000",
  "title": "김민수에게 50,000원 보내기",
  "steps": [
    { "step": "home",    "action": "transfer",       "next": "bank",    "label": "",           "wrong": "" },
    { "step": "bank",    "action": "pick-bank",      "value": "한걸음은행", "next": "account", "label": "은행 선택",     "wrong": "" },
    { "step": "account", "action": "submit-account", "value": "11022233344", "next": "amount", "label": "계좌번호 입력", "wrong": "" },
    { "step": "amount",  "action": "submit-amount",  "value": "50000",  "next": "confirm", "label": "금액 입력",     "wrong": "" },
    { "step": "confirm", "action": "confirm",        "next": "done",    "label": "확인",         "wrong": "" },
    { "step": "done",    "action": "restart",        "next": "home",    "label": "완료",         "wrong": "" }
  ]
}
```

`wrong` 은 비워 둔다. B1에서 B가 채운다. 지금 정할 것은 **단계 이름 6개와 `action`·`value`·`label` 값**이다.

`label` 은 F17 진행 표시 문구다. **`home` 은 빈 문자열이다** — 미션 시작 전이라 표시하지 않는다. 나머지 5개가 분모 5가 된다: `bank`=1 · `account`=2 · `amount`=3 · `confirm`=4 · `done`=5. A의 `showStep` 이 이 값을 읽어 `2 / 5 단계 — 계좌번호 입력` 을 만든다. 배열 순서가 곧 번호이므로 **순서를 바꾸면 번호도 바뀐다.**

미션은 이 객체 하나뿐이다. 배열로 감싸지 않는다(SPEC 4.3).

- [ ] **Step 3: `shared/CONTRACT.md` 를 그대로 작성**

요약하지 말고 아래를 통째로 넣는다. 세 사람이 각자 이 파일만 보고 자기 파일을 짠다.

```markdown
# 인터페이스 계약 (2026-08-19 합의)

이 파일을 고치려면 세 사람이 같이 고친다. 혼자 바꾸면 다른 두 명 코드가 깨진다.

## 1. 화면 이름 7개 (그중 미션 단계는 6개)

미션 단계:  home → bank → account → amount → confirm → done
미션 아님:  quiz   (F16, Should. 완료 화면에서 들어가고 완료 화면으로 돌아온다)

문자열 그대로 쓴다. 대문자·한글·별칭 금지.

## 2. 소유권 — 한 폴더에 한 사람

A: screen/     bank-ui.html, styles.css
B: mission/    missions.json, mission-engine.js, quiz-data.json, quiz.js
C: guide/      qa-data.json, ai-guide.js, voice.js
통합자: shared/  CONTRACT.md, llm-config.js(커밋 안 함)

자기 폴더 밖은 읽기만 한다. 고칠 게 있으면 소유자에게 말한다.
담당자 이름·통합자는 루트 OWNERS.md. 내 폴더 규칙은 내폴더/CLAUDE.md.

## 2-1. 경로 규칙 (틀리면 404)

진입 페이지가 screen/bank-ui.html 이므로 상대 경로 기준은 screen/ 이다.
스크립트 파일이 어느 폴더에 있든 상관없다.

  fetch('missions.json')              ✗ 404
  fetch('../mission/missions.json')   ✓
  fetch('../guide/qa-data.json')      ✓
  fetch('../mission/quiz-data.json')  ✓

styles.css 만 같은 폴더라 그대로 쓴다.

## 3. DOM 규칙 (A가 지킨다)

- 화면 하나 = `<section class="screen" id="screen-{화면이름}">`
  `#screen-home` `#screen-bank` `#screen-account` `#screen-amount` `#screen-confirm` `#screen-done` `#screen-quiz`
- 현재 화면만 `is-active` 클래스를 가진다. 나머지는 CSS로 숨는다.
- 미션 입력은 전부 `data-action` 을 가진다. 값이 필요하면 `data-value` 도 가진다.
  `data-action` 값은 missions.json 의 action 과 **정확히 같아야 한다.**
  - `transfer`  — 홈의 이체 버튼
  - `history`   — 홈의 거래내역 버튼 (미션 정답 아님)
  - `balance`   — 홈의 잔액조회 버튼 (미션 정답 아님)
  - `pick-bank` + `data-value="한걸음은행"` — 은행 선택
  - `submit-account` — 계좌번호 확인
  - `submit-amount`  — 금액 확인
  - `confirm`   — 최종 보내기
  - `restart`   — 완료 화면의 다시 연습하기
- 입력칸 id: `#input-account`, `#input-amount`
- 도움바 id: `#help-ask`, `#help-repeat`, `#mic-button`
- 질문 입력: `#question-box`(감싸는 div), `#question-text`(input), `#question-send`(button)
- AI 답변이 들어갈 곳: `#ai-answer`
- 진행 표시(F17): `#progress` — `showStep` 이 missions.json 의 `label` 로 갱신한다
- 퀴즈 진입 버튼: `#quiz-start` (완료 화면 안. data-action 을 쓰지 않는다 —
  미션 입력이 아니므로 상태머신에 가면 안 된다)
- 퀴즈 화면 안쪽은 비워 둔다. B의 quiz.js 가 그려 넣는다.

**data-action 이 없는 것은 상태머신에 가지 않는다.** 도움바·질문칸·키패드·퀴즈가 그렇다.

## 4. window.BankUI (A가 만든다)

- `BankUI.showStep(name)` -> undefined
  name 은 1절의 7개 문자열 중 하나. 해당 화면만 보이게 한다. 모르는 값이면 console.warn.
- `BankUI.showAnswer(text)` -> undefined
  `#ai-answer` 에 text 를 표시한다. 빈 문자열이면 비운다.
- `BankUI.showError(message, selector)` -> undefined
  message 를 `#ai-answer` 에 표시하고, selector 요소를 한 번 흔든다. selector 생략 가능.

## 5. window.MissionEngine (B가 만든다)

- `MissionEngine.getStep()` -> 현재 단계 문자열 (미션 단계 6개 중 하나)
- `MissionEngine.submit({action, value})` -> `{ok, step, message}`
  - `ok`: 현재 단계의 정답이면 true
  - `step`: 이 입력 처리 후 화면에 보여야 할 단계. 오답이면 현재 단계 그대로
  - `message`: 오답이면 missions.json 의 wrong 문구. 정답이면 빈 문자열
  - `value` 는 없으면 undefined 로 넘겨도 된다
- `MissionEngine.getMission()` -> missions.json 에서 읽은 미션 객체 그대로
  - 로딩 전에는 최소 기본값 객체를 준다. 절대 예외를 던지지 않는다.
  - A 는 `label` 을 읽어 진행 표시(F17)를 만들고, C 는 이걸 `askAI` 3번째 인자로 넘긴다.
- `MissionEngine.reset()` -> undefined. 단계를 home 으로 되돌린다.

## 6. window.AIGuide (C가 만든다)

- `AIGuide.askAI(question, currentStep, mission)` -> Promise<string>
  - `question`: 사용자가 적은 질문 문자열
  - `currentStep`: 단계 이름 6개 중 하나
  - `mission`: `MissionEngine.getMission()` 의 반환값. **인자 2개로 줄이지 않는다** — 줄이면 단계 설명이 ai-guide.js 에 하드코딩되고 F6이 깨진다
  - 절대 reject 하지 않는다. `mission` 이 `null` 이어도 답변 문자열을 반환한다.
- 도움바(`#help-ask` `#help-repeat` `#mic-button` `#question-send`) 배선은 이 파일이 스스로 한다.

## 7. window.Voice (C가 만든다, F12 Should)

- `Voice.isSupported()` -> boolean
- `Voice.startListening(onResult, onError)` -> undefined
  - `onResult(text)`: 인식된 한국어 문자열 1개
  - `onError(reason)`: reason 은 'unsupported' | 'no-speech' | 'denied' | 'error'
- 지원되는 브라우저에서만 `#mic-button` 의 hidden 을 벗긴다.

## 8. window.Quiz (B가 만든다, F16 Should)

- `Quiz.start()` -> undefined. `#screen-quiz` 를 그리고 `BankUI.showStep('quiz')` 를 호출한다.
- `#quiz-start` 클릭 배선은 quiz.js 가 스스로 한다.
- 끝나면 `BankUI.showStep('done')` 으로 돌아온다.

## 9. 로드 순서 (A가 bank-ui.html 에 고정으로 선언)

../shared/llm-config.js (없어도 됨) → 인라인 script(BankUI)
  → ../mission/mission-engine.js → ../guide/voice.js
  → ../guide/ai-guide.js → ../mission/quiz.js
```

- [ ] **Step 4: 스텁 3개 작성**

세 파일 모두 **B와 C가 나중에 내용을 통째로 교체한다.** 지금은 A가 화면을 확인할 무대를 만드는 것이 목적이다.

`mission/mission-engine.js`:

```js
// [스텁] B가 이 파일을 통째로 교체한다. 무엇을 눌러도 다음 단계로 넘어간다.
window.MissionEngine = (function () {
  var ORDER = ['home', 'bank', 'account', 'amount', 'confirm', 'done'];
  // label 은 A 가 F17 진행 표시를 확인할 수 있게 스텁에도 넣어 둔다.
  var LABELS = { home: '', bank: '은행 선택', account: '계좌번호 입력',
                 amount: '금액 입력', confirm: '확인', done: '완료' };
  var current = 'home';
  return {
    getStep: function () { return current; },
    getMission: function () {
      return {
        id: 'stub', title: '(스텁 미션)',
        steps: ORDER.map(function (s) { return { step: s, label: LABELS[s] }; })
      };
    },
    submit: function () {
      current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      return { ok: true, step: current, message: '' };
    },
    reset: function () { current = 'home'; }
  };
})();
console.warn('[스텁] mission-engine.js — 정답 판정이 없다');
```

`guide/ai-guide.js`:

```js
// [스텁] C가 이 파일을 통째로 교체한다.
window.AIGuide = {
  askAI: function (question, step, mission) {
    var title = mission && mission.title ? mission.title : '(미션 없음)';
    return Promise.resolve('(스텁 답변) ' + title + ' / ' + step + ' 단계 / 질문: ' + question);
  }
};

// 도움바 최소 배선 — C가 C3 에서 제대로 다시 쓴다.
(function () {
  var box = document.getElementById('question-box');
  var input = document.getElementById('question-text');

  function ask(q) {
    window.AIGuide.askAI(q, window.MissionEngine.getStep(), window.MissionEngine.getMission())
      .then(function (a) { window.BankUI.showAnswer(a); });
  }

  var repeat = document.getElementById('help-repeat');
  if (repeat) repeat.addEventListener('click', function () { ask('지금 무엇을 해야 하나요'); });

  var open = document.getElementById('help-ask');
  if (open) open.addEventListener('click', function () { if (box) box.hidden = false; });

  var send = document.getElementById('question-send');
  if (send) send.addEventListener('click', function () {
    if (!input || !input.value) return;
    var q = input.value;
    input.value = '';
    if (box) box.hidden = true;
    ask(q);
  });
})();
console.warn('[스텁] ai-guide.js — 실제 답변 데이터가 없다');
```

`guide/voice.js`:

```js
// [스텁] C가 F12(Should)에서 이 파일을 통째로 교체한다.
window.Voice = {
  isSupported: function () { return false; },
  startListening: function (onResult, onError) { if (onError) onError('unsupported'); }
};
console.warn('[스텁] voice.js — 항상 미지원으로 답한다');
```

- [ ] **Step 5: 로컬 서버**

```bash
cd /Users/ywkim/Desktop/vibecoding
python3 -m http.server 8000
```

- [ ] **Step 6: 눈 확인 — 서버가 뜨는가**

Chrome 에서 `http://localhost:8000/` 열기.
기대: 디렉토리 목록에 `screen/` `mission/` `guide/` `shared/` 가 보인다. `mission/` 에 `missions.json` 과 스텁이, `shared/` 에 `CONTRACT.md` 가 있다.
A1이 끝나면 `http://localhost:8000/screen/bank-ui.html` 가 이 프로젝트의 진입 주소가 된다.

`file://` 로 확인하면 안 된다. 나중에 마이크가 막히고 `fetch` 도 막힌다.

- [ ] **Step 7: 커밋**

```bash
git pull
git add screen/ mission/ guide/ shared/
git commit -m "chore(s0): 인터페이스 계약, missions.json, 스텁 3개"
git push
```

**S0은 셋이 같이 만드는 계약이라 예외적으로 `develop` 에 바로 올린다.** S0 이후 A·B·C 각자의 Task는 자기 `feature/*` 브랜치(`feature/screen-ui`·`feature/mission-engine`·`feature/ai-guide`)에서 커밋하고 `develop` 대상 PR로 합친다. `main` 은 통합자가 `develop` 을 머지해서만 올린다. 자세한 규칙은 `ZIP-PROTOCOL.md` 의 「Git 협업 규칙」.

> **게이트**: 세 사람이 `CONTRACT.md` 를 읽고 자기가 만들 함수 이름을 말로 다시 말할 수 있다. `missions.json` 의 `action` 값에 셋이 동의했다. `localhost:8000` 이 뜬다.
> **여기서 세 사람이 갈라진다. S1까지 서로 부르지 않는다.**

---

# A 레인 — 화면 (`bank-ui.html`, `styles.css`)

## Task A1: 화면 7개 껍데기 + BankUI + F17 진행 표시 + script 선언

**Files:**
- Create: `screen/bank-ui.html`
- Create: `screen/styles.css`

**Interfaces:**
- Consumes: `CONTRACT.md` 3·4·9절
- Produces: `window.BankUI.showStep`, `showAnswer`, `showError`, `#progress` (F17)

- [ ] **Step 1: `screen/bank-ui.html` 작성**

`<script src>` 를 **지금 다 선언한다.** `../mission/quiz.js` 와 `../shared/llm-config.js` 는 아직 없어서 404가 찍히지만 페이지는 정상 동작한다. 이렇게 해두면 B와 C가 이 파일을 열 이유가 없다.

경로는 **`../폴더명/파일` 이다.** 이 페이지가 `screen/` 안에 있기 때문이다(위 「경로 함정」).

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>금융한걸음 — 송금 연습</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<main id="phone">

  <p id="progress" hidden></p>

  <section class="screen is-active" id="screen-home"><h1>홈</h1></section>
  <section class="screen" id="screen-bank"><h1>은행 선택</h1></section>
  <section class="screen" id="screen-account"><h1>계좌번호</h1></section>
  <section class="screen" id="screen-amount"><h1>금액</h1></section>
  <section class="screen" id="screen-confirm"><h1>확인</h1></section>
  <section class="screen" id="screen-done"><h1>완료</h1></section>
  <section class="screen" id="screen-quiz"></section>

  <p id="ai-answer"></p>
</main>

<script>
window.BankUI = (function () {
  var SCREENS = ['home', 'bank', 'account', 'amount', 'confirm', 'done', 'quiz'];

  // F17 진행 표시. 문구는 missions.json 의 label 에서 온다 — 여기에 단계 이름을 적지 않는다.
  function updateProgress(name) {
    var el = document.getElementById('progress');
    if (!el) return;
    var m = (window.MissionEngine && window.MissionEngine.getMission)
      ? window.MissionEngine.getMission() : null;
    var steps = (m && Array.isArray(m.steps)) ? m.steps : [];
    var labeled = steps.filter(function (s) { return s.label; });
    var idx = -1;
    labeled.forEach(function (s, i) { if (s.step === name) idx = i; });
    if (idx === -1) {              // home(label 없음)·quiz(미션 아님)
      el.textContent = '';
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = (idx + 1) + ' / ' + labeled.length + ' 단계 — ' + labeled[idx].label;
  }

  function showStep(name) {
    if (SCREENS.indexOf(name) === -1) {
      console.warn('[BankUI] 모르는 화면:', name);
      return;
    }
    SCREENS.forEach(function (s) {
      var el = document.getElementById('screen-' + s);
      if (el) el.classList.toggle('is-active', s === name);
    });
    updateProgress(name);
  }

  function showAnswer(text) {
    var box = document.getElementById('ai-answer');
    if (box) box.textContent = text || '';
  }

  function showError(message, selector) {
    showAnswer(message);
    // 흔들림은 A5(F8)에서 채운다.
  }

  return { showStep: showStep, showAnswer: showAnswer, showError: showError };
})();
</script>

<script src="../shared/llm-config.js"></script>
<script src="../mission/mission-engine.js"></script>
<script src="../guide/voice.js"></script>
<script src="../guide/ai-guide.js"></script>
<script src="../mission/quiz.js"></script>
</body>
</html>
```

- [ ] **Step 2: `screen/styles.css` 작성**

```css
:root {
  --bg: #ffffff;
  --fg: #14181f;
  --line: #d4d8e0;
  --accent: #1a5fd0;
  --accent-fg: #ffffff;
  --warn-bg: #fff4e5;
  --page: #eef1f5;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #171b22;
    --fg: #eceff4;
    --line: #333a46;
    --accent: #4c8df6;
    --accent-fg: #0d1016;
    --warn-bg: #3a2f1c;
    --page: #0d1016;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 24px;
  background: var(--page);
  color: var(--fg);
  font-family: system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
  font-size: 20px;
  line-height: 1.6;
}

#phone {
  max-width: 420px;
  margin: 0 auto;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
}

.screen { display: none; }
.screen.is-active { display: block; }

h1 { font-size: 28px; margin: 0 0 16px; }

button {
  display: block;
  width: 100%;
  min-height: 64px;
  margin: 0 0 12px;
  font-size: 22px;
  font-family: inherit;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--fg);
  cursor: pointer;
}

button.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-fg);
}

input {
  width: 100%;
  min-height: 64px;
  padding: 0 16px;
  font-size: 24px;
  font-family: inherit;
  background: var(--bg);
  color: var(--fg);
  border: 2px solid var(--line);
  border-radius: 12px;
}

#ai-answer {
  margin: 20px 0 0;
  padding: 16px;
  background: var(--warn-bg);
  border-radius: 12px;
  font-size: 20px;
}
#ai-answer:empty { display: none; }

/* F17 진행 표시 — 위치만 알려주는 작은 1줄. 크게 만들면 F10(Won't) 이 된다. */
#progress {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--accent);
  font-weight: 600;
}
```

색상을 `:root` 커스텀 프로퍼티로 정의하고 다크모드 오버라이드를 같이 넣는 것은 프로젝트 CLAUDE.md 규약이다. 나중에 색을 추가할 때도 두 곳을 같이 고친다.

- [ ] **Step 3: 눈 확인 — 홈만 보이는가**

`http://localhost:8000/screen/bank-ui.html` 열기.
기대: "홈"만 보인다. 나머지 6개 화면과 노란 답변 박스는 안 보인다. 콘솔에 `quiz.js` 404 와 스텁 경고 3개가 찍히는 것은 정상이다.

- [ ] **Step 4: 콘솔 확인 — 7개 화면 전환**

```js
['home','bank','account','amount','confirm','done','quiz'].forEach(s => { BankUI.showStep(s); console.log(s, document.querySelector('#screen-'+s).classList.contains('is-active')) })
```
기대: 7줄 모두 `true`. 마지막에 `quiz` 화면(빈 화면)이 보이는 상태로 남는다.

```js
BankUI.showStep('없는화면')
```
기대: 화면 그대로, 콘솔에 `[BankUI] 모르는 화면: 없는화면`.

```js
BankUI.showAnswer('테스트'); // 노란 박스 나타남
BankUI.showAnswer('');       // 사라짐
```

> **F17 배치 근거**(SPEC 13.3 R7): SOL 실제 화면도 **제목 줄 오른쪽에 `1 / 3` 배지**를 둔다. 우리도 화면 제목 근처의 작은 한 줄로 둔다 — 크게 만들면 F10(Won't)이 된다. 다른 것은 분모뿐이다(SOL 3 = 입력 단계만, 우리 5 = 완료까지).

- [ ] **Step 4-b: 콘솔 확인 — F17 진행 표시**

```js
['home','bank','account','amount','confirm','done','quiz'].forEach(s => { BankUI.showStep(s); console.log(s, '|', document.getElementById('progress').textContent) })
```
기대:
```
home |
bank | 1 / 5 단계 — 은행 선택
account | 2 / 5 단계 — 계좌번호 입력
amount | 3 / 5 단계 — 금액 입력
confirm | 4 / 5 단계 — 확인
done | 5 / 5 단계 — 완료
quiz |
```
`home` 과 `quiz` 는 빈 문자열이고 표시가 숨는다. 문구는 스텁 `getMission()` 에서 오고, B2 이후에는 `missions.json` 에서 온다 — **어느 쪽이든 이 파일에 단계 이름을 적어서는 안 된다.**

- [ ] **Step 5: 커밋**

```bash
git add screen/bank-ui.html screen/styles.css
git commit -m "feat(a1): 화면 7개 껍데기, BankUI, F17 진행 표시, script 선언 5개"
```

> **게이트**: 콘솔에서 7개 화면을 마음대로 왕복할 수 있다. B·C가 이 페이지 위에서 자기 코드를 확인할 무대가 생겼다.

---

## Task A2: F3 가상 홈 화면

**Files:** Modify `screen/bank-ui.html` (`#screen-home`), `screen/styles.css`

- [ ] **Step 1: `#screen-home` 교체**

`출금계좌` 라는 말을 화면에 넣는다. F16 퀴즈가 이 용어를 묻는데, SPEC 6.2 기준 10이 **"송금 6단계에서 실제로 화면에 등장한 용어만"** 묻도록 요구한다. 화면에 없으면 퀴즈에서 뺄 수밖에 없다.

> ✅ **확정 두 건이 이 화면에 반영됐다** (SPEC 12절, 2026-08-19)
> - **SPEC 12.3 은행명**: 가상 은행 `한걸음은행`으로 확정. 아래 값과 `missions.json`·`qa-data.json` 이 이미 이 값으로 맞춰져 있다
> - **SPEC 12.5 목표 금액 표시**: (나)안 확정. 이 화면에 미션 제목(`missions.json` 의 `title`) 한 줄을 띄운다. 각 단계 화면에는 반복하지 않는다

```html
  <section class="screen is-active" id="screen-home">
    <h1>내 계좌</h1>
    <p class="mission-title">오늘의 미션 — 김민수에게 50,000원 보내기</p>
    <p class="label-sm">출금계좌</p>
    <p class="account-no">한걸음은행 123456-78-901234</p>
    <p class="balance">잔액 <strong>1,250,000</strong> 원</p>
    <button data-action="transfer" class="primary">이체</button>
    <button data-action="history">거래내역</button>
    <button data-action="balance">잔액조회</button>
  </section>
```

- [ ] **Step 2: `styles.css` 맨 아래에 추가**

```css
.mission-title { margin: 0 0 12px; font-size: 16px; font-weight: bold; }
.label-sm { margin: 0; font-size: 16px; color: var(--accent); font-weight: bold; }
.account-no { margin: 0; color: var(--fg); opacity: 0.7; font-size: 18px; }
.balance { margin: 4px 0 24px; font-size: 24px; }
.balance strong { font-size: 36px; }
```

- [ ] **Step 3: 눈 확인**

새로고침.
기대: `오늘의 미션 — 김민수에게 50,000원 보내기` → `출금계좌` → `한걸음은행 123456-78-901234` → `잔액 1,250,000 원` 순으로 보이고, 이체(파란색)·거래내역·잔액조회 버튼 3개가 큼직하게 있다. 스텁 엔진이라 아무 버튼이나 눌러도 다음 화면으로 간다 — 정상이다.

- [ ] **Step 4: 커밋**

```bash
git add screen/bank-ui.html screen/styles.css
git commit -m "feat(a2): F3 가상 홈 화면"
```

---

## Task A3: F4+F15 송금 화면 4개 + 완료 화면 + 기본 입력칸

F4와 F15는 10절에서 한 항목으로 묶였다. 한 Task로 만든다.

**Files:** Modify `screen/bank-ui.html`, `screen/styles.css`

- [ ] **Step 1: 다섯 화면 교체 (은행·계좌·금액·확인·완료)**

계좌번호 `11022233344` 와 금액 `50000` 은 **`missions.json` 의 `value` 와 반드시 같아야 한다.** S0에서 확정한 값이다.

> ✅ **SPEC 12.3 확정.** 아래 은행 버튼 세 개는 가상 은행명 `한걸음은행`(정답)·`새봄은행`·`푸른은행`이다. `data-value` 와 `missions.json` 의 `value` 가 이미 이 값으로 맞춰져 있다.

SOL 실제 화면과 대조한 결과(SPEC 13.2·13.3):

- SOL은 은행 선택을 **바텀시트**로 덮어서 받는다. 겉보기엔 한 화면이지만 층이 나뉘어 있어, 우리가 `bank`/`account` 두 화면으로 쪼갠 것과 크게 다르지 않다 (S4)
- **비밀번호 단계는 SOL 쉬운이체에도 없다.** 확인 모달의 `이체하기` 툴팁이 "이체가 바로 완료됩니다" 다. 지금 우리 흐름이 레퍼런스와 같다 (SPEC 13.5 정정 2)
- 확인 화면 항목 순서는 SOL과 같다: **받는 사람 → 계좌번호 → 금액(가장 큰 글씨) → "이체할까요?"**. 아래 `hint` 블록이 그 순서다 (R8)
- SOL 확인 모달에는 `취소`·`이체하기` 두 버튼이 있지만 우리는 `보내기` 하나다. 취소 = 이전 단계로 되돌리기이고 `MissionEngine.submit` 계약에 뒤로 가기가 없다 (S5)

```html
  <section class="screen" id="screen-bank">
    <h1>어느 은행으로 보내나요?</h1>
    <p class="hint">받는 사람: 김민수</p>
    <button data-action="pick-bank" data-value="한걸음은행">한걸음은행</button>
    <button data-action="pick-bank" data-value="새봄은행">새봄은행</button>
    <button data-action="pick-bank" data-value="푸른은행">푸른은행</button>
  </section>

  <section class="screen" id="screen-account">
    <h1>계좌번호를 넣으세요</h1>
    <p class="hint">수취인: 김민수 (한걸음은행)</p>
    <input id="input-account" type="text" inputmode="numeric" placeholder="숫자만 입력">
    <button data-action="submit-account" class="primary">다음</button>
  </section>

  <section class="screen" id="screen-amount">
    <h1>얼마를 보내나요?</h1>
    <p class="hint">수취인: 김민수</p>
    <input id="input-amount" type="text" inputmode="numeric" placeholder="숫자만 입력">
    <button data-action="submit-amount" class="primary">다음</button>
  </section>

  <section class="screen" id="screen-confirm">
    <h1>이대로 보낼까요?</h1>
    <p class="hint">출금계좌: 한걸음은행 123456-78-901234<br>
      수취인: 김민수<br>
      계좌번호: 한걸음은행 11022233344<br>
      <strong>50,000 원</strong></p>
    <button data-action="confirm" class="primary">보내기</button>
  </section>

  <section class="screen" id="screen-done">
    <h1>보냈습니다</h1>
    <p class="hint">김민수님에게 <strong>50,000 원</strong>을 보냈습니다.</p>
    <p class="hint">연습이라 실제 돈은 움직이지 않았습니다.</p>
    <button data-action="restart" class="primary">다시 연습하기</button>
    <button id="quiz-start" hidden>용어 복습하기</button>
  </section>
```

두 가지를 놓치지 않는다.

- **"연습이라 실제 돈은 움직이지 않았습니다"를 빼지 않는다.** SPEC 3절의 문제 정의가 "잘못 누르면 실제 돈이 움직인다"는 두려움이고, 완료 화면이 그 두려움을 풀어 주는 자리다.
- **`#quiz-start` 는 `hidden` 이고 `data-action` 이 없다.** F16이 Should라 Must 단계에서는 안 보여야 한다. B의 `quiz.js` 가 로드되면 스스로 `hidden` 을 벗긴다. `data-action` 이 없으므로 상태머신에 가지 않는다.

`수취인`·`출금계좌`·`잔액`·`계좌번호`·`이체` — 퀴즈가 묻는 다섯 용어가 이제 전부 화면에 나온다.

- [ ] **Step 2: `styles.css` 맨 아래에 추가**

```css
.hint { margin: 0 0 20px; font-size: 20px; opacity: 0.85; }
.hint strong { font-size: 28px; opacity: 1; }
```

- [ ] **Step 3: 콘솔 확인 — 여섯 화면이 다 그려졌는가**

```js
['bank','account','amount','confirm','done'].forEach(s => { BankUI.showStep(s); console.log(s, document.querySelector('#screen-'+s+' h1').textContent) })
```
기대:
```
bank 어느 은행으로 보내나요?
account 계좌번호를 넣으세요
amount 얼마를 보내나요?
confirm 이대로 보낼까요?
done 보냈습니다
```

- [ ] **Step 4: 눈 확인 — 입력칸과 숨은 퀴즈 버튼**

```js
BankUI.showStep('account')
```
계좌번호 칸에 `11022233344` 를 타이핑한다. 기대: 큰 글씨로 들어간다.

```js
BankUI.showStep('done')
```
기대: "용어 복습하기" 버튼이 **보이지 않는다.** `quiz.js` 가 아직 없으므로 정상이다.

- [ ] **Step 5: 커밋**

```bash
git add screen/bank-ui.html screen/styles.css
git commit -m "feat(a3): F4+F15 송금 5개 화면과 완료 화면, 기본 입력칸"
```

> **게이트**: SPEC 7절 "F5가 Should라서 생기는 공백"이 기본 `<input>` 으로 메워졌다. 화면의 계좌·금액이 `missions.json` 값과 같다.

---

## Task A4: 클릭 위임 배선 + F14 도움바 DOM

> **F14 배치 근거**(SPEC 13.3 R9): SOL은 **앱바에 `챗봇`·`음성` 아이콘을 상시** 둔다. 홈에서는 아이콘 아래에 **글자 라벨까지** 붙는다. 우리 도움바도 어느 화면에서나 같은 자리에 있고, **아이콘만 두지 말고 글자를 함께 쓴다.** 마이크(F12)가 실제 앱에서도 챗봇과 나란히 있다는 것도 확인됐다.

A의 파일 안에서 두 가지를 한다. 상태머신에 입력을 넘기는 배선과, C가 배선할 도움바의 DOM이다.

**Files:** Modify `screen/bank-ui.html`, `screen/styles.css`

**Interfaces:**
- Consumes: `MissionEngine.submit`
- Produces: `#help-ask`, `#help-repeat`, `#mic-button`, `#question-box`, `#question-text`, `#question-send`

- [ ] **Step 1: `#ai-answer` 앞에 도움바 추가**

화면 `<section>` 들 **밖**이라 어느 화면에서나 계속 보인다. SPEC 6.1 기준 5의 달성 수단 중 하나다.

```html
  <div id="help-bar">
    <button id="mic-button" hidden>🎤 말로 물어보기</button>
    <button id="help-ask">물어보기</button>
    <button id="help-repeat">다시 설명해주세요</button>
  </div>

  <div id="question-box" hidden>
    <input id="question-text" type="text" placeholder="궁금한 것을 적어 주세요">
    <button id="question-send">보내기</button>
  </div>
```

`#mic-button` 이 `hidden` 인 이유: F12가 Should다. C의 `voice.js` 가 지원되는 브라우저에서만 `hidden` 을 벗긴다. Must 단계에서 눌러도 아무 일 없는 죽은 버튼을 보여주지 않는다.

- [ ] **Step 2: 인라인 `<script>` 맨 아래에 클릭 위임 추가**

`BankUI = (function(){...})();` 아래, `</script>` 위에 넣는다.

```js
// data-action 을 가진 것만 상태머신에 넘긴다.
// 도움바·질문칸·퀴즈 버튼은 data-action 이 없으므로 여기 안 걸린다.
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  if (!window.MissionEngine) return;   // 파일이 아직 없어도 페이지가 죽지 않게

  var action = el.getAttribute('data-action');
  var value = el.getAttribute('data-value');

  // 입력칸이 있는 단계는 버튼의 data-value 대신 입력칸 값을 쓴다.
  if (action === 'submit-account') {
    value = document.getElementById('input-account').value;
  } else if (action === 'submit-amount') {
    value = document.getElementById('input-amount').value;
  }

  var r = window.MissionEngine.submit({ action: action, value: value });

  if (r.ok) {
    window.BankUI.showAnswer('');
    if (action === 'restart') {
      document.getElementById('input-account').value = '';
      document.getElementById('input-amount').value = '';
    }
  } else {
    window.BankUI.showError(r.message, '#screen-' + r.step);
  }

  window.BankUI.showStep(r.step);
});
```

- [ ] **Step 3: `styles.css` 맨 아래에 추가**

```css
#help-bar {
  display: flex;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid var(--line);
}
#help-bar button { margin: 0; font-size: 17px; min-height: 56px; }
#help-bar button[hidden] { display: none; }

#question-box { display: flex; gap: 8px; margin-top: 12px; }
#question-box[hidden] { display: none; }
#question-box input { min-height: 56px; font-size: 20px; }
#question-box button { margin: 0; width: auto; padding: 0 20px; min-height: 56px; font-size: 18px; }
```

- [ ] **Step 4: 눈 확인 — 스텁으로 완주되는가**

새로고침 후 마우스로 이체 → 한걸음은행 → (계좌번호 입력) 다음 → (금액 입력) 다음 → 보내기 → 다시 연습하기.
기대: 완료 화면까지 갔다가 홈으로 돌아오고, 두 입력칸이 비어 있다.

스텁 엔진이라 아무 값이나 넣어도 통과한다. 정답 판정은 B가 만든다. **A가 확인할 것은 화면 전환과 입력칸 초기화다.**

- [ ] **Step 5: 눈 확인 — 도움바가 어느 화면에서나 보이는가**

이체 → 한걸음은행 → 계좌번호로 넘어가면서 매번 확인한다.
기대: `물어보기`·`다시 설명해주세요` 두 버튼이 화면이 바뀌어도 구분선 아래 같은 자리에 계속 있다. 마이크 버튼은 안 보인다. 한 화면에서라도 사라지면 실패다.

- [ ] **Step 6: 눈 확인 — 스텁 배선이 도는가**

"다시 설명해주세요" 를 누른다.
기대: 노란 박스에 `(스텁 답변) home 단계 / 질문: 지금 무엇을 해야 하나요` 가 뜬다.

"물어보기" → 입력칸이 열림 → 아무거나 적고 "보내기".
기대: 적은 문장이 담긴 스텁 답변이 뜨고, 입력칸이 비워지고 닫힌다.

C의 스텁이 도는 것을 A가 확인하는 것이다. 진짜 답변은 C가 만든다.

- [ ] **Step 7: 커밋**

```bash
git add screen/bank-ui.html screen/styles.css
git commit -m "feat(a4): 클릭 위임 배선과 F14 도움바 DOM"
```

> **게이트**: 마우스만으로 화면이 끝까지 돈다. 도움바가 7개 화면 전부에서 같은 자리에 있다.

---

## Task A5: F8 오답 피드백 — 화면 쪽

> **레퍼런스에 베낄 것이 없는 유일한 Task**(SPEC 13.4). SOL 체험은 빨간 점이 찍어 주는 대로만 누르게 되어 있어 **틀릴 수가 없고, 오답·예외 화면이 존재하지 않는다.** 즉 F8은 우리가 처음부터 설계하는 부분이고, 이 서비스가 SOL 체험과 갈라지는 지점이다 — "대신 눌러 주지 않고 스스로 하게 한다"(SPEC 1절).

F8은 2차 MoSCoW에서 Must로 올라왔다. A는 흔들림과 표시를, B는 문구를 담당한다.

**Files:** Modify `screen/styles.css`, `screen/bank-ui.html` (`showError` 본문)

- [ ] **Step 1: `styles.css` 맨 아래에 흔들림 추가**

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
.shake { animation: shake 0.4s ease; }

@media (prefers-reduced-motion: reduce) {
  .shake { animation: none; }
}
```

`prefers-reduced-motion` 블록을 빼지 않는다. 프로젝트 CLAUDE.md 규약이고, 고령자 대상 서비스에서 흔들림이 불편한 사용자가 있다.

- [ ] **Step 2: `showError` 본문 교체**

```js
  function showError(message, selector) {
    showAnswer(message);
    var target = selector ? document.querySelector(selector) : null;
    if (!target) return;
    target.classList.remove('shake');
    void target.offsetWidth;   // 리플로우 강제 → 연속 오답에도 매번 흔들린다
    target.classList.add('shake');
  }
```

`void target.offsetWidth` 를 빼면 두 번 연속 틀렸을 때 두 번째는 안 흔들린다. 같은 클래스를 다시 붙이는 것만으로는 애니메이션이 재시작되지 않는다.

- [ ] **Step 3: 콘솔 확인 — 흔들림 자체**

스텁 엔진은 오답을 만들지 않으므로 직접 호출해 확인한다.

```js
BankUI.showStep('home');
BankUI.showError('테스트 오답 메시지', '#screen-home');
```
기대: 홈 화면이 좌우로 한 번 흔들리고 노란 박스에 메시지가 뜬다.

- [ ] **Step 4: 콘솔 확인 — 연속 오답**

```js
BankUI.showError('한 번', '#screen-home');
setTimeout(() => BankUI.showError('두 번', '#screen-home'), 500);
setTimeout(() => BankUI.showError('세 번', '#screen-home'), 1000);
```
기대: 세 번 다 흔들린다. 두 번째부터 안 흔들리면 Step 2의 리플로우 줄이 빠진 것이다.

- [ ] **Step 5: 눈 확인 — 모션 줄이기 설정 존중**

DevTools 명령 메뉴(Cmd+Shift+P) → `Emulate CSS prefers-reduced-motion: reduce` → 위 콘솔 한 줄 재실행.
기대: 흔들리지 않지만 노란 박스 설명은 그대로 나온다. 설명이 같이 사라지면 실패다. 확인 후 에뮬레이션을 끈다.

- [ ] **Step 6: 커밋**

```bash
git add screen/bank-ui.html screen/styles.css
git commit -m "feat(a5): F8 오답 피드백 화면 쪽 - 흔들림과 표시"
```

> **게이트**: A의 Must 레인이 끝났다. **S1로 간다.** S1을 기다리는 동안 A6을 시작해도 된다.

---

# B 레인 — 로직 (`missions.json`, `mission-engine.js`)

A·C를 기다리지 않는다. 검증은 전부 콘솔에서 한다.

## Task B1: F6 미션 데이터 완성

S0에서 셋이 만든 `missions.json` 의 빈 `wrong` 을 채운다. F8의 "왜 틀렸는지"가 여기 들어간다.

**Files:** Modify `mission/missions.json`

- [ ] **Step 1: `wrong` 문구 작성**

각 문구에 **왜 틀렸는지와 무엇을 눌러야 하는지 둘 다** 넣는다. SPEC 6.1 기준 4가 "무엇을 눌러야 하는지를 안내받아"를 요구한다.

`label` 은 S0에서 셋이 정한 값을 **그대로 유지한다.** 지우면 A의 F17 진행 표시가 빈칸이 된다.

> ✅ **SPEC 12.3 확정.** `bank` 단계의 `value` 는 가상 은행명 `"한걸음은행"` 이다. A의 `data-value` 와 C의 답변 문구도 이 값으로 맞춰져 있다.

```json
{
  "id": "transfer-kimminsu-50000",
  "title": "김민수에게 5만원 보내기",
  "steps": [
    {
      "step": "home", "action": "transfer", "next": "bank", "label": "",
      "wrong": "그 버튼은 돈을 보내는 버튼이 아닙니다. 돈을 보내려면 맨 위 파란 \"이체\" 버튼을 누르세요."
    },
    {
      "step": "bank", "action": "pick-bank", "value": "한걸음은행", "next": "account", "label": "은행 선택",
      "wrong": "받는 사람 김민수님의 은행이 아닙니다. 김민수님 계좌는 한걸음은행이므로 \"한걸음은행\"을 누르세요."
    },
    {
      "step": "account", "action": "submit-account", "value": "11022233344", "next": "amount", "label": "계좌번호 입력",
      "wrong": "계좌번호가 다릅니다. 11022233344 를 숫자만 넣고 \"다음\"을 누르세요. 작대기(-)는 넣지 않아도 됩니다."
    },
    {
      "step": "amount", "action": "submit-amount", "value": "50000", "next": "confirm", "label": "금액 입력",
      "wrong": "금액이 다릅니다. 5만원은 숫자로 50000 입니다. 0을 네 개 붙여 50000 을 넣고 \"다음\"을 누르세요."
    },
    {
      "step": "confirm", "action": "confirm", "next": "done", "label": "확인",
      "wrong": "아직 보내지 않았습니다. 받는 사람과 금액이 맞으면 \"보내기\"를 누르세요."
    },
    {
      "step": "done", "action": "restart", "next": "home", "label": "완료",
      "wrong": "송금은 끝났습니다. \"다시 연습하기\"를 누르면 처음부터 또 해볼 수 있습니다."
    }
  ]
}
```

- [ ] **Step 2: 파싱 확인**

```bash
python3 -c "import json;d=json.load(open('mission/missions.json',encoding='utf-8'));print(len(d['steps']),'단계');[print(s['step'],'->',s['next'],'| label:',repr(s.get('label')),'|',s['wrong'][:20]+'...') for s in d['steps']]"
```
기대: `6 단계` 와 6줄. `wrong` 이 빈 줄이 하나도 없어야 하고, `label` 은 `home` 만 `''` 이고 나머지 5개에 문구가 있어야 한다(F17).

저장할 때 PostToolUse 훅이 JSON 파싱을 먼저 잡아 주지만, 6개가 다 찼는지는 이 명령으로 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add mission/missions.json
git commit -m "feat(b1): F6 미션 데이터 - 오답 문구 6개"
```

> **게이트**: `missions.json` 만 고쳐서 미션 문구를 바꿀 수 있는 상태. **이 파일은 이제 B만 고친다.**

---

## Task B2: F7 미션 상태머신

스텁을 진짜로 교체한다. **파일을 새로 만들지 않는다** — S0의 스텁 파일 내용을 통째로 바꾼다. `<script src>` 는 A가 이미 선언해 놨다.

**Files:** Modify `mission/mission-engine.js` (스텁 내용 전체 교체)

**Interfaces:**
- Consumes: `mission/missions.json`, `CONTRACT.md` 1·5절
- Produces: `MissionEngine.getStep()`, `submit({action, value})`, `getMission()`, `reset()`

- [ ] **Step 1: `mission/mission-engine.js` 전체 교체**

```js
window.MissionEngine = (function () {
  // missions.json 로딩이 끝나기 전에 클릭이 들어올 수 있으므로 최소 기본값을 들고 시작한다.
  var DOC = {
    id: 'loading', title: '(로딩 중)',
    steps: [{ step: 'home', action: 'transfer', next: 'bank', label: '', wrong: '"이체" 버튼을 누르세요.' }]
  };
  var MISSION = DOC.steps;
  var loaded = false;
  var current = 'home';

  fetch('../mission/missions.json')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      if (json && Array.isArray(json.steps) && json.steps.length === 6) {
        DOC = json;
        MISSION = json.steps;
        loaded = true;
      } else {
        console.warn('[MissionEngine] missions.json 형식이 이상하다. 기본값 유지');
      }
    })
    .catch(function (e) {
      console.warn('[MissionEngine] missions.json 을 못 읽었다. 기본값 유지:', e.message);
    });

  function rule(step) {
    for (var i = 0; i < MISSION.length; i++) {
      if (MISSION[i].step === step) return MISSION[i];
    }
    return null;
  }

  // 금액·계좌번호는 사용자가 콤마나 공백을 넣을 수 있으므로 숫자만 남겨 비교한다.
  function digits(v) {
    return String(v == null ? '' : v).replace(/[^0-9]/g, '');
  }

  function matches(r, action, value) {
    if (r.action !== action) return false;
    if (r.value === undefined) return true;
    if (/^[0-9]+$/.test(r.value)) return digits(value) === r.value;
    return String(value) === r.value;
  }

  function getStep() { return current; }

  function submit(input) {
    input = input || {};
    var r = rule(current);
    if (!r) {
      return { ok: false, step: current, message: '알 수 없는 단계입니다.' };
    }
    if (matches(r, input.action, input.value)) {
      current = r.next;
      return { ok: true, step: current, message: '' };
    }
    return { ok: false, step: current, message: r.wrong };
  }

  function reset() { current = 'home'; }

  // A 는 label 로 F17 진행 표시를 만들고, C 는 이걸 askAI 3번째 인자로 넘긴다.
  // 원본을 그대로 내준다. 여기서 요약하거나 가공하면 F6 이 깨진다.
  function getMission() { return DOC; }

  return {
    getStep: getStep, submit: submit, reset: reset, getMission: getMission,
    isLoaded: function () { return loaded; }
  };
})();
```

- [ ] **Step 2: 콘솔 확인 — missions.json 이 실제로 들어왔는가**

`http://localhost:8000/screen/bank-ui.html` 새로고침 후.

```js
MissionEngine.isLoaded()
```
기대: `true`. `false` 면 `fetch` 가 실패한 것이다. `file://` 로 열었는지 주소창을 확인한다.

```js
MissionEngine.getMission().steps.map(s => s.step + ':' + (s.label || '(없음)')).join(' | ')
```
기대: `home:(없음) | bank:은행 선택 | account:계좌번호 입력 | amount:금액 입력 | confirm:확인 | done:완료`

**이게 나오는 순간 A의 F17 진행 표시가 스텁 값이 아니라 실제 `missions.json` 값으로 바뀐다.** A는 아무것도 고치지 않는다. 새로고침해서 `2 / 5 단계 — 계좌번호 입력` 이 그대로 뜨는지 S1에서 A와 같이 한 번 본다.

- [ ] **Step 3: 콘솔 확인 — 정상 6단계 통과**

```js
MissionEngine.reset();
[
  {action:'transfer'},
  {action:'pick-bank', value:'한걸음은행'},
  {action:'submit-account', value:'11022233344'},
  {action:'submit-amount', value:'50,000'},
  {action:'confirm'},
  {action:'restart'}
].forEach(i => console.log(i.action, JSON.stringify(MissionEngine.submit(i))));
```
기대:
```
transfer {"ok":true,"step":"bank","message":""}
pick-bank {"ok":true,"step":"account","message":""}
submit-account {"ok":true,"step":"amount","message":""}
submit-amount {"ok":true,"step":"confirm","message":""}
confirm {"ok":true,"step":"done","message":""}
restart {"ok":true,"step":"home","message":""}
```
`50,000` 처럼 콤마를 넣어도 통과해야 한다. 안 되면 `digits()` 를 다시 본다.

- [ ] **Step 4: 콘솔 확인 — 오답이 단계를 넘기지 않는가**

```js
MissionEngine.reset();
console.log(JSON.stringify(MissionEngine.submit({action:'history'})));
console.log('단계는?', MissionEngine.getStep());
```
기대: `ok:false`, `step:"home"`, `message` 에 B1에서 쓴 문구, 그리고 `단계는? home`.

핵심은 **오답을 내도 `step` 이 그대로**라는 것이다. SPEC D7 "화면 고정"의 근거가 여기다.

- [ ] **Step 5: 콘솔 확인 — 값이 틀리면 막히는가**

```js
MissionEngine.reset();
MissionEngine.submit({action:'transfer'});
MissionEngine.submit({action:'pick-bank', value:'한걸음은행'});
console.log(JSON.stringify(MissionEngine.submit({action:'submit-account', value:'99999'})));
console.log('단계는?', MissionEngine.getStep());
```
기대: `ok:false`, `step:"account"`, 계좌번호 안내 문구, `단계는? account`.

- [ ] **Step 6: 눈 확인 — 화면과 붙었는가**

A가 A4까지 끝냈다면 새로고침 후 홈에서 "거래내역" 을 눌러 본다.
기대: 화면이 홈에 그대로 있고 노란 박스에 B1의 문구가 뜬다.

A가 아직이면 이 Step은 S1로 넘긴다. B는 여기서 멈추지 않고 B3으로 간다.

- [ ] **Step 7: 커밋**

```bash
git add mission/mission-engine.js
git commit -m "feat(b2): F7 미션 상태머신 - missions.json 기반 판정"
```

---

## Task B3: 미션 데이터 교체 검증 + 로딩 실패 방어

F6이 Must인 이유를 실제로 확인하는 Task다. SPEC 6.1 기준 6이 "그 파일만 고쳐서 미션 내용을 바꿀 수 있다"를 요구한다.

**Files:** 임시로 `mission/missions.json` 수정 후 원복

- [ ] **Step 1: 눈 확인 — JSON만 고쳐서 미션이 바뀌는가**

`missions.json` 의 `amount` 단계 `value` 를 `"30000"` 으로, `wrong` 을 `3만원은 30000 입니다.` 로 바꾸고 새로고침.

```js
MissionEngine.reset();
MissionEngine.submit({action:'transfer'});
MissionEngine.submit({action:'pick-bank', value:'한걸음은행'});
MissionEngine.submit({action:'submit-account', value:'11022233344'});
console.log('5만원:', JSON.stringify(MissionEngine.submit({action:'submit-amount', value:'50000'})));
console.log('3만원:', JSON.stringify(MissionEngine.submit({action:'submit-amount', value:'30000'})));
```
기대: 5만원은 `ok:false`, 3만원은 `ok:true`. **`mission-engine.js` 를 한 줄도 안 고쳤는데 미션이 바뀌었다.**

- [ ] **Step 2: 원복**

`value` 를 `"50000"` 으로, `wrong` 을 B1의 문구로 되돌린다. **꼭 되돌린다** — 확인 화면(`#screen-confirm`)의 표시 금액이 5만원이므로 안 되돌리면 화면과 정답이 어긋난다.

```bash
python3 -c "import json;d=json.load(open('mission/missions.json',encoding='utf-8'));a=[s for s in d['steps'] if s['step']=='amount'][0];print('value=',a['value']);print('wrong=',a['wrong'][:30])"
```
기대: `value= 50000` 과 B1의 문구.

- [ ] **Step 3: 콘솔 확인 — 파일이 없어도 페이지가 사는가**

`missions.json` 을 잠깐 다른 이름으로 옮기고 새로고침한다.

```bash
mv mission/missions.json mission/missions.json.bak
```

```js
console.log('로딩됨?', MissionEngine.isLoaded());
console.log(JSON.stringify(MissionEngine.submit({action:'transfer'})));
```
기대: 콘솔에 `[MissionEngine] missions.json 을 못 읽었다` 경고가 뜨지만 페이지는 살아 있고, 홈 → 은행 전환은 된다(기본값 1단계). 화면이 하얗게 죽으면 실패다.

```bash
mv mission/missions.json.bak mission/missions.json
```

발표장에서 파일 하나가 빠져도 데모가 통째로 죽지 않게 하는 확인이다.

- [ ] **Step 4: 커밋**

```bash
git add mission/missions.json
git commit -m "test(b3): 미션 데이터 교체 검증과 로딩 실패 방어 확인"
```

> **게이트**: B의 Must 레인이 끝났다. **S1로 간다.** 기다리는 동안 B4를 시작해도 된다.

---

# C 레인 — 답변·음성 (`qa-data.json`, `ai-guide.js`, `voice.js`)

A·B를 기다리지 않는다.

## Task C1: 미리 쓴 답변 데이터

**Files:** Create `guide/qa-data.json`

- [ ] **Step 1: `guide/qa-data.json` 작성**

단계 이름은 `CONTRACT.md` 1절과, 버튼 글자는 A의 화면과 같아야 한다. "○○ 버튼을 누르세요"의 ○○ 가 화면과 다르면 사용자가 못 찾는다. S1에서 대조한다.

```json
{
  "default": "화면에 있는 큰 버튼을 하나 눌러 보세요. 연습이라 잘못 눌러도 실제 돈은 움직이지 않습니다.",
  "byStep": {
    "home": [
      { "keywords": ["이체", "보내", "송금", "돈"], "answer": "돈을 보내는 것을 \"이체\"라고 합니다. 맨 위 파란 버튼 \"이체\"를 누르세요." },
      { "keywords": ["잔액", "얼마", "남았", "통장"], "answer": "지금 통장에 남은 돈은 1,250,000원입니다. 화면 위쪽 \"잔액\"에 적혀 있습니다." },
      { "keywords": ["출금계좌", "내 통장", "어느 통장"], "answer": "돈이 빠져나가는 내 통장을 \"출금계좌\"라고 합니다. 화면 맨 위에 있는 한걸음은행 123456-78-901234 입니다." },
      { "keywords": ["무엇", "뭐", "어떻게", "모르"], "answer": "지금은 첫 화면입니다. 돈을 보내려면 맨 위 파란 \"이체\" 버튼을 누르세요." }
    ],
    "bank": [
      { "keywords": ["은행", "어디", "어느", "모르"], "answer": "받는 사람 김민수님의 계좌는 한걸음은행입니다. \"한걸음은행\"을 누르세요." },
      { "keywords": ["무엇", "뭐", "어떻게"], "answer": "돈을 받을 사람의 은행을 고르는 화면입니다. \"한걸음은행\"을 누르세요." }
    ],
    "account": [
      { "keywords": ["계좌", "번호", "몇", "모르"], "answer": "받는 계좌번호는 11022233344 입니다. 숫자만 넣고 \"다음\"을 누르세요." },
      { "keywords": ["하이픈", "작대기", "빼기", "-"], "answer": "작대기(-)는 넣지 않아도 됩니다. 숫자만 넣으세요." },
      { "keywords": ["수취인", "받는 사람", "누구"], "answer": "돈을 받는 사람을 \"수취인\"이라고 합니다. 여기서는 김민수님입니다." },
      { "keywords": ["무엇", "뭐", "어떻게"], "answer": "계좌번호를 넣는 화면입니다. 11022233344 를 넣고 \"다음\"을 누르세요." }
    ],
    "amount": [
      { "keywords": ["오만", "5만", "얼마", "금액"], "answer": "5만원은 숫자로 50000 입니다. 5 다음에 0을 네 개 쓰세요." },
      { "keywords": ["만원", "영", "0", "몇 개"], "answer": "1만원은 10000, 5만원은 50000 입니다. 0을 네 개 쓰면 됩니다." },
      { "keywords": ["무엇", "뭐", "어떻게"], "answer": "보낼 금액을 넣는 화면입니다. 50000 을 넣고 \"다음\"을 누르세요." }
    ],
    "confirm": [
      { "keywords": ["맞", "확인", "보내", "이거"], "answer": "받는 사람과 금액이 맞으면 \"보내기\"를 누르세요. 틀렸으면 지금 멈춰도 됩니다." },
      { "keywords": ["무엇", "뭐", "어떻게"], "answer": "마지막 확인 화면입니다. 내용이 맞으면 \"보내기\"를 누르세요." }
    ],
    "done": [
      { "keywords": ["끝", "또", "다시", "연습"], "answer": "다 끝났습니다. \"다시 연습하기\"를 누르면 처음부터 또 해볼 수 있습니다." },
      { "keywords": ["진짜", "실제", "돈", "빠졌"], "answer": "연습이라 실제 돈은 하나도 움직이지 않았습니다. 안심하세요." },
      { "keywords": ["무엇", "뭐", "어떻게"], "answer": "송금이 끝났습니다. \"다시 연습하기\"를 누르면 다시 해볼 수 있습니다." }
    ]
  }
}
```

각 단계에 `무엇/뭐/어떻게/모르` 항목을 하나씩 넣었다. C3의 "다시 설명해주세요" 가 `"지금 무엇을 해야 하나요"` 를 보내므로, 이 항목이 **SPEC 6.1 기준 5(막힘 없음)의 6단계 전체 커버리지**를 만든다. 하나라도 빠지면 그 단계에서 사용자가 멈춘다.

- [ ] **Step 2: 커버리지 확인**

```bash
python3 -c "
import json
d=json.load(open('guide/qa-data.json',encoding='utf-8'))
for s in ['home','bank','account','amount','confirm','done']:
    items=d['byStep'].get(s,[])
    generic=[i for i in items if any(k in ['무엇','뭐','어떻게','모르'] for k in i['keywords'])]
    print(s, len(items),'개', '/ 막힘대응', 'OK' if generic else '없음!!')
"
```
기대: 6단계 모두 `막힘대응 OK`.

- [ ] **Step 3: 커밋**

```bash
git add guide/qa-data.json
git commit -m "feat(c1): 단계별 미리 쓴 답변과 막힘 대응 문구"
```

---

## Task C2: F13 askAI 폴백 인터페이스

스텁을 진짜로 교체한다. LLM 경로는 `[확인 필요]` Q3이므로 **기본값은 미연결**이고, 미연결 상태에서 전부 동작해야 한다 (SPEC 6.1 기준 3).

**Files:** Modify `guide/ai-guide.js` (스텁 내용 전체 교체)

**Interfaces:**
- Consumes: `guide/qa-data.json`, `MissionEngine.getMission()` (askAI 3번째 인자로 들어온다), `CONTRACT.md` 5·6절
- Produces: `AIGuide.askAI(question, currentStep, mission)`

- [ ] **Step 1: `guide/ai-guide.js` 의 `window.AIGuide` 부분 교체**

도움바 배선(스텁의 아래쪽 IIFE)은 C3에서 다시 쓴다. 지금은 `askAI` 만 진짜로 만든다.

```js
window.AIGuide = (function () {
  var QA = null;
  var LLM_TIMEOUT_MS = 5000;

  var loading = fetch('../guide/qa-data.json')
    .then(function (r) { return r.json(); })
    .then(function (json) { QA = json; })
    .catch(function (e) {
      console.warn('[AIGuide] qa-data.json 을 못 읽었다:', e.message);
      QA = { default: '화면에 있는 큰 버튼을 눌러 보세요.', byStep: {} };
    });

  // 미리 쓴 답변에서 키워드가 가장 많이 맞는 것을 고른다.
  function matchLocal(question, step) {
    if (!QA) return null;
    var list = (QA.byStep && QA.byStep[step]) || [];
    var best = null, bestHits = 0;
    for (var i = 0; i < list.length; i++) {
      var hits = 0;
      for (var k = 0; k < list[i].keywords.length; k++) {
        if (question.indexOf(list[i].keywords[k]) !== -1) hits++;
      }
      if (hits > bestHits) { bestHits = hits; best = list[i]; }
    }
    return bestHits > 0 ? best.answer : null;
  }

  // LLM 경로. Q3 미정이므로 llm-config.js 가 없으면 아예 시도하지 않는다.
  // mission 을 같이 보낸다 — LLM 이 단계·정답을 알아야 "지금 무엇을" 에 답할 수 있다.
  function tryLLM(question, step, mission) {
    var cfg = window.LLM_CONFIG;
    if (!cfg || !cfg.enabled || !cfg.endpoint) return Promise.resolve(null);

    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, LLM_TIMEOUT_MS);

    return fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, step: step, mission: mission || null }),
      signal: ctl.signal
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && typeof j.answer === 'string') ? j.answer : null; })
      .catch(function (e) {
        console.warn('[AIGuide] LLM 실패, 폴백으로 간다:', e.name);
        return null;
      })
      .finally(function () { clearTimeout(timer); });
  }

  // missions.json 에서 이 단계의 규칙을 찾아 답변을 만든다.
  // 사람이 쓴 답변(qa-data.json)이 없을 때의 다음 수단이다. 미션이 바뀌면 이 답도 같이 바뀐다.
  function fromMission(step, mission) {
    if (!mission || !Array.isArray(mission.steps)) return null;
    var r = null;
    mission.steps.forEach(function (x) { if (x.step === step) r = x; });
    if (!r) return null;
    var out = r.label ? ('지금은 "' + r.label + '" 단계입니다. ') : '';
    if (r.value) out += '"' + r.value + '" 을(를) 넣고 다음으로 넘어가세요.';
    else if (r.wrong) out += r.wrong;
    else out += '화면에 있는 큰 버튼을 눌러 보세요.';
    return out;
  }

  function askAI(question, step, mission) {
    var q = String(question || '');
    return loading
      .then(function () { return tryLLM(q, step, mission); })
      .then(function (fromLLM) {
        if (fromLLM) return fromLLM;
        var local = matchLocal(q, step);
        if (local) return local;
        var derived = fromMission(step, mission);   // qa-data.json 에 없으면 missions.json 으로
        if (derived) return derived;
        return QA.default;
      })
      .catch(function (e) {
        console.warn('[AIGuide] 예상 못한 실패:', e);
        return '화면에 있는 큰 버튼을 눌러 보세요.';
      });
  }

  return { askAI: askAI };
})();
```

- [ ] **Step 2: 콘솔 확인 — 단계별로 답이 다른가**

```js
var M = MissionEngine.getMission();
Promise.all([
  AIGuide.askAI('돈을 어떻게 보내요', 'home', M),
  AIGuide.askAI('계좌번호가 몇 번이에요', 'account', M),
  AIGuide.askAI('오만원이 얼마예요', 'amount', M)
]).then(a => a.forEach(x => console.log('-', x)));
```
기대:
```
- 돈을 보내는 것을 "이체"라고 합니다. 맨 위 파란 버튼 "이체"를 누르세요.
- 받는 계좌번호는 11022233344 입니다. 숫자만 넣고 "다음"을 누르세요.
- 5만원은 숫자로 50000 입니다. 5 다음에 0을 네 개 쓰세요.
```

- [ ] **Step 3: 콘솔 확인 — 6단계 막힘 대응**

```js
(async () => {
  const M = MissionEngine.getMission();
  for (const s of ['home','bank','account','amount','confirm','done']) {
    console.log(s, '→', await AIGuide.askAI('지금 무엇을 해야 하나요', s, M));
  }
})();
```
기대: 6줄 모두 단계에 맞는 답이 나오고, **어느 줄도 `default` 문구로 떨어지지 않는다.** 떨어진 단계가 있으면 `qa-data.json` 에 그 단계 항목을 추가한다. **SPEC 6.1 기준 5가 여기서 판정된다.**

- [ ] **Step 3-b: 콘솔 확인 — mission 인자가 실제로 쓰이는가**

`qa-data.json` 에 없는 질문을 던져 `fromMission` 경로를 강제로 밟는다. 3번째 인자를 준 것과 안 준 것을 비교한다.

```js
var M = MissionEngine.getMission();
AIGuide.askAI('zzzz', 'account', M).then(x => console.log('mission 있음:', x));
AIGuide.askAI('zzzz', 'account').then(x => console.log('mission 없음:', x));
```
기대:
```
mission 있음: 지금은 "계좌번호 입력" 단계입니다. "11022233344" 을(를) 넣고 다음으로 넘어가세요.
mission 없음: (qa-data.json 의 default 문구)
```
두 줄이 같으면 `mission` 을 안 쓰고 있는 것이다. **이 확인이 SPEC 6.1 기준 6의 "AI도 같은 데이터를 본다" 부분이다.** `11022233344` 는 코드에 없고 `missions.json` 에서 온 값이다 — `missions.json` 의 `value` 를 바꾸고 새로고침하면 이 답변도 따라 바뀌어야 한다.

- [ ] **Step 4: 콘솔 확인 — 아무 것도 안 맞을 때**

```js
AIGuide.askAI('오늘 날씨 어때요', 'home', null).then(x => console.log(x));
AIGuide.askAI('', 'confirm', null).then(x => console.log(x));
```
기대: 둘 다 `default` 문구. 콘솔에 빨간 에러가 뜨면 실패다. `askAI` 는 어떤 입력에도 reject 하지 않는다.

- [ ] **Step 5: 콘솔 확인 — LLM이 죽어 있어도 답이 나오는가**

```js
window.LLM_CONFIG = { enabled: true, endpoint: 'http://localhost:9/없는곳' };
console.time('폴백');
AIGuide.askAI('돈 어떻게 보내요', 'home', MissionEngine.getMission()).then(x => { console.timeEnd('폴백'); console.log('답변:', x); });
```
기대: `[AIGuide] LLM 실패, 폴백으로 간다: TypeError` 경고 후 이체 안내 답변. 5초 안에 나와야 한다.

확인 후 `window.LLM_CONFIG = null` 로 되돌리고 새로고침한다.

- [ ] **Step 6: 커밋**

```bash
git add guide/ai-guide.js
git commit -m "feat(c2): F13 askAI 폴백 인터페이스 (LLM → 미리 쓴 답변 → 기본)"
```

> **게이트**: SPEC 6.1 기준 3(폴백 성립)의 절반. LLM이 없거나 죽어도 `askAI` 가 항상 한국어 문장을 돌려준다. API 키는 아직 어디에도 없다.

---

## Task C3: F14 도움바 배선

**A의 파일을 열지 않는다.** A가 놓은 DOM id를 `ai-guide.js` 안에서 찾아 스스로 이벤트를 붙인다.

**Files:** Modify `guide/ai-guide.js` (아래쪽 배선 IIFE 교체)

**Interfaces:**
- Consumes: `#help-ask` `#help-repeat` `#mic-button` `#question-box` `#question-text` `#question-send`, `BankUI.showAnswer`, `MissionEngine.getStep`, `MissionEngine.getMission`, `Voice`

- [ ] **Step 1: 스텁 배선을 아래로 교체**

```js
// 도움바 배선 — A 의 DOM 에 C 가 스스로 붙는다. bank-ui.html 을 고치지 않는다.
(function wireHelp() {
  var box = document.getElementById('question-box');
  var input = document.getElementById('question-text');
  var mic = document.getElementById('mic-button');

  function currentStep() {
    return window.MissionEngine ? window.MissionEngine.getStep() : 'home';
  }

  // 미션 데이터는 B 가 내준다. C 가 단계 설명을 따로 들고 있지 않는다 (SPEC 8).
  function currentMission() {
    return (window.MissionEngine && window.MissionEngine.getMission)
      ? window.MissionEngine.getMission() : null;
  }

  function ask(question) {
    window.BankUI.showAnswer('생각 중입니다...');
    window.AIGuide.askAI(question, currentStep(), currentMission()).then(function (answer) {
      window.BankUI.showAnswer(answer);
    });
  }

  function openBox(message) {
    if (message) window.BankUI.showAnswer(message);
    if (box) box.hidden = false;
    if (input) input.focus();
  }

  function sendFromBox() {
    if (!input || !input.value) return;
    var q = input.value;
    input.value = '';
    if (box) box.hidden = true;
    ask(q);
  }

  var open = document.getElementById('help-ask');
  if (open) open.addEventListener('click', function () {
    openBox('무엇이 궁금한지 아래에 적고 "보내기"를 누르세요.');
  });

  // "다시 설명해주세요" = 지금 단계에서 뭘 해야 하는지 다시 듣기.
  var repeat = document.getElementById('help-repeat');
  if (repeat) repeat.addEventListener('click', function () {
    ask('지금 무엇을 해야 하나요');
  });

  var send = document.getElementById('question-send');
  if (send) send.addEventListener('click', sendFromBox);
  if (input) input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendFromBox();
  });

  // 마이크는 F12(Should). voice.js 가 지원을 보고할 때만 버튼을 보인다.
  if (mic && window.Voice && window.Voice.isSupported()) {
    mic.hidden = false;
    mic.addEventListener('click', function () {
      window.BankUI.showAnswer('듣고 있습니다. 말씀하세요.');
      window.Voice.startListening(
        function (text) { ask(text); },
        function (reason) {
          if (reason === 'no-speech') {
            window.BankUI.showAnswer('소리가 들리지 않았습니다. 마이크 버튼을 다시 눌러 보세요.');
          } else if (reason === 'denied') {
            openBox('마이크를 쓸 수 없습니다. 아래에 적어 주세요.');
          } else {
            openBox('말을 알아듣지 못했습니다. 아래에 적어 주세요.');
          }
        }
      );
    });
  }
})();
```

- [ ] **Step 2: 눈 확인 — 다시 설명해주세요**

새로고침. 홈에서 "다시 설명해주세요" 를 누른다.
기대: 노란 박스에 "생각 중입니다..." 가 잠깐 떴다가 홈 단계 답변으로 바뀐다.

이체를 눌러 은행 선택 화면으로 간 뒤 다시 누른다.
기대: 이번엔 한걸음은행을 누르라는 답변이 나온다. **단계에 따라 답이 달라져야 한다.**

- [ ] **Step 3: 눈 확인 — 텍스트 질문 왕복 (SPEC 6.1 기준 2)**

"물어보기" → 입력칸 열림 → 금액 화면에서 `오만원이 얼마예요` 적고 "보내기".
기대: 5만원은 50000 이라는 답변이 뜨고, 입력칸이 비워지고 닫힌다.

입력칸에서 Enter 를 눌러도 같아야 한다.

- [ ] **Step 4: 눈 확인 — 마이크 버튼이 안 보이는가**

기대: 마이크 버튼이 **보이지 않는다.** `voice.js` 가 아직 스텁이라 `isSupported()` 가 `false` 다. Must 단계에서는 이게 정상이다.

- [ ] **Step 5: 눈 확인 — 낭독 소리가 없는가**

위 확인들을 하는 동안 스피커에서 소리가 나면 안 된다. F11(TTS)은 Won't다.

- [ ] **Step 6: 커밋**

```bash
git add guide/ai-guide.js
git commit -m "feat(c3): F14 도움바 배선 - 텍스트 질문 왕복"
```

> **게이트**: C의 Must 레인이 끝났다. **SPEC 6.1 기준 2가 성립한다.** F10·F11이 Won't이므로 사용자가 막혔을 때 갈 곳은 이 버튼들과 F8의 오답 설명뿐이다.

---

# S1 — 합류

## Task S1: 스텁 교체 확인 + 완주

셋이 모인다. 새 코드를 거의 쓰지 않는다.

- [ ] **Step 1: 스텁이 전부 교체됐는지 확인**

```bash
grep -l '\[스텁\]' mission/*.js guide/*.js
```
기대: `guide/voice.js` 만 나온다. F12가 Should라 아직 스텁인 것이 맞다.
`mission-engine.js` 나 `ai-guide.js` 가 나오면 그 레인이 안 끝난 것이다.

- [ ] **Step 2: 눈 확인 — 마우스만으로 완주**

새로고침 후 손으로 순서대로.

1. 이체 → 은행 선택
2. 한걸음은행 → 계좌번호
3. `11022233344` → 다음 → 금액
4. `50000` → 다음 → 확인
5. 보내기 → 완료
6. 다시 연습하기 → 홈, 두 입력칸 비어 있음

- [ ] **Step 3: 눈 확인 — 오답 3종**

- 홈에서 "거래내역": 화면 그대로 + 흔들림 + B1 문구
- 은행에서 "새봄은행": 화면 그대로 + 흔들림 + 한걸음은행 안내
- 금액에 `30000` → 다음: 금액 화면 그대로 + 5만원 안내. 그 뒤 `50000` 으로 고치면 통과

- [ ] **Step 3-b: 눈 확인 — F17 진행 표시가 실제 데이터에서 오는가**

A의 `#progress` 는 A1에서 **스텁** `getMission()` 값으로 확인했다. 이제 B2가 붙었으니 `missions.json` 값으로 나와야 한다.

완주하면서 화면마다 위쪽 한 줄을 본다.
기대: 홈에서는 표시 없음 → `1 / 5 단계 — 은행 선택` → `2 / 5 단계 — 계좌번호 입력` → `3 / 5 단계 — 금액 입력` → `4 / 5 단계 — 확인` → `5 / 5 단계 — 완료`.

`missions.json` 의 `account` 단계 `label` 을 `"계좌번호 입력 (테스트)"` 로 바꾸고 새로고침한다.
기대: 화면 문구도 같이 바뀐다. 안 바뀌면 A가 단계 이름을 `bank-ui.html` 에 하드코딩한 것이다 — F6 위반이므로 고친다. 확인 후 원복한다.

- [ ] **Step 3-c: 콘솔 확인 — AI가 미션 데이터를 받고 있는가**

```js
AIGuide.askAI('zzzz', 'account', MissionEngine.getMission()).then(x => console.log('있음:', x));
AIGuide.askAI('zzzz', 'account').then(x => console.log('없음:', x));
```
기대: 두 줄이 **다르다.** `있음:` 쪽에 `11022233344` 같은 `missions.json` 값이 들어 있다. 같으면 C3의 배선이 3번째 인자를 안 넘기고 있는 것이다(`currentMission()` 확인). SPEC 8의 `askAI(question, currentStep, mission)` 가 실제로 성립하는지 보는 자리다.

- [ ] **Step 4: 대조 — 답변 문구와 화면 글자가 같은가**

SPEC 11.6이 남겨 둔 조율 지점이다. C의 `qa-data.json` 이 "○○ 버튼을 누르세요"라고 할 때 ○○ 가 A의 화면 버튼 글자와 같아야 한다.

```bash
python3 -c "
import json,re,io
qa=json.load(open('guide/qa-data.json',encoding='utf-8'))
html=io.open('screen/bank-ui.html',encoding='utf-8').read()
quoted=set()
for items in qa['byStep'].values():
    for i in items:
        quoted.update(re.findall(r'\"([^\"]{1,12})\"', i['answer']))
for q in sorted(quoted):
    print(('있음  ' if q in html else '없음!!'), q)
"
```
기대: 전부 `있음`. `없음!!` 이 있으면 C가 그 문구를 화면 글자로 고친다.

- [ ] **Step 5: 눈 확인 — 마이크 버튼과 퀴즈 버튼이 안 보이는가**

기대: 둘 다 안 보인다. F12·F16이 Should이므로 Must 상태에서는 없는 것이 맞다.

- [ ] **Step 6: 커밋**

```bash
git add -A app
git commit -m "chore(s1): 세 레인 합류, 스텁 교체 확인"
```

> **게이트**: 세 레인이 붙었고 완주된다. 하나라도 안 되면 담당자가 자기 레인으로 돌아간다.

---

# S2 — Must 합격 판정

## Task S2: SPEC 6.1 기준 1~6

코드를 쓰지 않는다. 통과하는지 확인하고 기록하는 Task다.

**Files:** Create `shared/CHECK.md`

- [ ] **Step 1: 기준 1 — 완주 (팀원 아닌 사람)**

팀원이 아닌 사람 1명을 앉히고 아무 설명도 하지 않는다. "김민수에게 5만원을 보내 보세요" 만 말한다.
기대: 완료 화면까지 도달한다. 도중에 옆에서 알려줬다면 통과가 아니다. 어디서 멈췄는지 적는다.

- [ ] **Step 2: 기준 2 — 텍스트 질문 왕복**

"물어보기" 로 질문을 적어 보내면 답이 화면 텍스트로 표시된다. 낭독 소리가 없다.

- [ ] **Step 3: 기준 3 — 폴백 성립**

```js
console.log('LLM 설정:', window.LLM_CONFIG)
```
기대: `undefined`. 이 상태로 1·2가 통과했으면 기준 3 절반은 통과다.

오프라인도 본다: DevTools → Network → Offline → 새로고침.
기대: `missions.json`·`qa-data.json` 을 못 읽어 경고가 뜨지만 화면은 뜬다. 답변은 기본 답변 하나로 줄고 미션은 1단계만 판정한다. **화면이 하얗게 죽지 않으면 통과다.** 발표장 네트워크 사고 시나리오다.

- [ ] **Step 4: 기준 4 — 오답 회복**

각 단계에서 일부러 틀린다.
기대: 6단계 모두 화면이 넘어가지 않고, 흔들림 + "왜 틀렸는지 + 무엇을 눌러야 하는지" 를 받는다.

- [ ] **Step 5: 기준 5 — 막힘 없음**

각 단계에서 **"다시 설명해주세요" 만 눌러서** 그 답변만 읽고 다음으로 갈 수 있는지 6단계 전부 확인한다.
기대: 6단계 모두 답변에 "무엇을 눌러야 하는지"가 들어 있다. 부족하면 C가 `qa-data.json` 을 고치고 다시 한다.

SPEC 10.2 리스크 2가 실제로 터지는지 보는 자리다. 배너·낭독 없이 F8 + F14 둘로 버티는지가 여기서 결판난다.

- [ ] **Step 6: 기준 6 — 미션이 데이터로 분리됐는가**

B3 Step 1을 셋이 같이 재현한다. `missions.json` **하나만** 고쳐서 세 곳이 같이 바뀌는지 본다. 코드는 열지 않는다.

`value` 를 `50000` → `70000`, `label` 을 `금액 입력` → `보낼 돈 입력` 으로 바꾸고 새로고침.

| 어디 | 기대 |
|---|---|
| 판정 (B) | `50000` 이 오답이 되고 `70000` 이 정답이 된다 |
| 진행 표시 (A·F17) | `3 / 5 단계 — 보낼 돈 입력` |
| AI 답변 (C·F13) | `askAI('zzzz','amount',getMission())` 답에 `70000` 이 나온다 |

**세 곳이 다 따라오면 통과다.** 하나라도 옛 값을 들고 있으면 그 파일에 미션 내용이 하드코딩된 것이다. 확인 후 원복한다.

- [ ] **Step 7: `shared/CHECK.md` 기록**

```markdown
# Must 합격 판정 (2026-08-19)

| 기준 | 결과 | 메모 |
|---|---|---|
| 1 완주 (외부인 1명) | 통과 / 실패 | 멈춘 지점: |
| 2 텍스트 질문 왕복 | 통과 / 실패 | |
| 3 폴백 성립 (LLM 미연결·오프라인) | 통과 / 실패 | |
| 4 오답 회복 (6단계) | 통과 / 실패 | 안 된 단계: |
| 5 막힘 없음 (6단계) | 통과 / 실패 | 부족했던 단계: |
| 6 미션 데이터 분리 (판정·진행표시·AI 셋 다) | 통과 / 실패 | 안 따라온 곳: |
| (참고) F17 진행 표시 | 통과 / 실패 | |
```

- [ ] **Step 8: 커밋**

```bash
git add shared/CHECK.md
git commit -m "docs(s2): Must 합격 판정 결과"
```

> **게이트**: 여섯 기준 모두 통과. **여기까지가 MVP다.** 못 넘기면 Should로 가지 않는다.

---

# Should — 세 레인 다시 병렬

## Task A6: F1 폰 셸 + 큰 글씨·큰 버튼

**Files:** Modify `screen/bank-ui.html`, `screen/styles.css`

- [ ] **Step 1: `#phone` 을 셸로 감싸기**

`<main id="phone">` 을 `<div id="shell"><main id="phone">` 으로, `</main>` 뒤에 `</div>`.

- [ ] **Step 2: `styles.css` 맨 아래에 추가**

```css
#shell {
  max-width: 400px;
  margin: 0 auto;
  padding: 14px;
  background: #1b1f27;
  border-radius: 40px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}
#shell #phone {
  max-width: none;
  min-height: 640px;
  border: 0;
  border-radius: 28px;
  font-size: 22px;
}
#shell #phone h1 { font-size: 32px; }
#shell #phone button { min-height: 72px; font-size: 24px; }
#shell #phone #help-bar button { min-height: 60px; font-size: 18px; }
#shell #phone input { min-height: 72px; font-size: 28px; }

@media (max-width: 460px) {
  body { padding: 0; }
  #shell { padding: 0; border-radius: 0; box-shadow: none; }
  #shell #phone { border-radius: 0; min-height: 100vh; }
}
```

- [ ] **Step 3: 눈 확인** — 어두운 폰 테두리 안에 흰 화면. 글씨·버튼이 눈에 띄게 커졌다.
- [ ] **Step 4: 눈 확인** — Device Toolbar 390px 에서 테두리가 사라지고 화면이 꽉 찬다. 가로 스크롤바가 생기면 실패다.
- [ ] **Step 5: 눈 확인 (SPEC 6.2 기준 8)** — 팔을 뻗은 거리에서 버튼 글씨가 읽힌다. 안 읽히면 `button` 을 26px로 올린다.
- [ ] **Step 6: 커밋** `feat(a6): F1 폰 셸과 고령자용 큰 글씨/큰 버튼`

---

## Task A7: F5 큰 숫자 키패드

> **레퍼런스 근거**(SPEC 13.3 R2): SOL 실제 금액 입력 화면에는 키보드가 없고 **숫자 키패드만** 있다. 즉 Must 상태의 기본 `<input>` 은 실제 앱과 다른 입력 방식이다. 등급(Should)은 10절 팀 확정본이라 바꾸지 않았고, 근거만 기록한다.
>
> 화면으로 확인한 SOL 키패드 구조(SPEC 13.2 03): **하단에서 올라오고 3열**, 숫자 1~9 + `←`(한 자 지움) · `0` · `완료`. 아래 계획의 12버튼과 같은 구성이다.
>
> **금액 칩 `1만` `5만` `10만` `100만` `전액` 은 넣지 않는다**(SPEC 13.3 X5). 우리 미션 목표가 5만원이라 `5만` 칩이 있으면 한 번 눌러 정답이 되고, 금액을 넣는 연습 자체가 사라진다.

**Files:** Modify `screen/bank-ui.html`, `screen/styles.css`

- [ ] **Step 1: `#screen-account` 의 `<input>` 과 다음 버튼 사이에 키패드 추가**

```html
    <div class="keypad" data-target="input-account">
      <button type="button" data-key="1">1</button>
      <button type="button" data-key="2">2</button>
      <button type="button" data-key="3">3</button>
      <button type="button" data-key="4">4</button>
      <button type="button" data-key="5">5</button>
      <button type="button" data-key="6">6</button>
      <button type="button" data-key="7">7</button>
      <button type="button" data-key="8">8</button>
      <button type="button" data-key="9">9</button>
      <button type="button" data-key="clear">전체지움</button>
      <button type="button" data-key="0">0</button>
      <button type="button" data-key="back">← 지움</button>
    </div>
```

`#screen-amount` 에도 같은 블록을 `data-target="input-amount"` 로 바꿔 넣는다. 12개 버튼을 그대로 반복한다.

- [ ] **Step 2: 인라인 `<script>` 맨 아래에 추가**

```js
document.addEventListener('click', function (e) {
  var key = e.target.closest('[data-key]');
  if (!key) return;
  var pad = key.closest('.keypad');
  if (!pad) return;

  var input = document.getElementById(pad.getAttribute('data-target'));
  if (!input) return;

  var k = key.getAttribute('data-key');
  if (k === 'clear') input.value = '';
  else if (k === 'back') input.value = input.value.slice(0, -1);
  else input.value = input.value + k;
});
```

키패드 버튼에는 `data-action` 이 없으므로 A4의 상태머신 리스너에 걸리지 않는다. 두 리스너가 간섭하지 않는다.

- [ ] **Step 3: `styles.css` 맨 아래에 추가**

```css
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 12px 0 16px;
}
.keypad button { margin: 0; min-height: 68px; font-size: 28px; }
.keypad button[data-key="clear"],
.keypad button[data-key="back"] { font-size: 17px; }
```

- [ ] **Step 4: 눈 확인** — 숫자 버튼으로 `11022233344` 가 쌓인다. `← 지움` 은 한 자, `전체지움` 은 전부.
- [ ] **Step 5: 눈 확인 (SPEC 6.2 기준 9)** — **키보드를 아예 만지지 않고** 마우스 클릭만으로 완주된다.
- [ ] **Step 6: 커밋** `feat(a7): F5 큰 숫자 키패드`

---

## Task A8: F2 용어 병기 라벨 (Could)

**Files:** Modify `screen/bank-ui.html`, `screen/styles.css`

- [ ] **Step 1: 홈 버튼 3개를 병기 형태로**

```html
    <button data-action="transfer" class="primary">이체<small>돈 보내기</small></button>
    <button data-action="history">거래내역<small>들어오고 나간 기록</small></button>
    <button data-action="balance">잔액조회<small>남은 돈 보기</small></button>
```

- [ ] **Step 2: `styles.css` 맨 아래에 추가**

```css
button small {
  display: block;
  margin-top: 2px;
  font-size: 15px;
  font-weight: normal;
  opacity: 0.8;
}
```

- [ ] **Step 3: 눈 확인** — 큰 글씨는 여전히 실제 용어, 아래 작은 글씨가 쉬운 말. 이체를 눌러 미션이 그대로 진행된다(`data-action` 을 안 건드렸다).
- [ ] **Step 4: 커밋** `feat(a8): F2 용어 병기 라벨`

---

## Task B4: F16 퀴즈 문항 데이터

**Files:** Create `mission/quiz-data.json`

- [ ] **Step 1: 문항 5개 작성**

SPEC 6.2 기준 10이 **"송금 6단계에서 실제로 화면에 등장한 용어만"** 요구한다. A2·A3에서 `출금계좌`·`잔액`·`계좌번호`·`수취인`·`이체` 를 화면에 넣었으므로 이 다섯 개만 쓴다.

```json
{
  "title": "금융용어 복습",
  "questions": [
    {
      "q": "돈을 보내는 것을 은행에서는 무엇이라고 할까요?",
      "choices": ["이체", "잔액", "거래내역", "조회"],
      "answer": 0,
      "why": "\"이체\"는 돈 보내기라는 뜻입니다. 홈 화면 맨 위 파란 버튼이 이체였습니다."
    },
    {
      "q": "돈을 보낼 때 돈이 빠져나가는 내 통장을 무엇이라고 할까요?",
      "choices": ["출금계좌", "계좌번호", "잔액", "거래내역"],
      "answer": 0,
      "why": "\"출금계좌\"는 돈이 빠져나가는 내 통장입니다. 홈 화면 맨 위에 적혀 있었습니다."
    },
    {
      "q": "돈을 받을 통장을 구분하는 번호는 무엇일까요?",
      "choices": ["계좌번호", "비밀번호", "잔액", "이체"],
      "answer": 0,
      "why": "\"계좌번호\"는 통장을 구분하는 번호입니다. 아까 11022233344 를 넣은 것이 계좌번호입니다."
    },
    {
      "q": "통장에 남아 있는 돈을 무엇이라고 할까요?",
      "choices": ["잔액", "이체", "수취인", "출금계좌"],
      "answer": 0,
      "why": "\"잔액\"은 통장에 남아 있는 돈입니다. 홈 화면에 1,250,000원으로 적혀 있었습니다."
    },
    {
      "q": "돈을 받는 사람을 무엇이라고 할까요?",
      "choices": ["수취인", "출금계좌", "잔액", "계좌번호"],
      "answer": 0,
      "why": "\"수취인\"은 돈을 받는 사람입니다. 아까 화면에 수취인 김민수로 적혀 있었습니다."
    }
  ]
}
```

**정답이 다 0번이다.** B5 Step 1에서 보기 순서를 화면에 그릴 때 섞는다. 데이터에서는 정답을 0번에 고정해 두는 것이 검수하기 쉽다.

- [ ] **Step 2: 용어가 화면에 실제로 있는지 확인**

```bash
python3 -c "
import json,io
qz=json.load(open('mission/quiz-data.json',encoding='utf-8'))
html=io.open('screen/bank-ui.html',encoding='utf-8').read()
for q in qz['questions']:
    t=q['choices'][q['answer']]
    print(('있음  ' if t in html else '없음!!'), t)
"
```
기대: 다섯 개 모두 `있음`. `없음!!` 이면 그 용어가 송금 화면에 안 나오는 것이므로 문항을 바꾸거나 A에게 화면 라벨 추가를 요청한다.

- [ ] **Step 3: 커밋** `feat(b4): F16 퀴즈 문항 5개`

---

## Task B5: F16 퀴즈 엔진 + 화면

**Files:** Create `mission/quiz.js`

**Interfaces:**
- Consumes: `mission/quiz-data.json`, `BankUI.showStep`, `#screen-quiz`, `#quiz-start`
- Produces: `window.Quiz.start()`

`#screen-quiz` 안쪽은 A가 비워 뒀다. B가 여기에 그려 넣는다. **A의 파일을 열지 않는다.**

- [ ] **Step 1: `mission/quiz.js` 작성**

```js
window.Quiz = (function () {
  var DATA = null;
  var idx = 0;
  var screen = document.getElementById('screen-quiz');
  var startBtn = document.getElementById('quiz-start');

  var loading = fetch('../mission/quiz-data.json')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      DATA = json;
      if (startBtn) startBtn.hidden = false;   // 데이터가 있을 때만 진입 버튼을 보인다
    })
    .catch(function (e) {
      console.warn('[Quiz] quiz-data.json 을 못 읽었다:', e.message);
    });

  function render() {
    var q = DATA.questions[idx];
    screen.innerHTML = '';

    var h = document.createElement('h1');
    h.textContent = '용어 복습 ' + (idx + 1) + ' / ' + DATA.questions.length;
    screen.appendChild(h);

    var p = document.createElement('p');
    p.className = 'hint';
    p.textContent = q.q;
    screen.appendChild(p);

    // 보기 순서를 섞는다. 데이터는 정답이 0번에 고정돼 있다.
    var order = q.choices.map(function (_, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }

    order.forEach(function (choiceIndex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = q.choices[choiceIndex];
      b.addEventListener('click', function () { answer(choiceIndex === q.answer, q); });
      screen.appendChild(b);
    });

    var out = document.createElement('p');
    out.id = 'quiz-feedback';
    out.className = 'hint';
    screen.appendChild(out);
  }

  // 오답 처리 = 설명 후 다음 문제. 다시 고를 기회를 주지 않는다 (SPEC 4.1 F16).
  // 팀이 "다시 선택"으로 뒤집으면 고칠 곳은 이 함수 하나다 (SPEC 12.2).
  function answer(correct, q) {
    var out = document.getElementById('quiz-feedback');
    out.textContent = correct
      ? ('맞았습니다. ' + q.why)
      : ('아닙니다. 정답은 "' + q.choices[q.answer] + '" 입니다. ' + q.why);

    // 보기 버튼을 잠가 중복 클릭을 막는다. 이 잠금이 "다시 선택 없음"을 만든다.
    var buttons = screen.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) buttons[i].disabled = true;

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'primary';
    next.textContent = (idx + 1 < DATA.questions.length) ? '다음 문제' : '끝내기';
    next.addEventListener('click', function () {
      idx++;
      if (idx < DATA.questions.length) {
        render();
      } else {
        idx = 0;
        window.BankUI.showStep('done');
      }
    });
    screen.appendChild(next);
  }

  function start() {
    if (!DATA) { console.warn('[Quiz] 데이터가 아직 없다'); return; }
    idx = 0;
    render();
    window.BankUI.showStep('quiz');
  }

  if (startBtn) startBtn.addEventListener('click', start);

  return { start: start };
})();
```

`#quiz-start` 는 `data-action` 이 없으므로 A4의 상태머신 리스너에 걸리지 않는다. 퀴즈는 미션 단계가 아니다.

오답을 골랐을 때 다시 고를 기회를 주지 않는다. 대신 **정답이 무엇이었는지와 쉬운 설명을 같이** 보여준다. SPEC 4.1·12.2에서 확정된 값이다. 나중에 팀이 "다시 선택"으로 뒤집으면 `answer()` 의 버튼 잠금만 고친다 — 화면·데이터는 그대로다.

- [ ] **Step 2: 눈 확인 — 진입 버튼이 나타나는가**

새로고침 후 완주해서 완료 화면까지 간다.
기대: 이제 "용어 복습하기" 버튼이 **보인다.** B4의 데이터가 로드됐기 때문이다.

- [ ] **Step 3: 눈 확인 — 5문제 완주**

"용어 복습하기" 를 누른다.
기대: `용어 복습 1 / 5` 와 문제, 보기 4개. 하나를 고르면 즉시 맞았는지 + 설명이 뜨고 보기가 잠기며 "다음 문제" 가 나타난다. 5번째에서는 "끝내기" 가 나오고, 누르면 완료 화면으로 돌아온다.

- [ ] **Step 4: 눈 확인 — 보기 순서가 섞이는가**

퀴즈를 두 번 들어가 1번 문제를 본다.
기대: 보기 순서가 다르다. 항상 첫 번째가 정답이면 섞기가 안 된 것이다.

- [ ] **Step 5: 눈 확인 — 오답도 설명을 받는가**

일부러 틀린 보기를 고른다.
기대: `아닙니다. 정답은 "출금계좌" 입니다.` + `why` 설명이 뜬다. 보기 4개가 모두 잠기고 **다시 고를 수 없다.** "다음 문제" 만 눌린다. SPEC 6.2 기준 10이 요구하는 것이고, 오답 처리 방식은 SPEC 4.1 F16의 확정값이다.

- [ ] **Step 6: 눈 확인 — 미션이 안 깨졌는가**

퀴즈를 끝낸 뒤 "다시 연습하기" 를 누른다.
기대: 홈으로 가고 송금 미션이 정상 동작한다. 퀴즈가 상태머신을 건드리지 않았다는 확인이다.

- [ ] **Step 7: 커밋** `feat(b5): F16 금융용어 미니 퀴즈`

---

## Task C4: F12 마이크 질문 STT

**Files:** Modify `guide/voice.js` (스텁 내용 전체 교체)

SPEC 5.2: iOS Safari 는 음성 인식을 지원하지 않는다. `isSupported()` 가 `false` 를 반환하는 경로를 반드시 살려 둔다. C3의 배선이 그때 텍스트 입력으로 되돌린다.

- [ ] **Step 1: `guide/voice.js` 전체 교체**

```js
window.Voice = (function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var active = null;

  function isSupported() { return !!SR; }

  function startListening(onResult, onError) {
    if (!SR) { if (onError) onError('unsupported'); return; }
    if (active) return;   // 중복 클릭 방지

    var rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    active = rec;

    rec.onresult = function (e) {
      if (onResult) onResult(e.results[0][0].transcript);
    };

    rec.onerror = function (e) {
      var reason = 'error';
      if (e.error === 'no-speech') reason = 'no-speech';
      else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') reason = 'denied';
      if (onError) onError(reason);
    };

    rec.onend = function () { active = null; };

    try {
      rec.start();
    } catch (err) {
      active = null;
      if (onError) onError('error');
    }
  }

  return { isSupported: isSupported, startListening: startListening };
})();
```

`#mic-button` 의 `hidden` 을 벗기는 것은 C3의 배선이 `Voice.isSupported()` 를 보고 한다. 로드 순서가 `voice.js` → `ai-guide.js` 이므로 순서가 맞다.

- [ ] **Step 2: 콘솔 확인 — 지원 판정**

```js
console.log('지원?', Voice.isSupported())
```
기대: 데스크톱 Chrome 에서 `지원? true`.

- [ ] **Step 3: 눈 확인 — 마이크 버튼이 나타나는가**

새로고침.
기대: 도움바에 "🎤 말로 물어보기" 가 **보인다.** 스텁일 때는 숨어 있던 버튼이다.

- [ ] **Step 4: 귀+눈 확인 — 음성 왕복 (SPEC 6.2 기준 7)**

계좌번호 화면에서 마이크 버튼을 누르고 "계좌번호가 몇 번이에요" 라고 말한다. 권한을 물으면 허용한다.
기대: "듣고 있습니다" → "생각 중입니다..." → `받는 계좌번호는 11022233344 입니다...` 가 **화면 텍스트로** 뜬다. 읽어주는 소리가 나면 안 된다.

권한 팝업이 안 뜨고 바로 실패하면 `file://` 로 열었을 가능성이 높다. 주소창이 `localhost:8000` 인지 확인한다.

- [ ] **Step 5: 눈 확인 — 권한 거부 폴백**

Chrome 주소창 왼쪽 자물쇠 → 마이크 → "차단" → 새로고침 → 마이크 버튼 누르기.
기대: `마이크를 쓸 수 없습니다. 아래에 적어 주세요.` 가 뜨고 텍스트 입력칸이 열린다. 여기서 텍스트로 물어봐도 답이 나온다.

확인 후 "허용" 으로 되돌린다.

- [ ] **Step 6: 콘솔 확인 — 미지원 경로**

`voice.js` 첫 줄을 잠깐 `var SR = null;` 로 바꿔 새로고침한다.
기대: 마이크 버튼이 다시 숨는다. 텍스트 질문은 그대로 동작한다. 확인 후 원복한다.

iOS 기기 없이 아이폰 상황을 재현하는 방법이다.

- [ ] **Step 7: 커밋** `feat(c4): F12 마이크 STT와 미지원·거부 폴백`

---

# S3 — 발표 준비

## Task S3: 시연 리허설과 사고 대비

**Files:** Modify `shared/CHECK.md`

- [ ] **Step 1: `CHECK.md` 맨 위에 시연 절차**

```markdown
## 시연 절차

1. `python3 -m http.server 8000`
2. Chrome 에서 `http://localhost:8000/screen/bank-ui.html`
3. (F12를 만들었으면) 마이크 권한 팝업에 "허용"
4. `file://` 로 열면 마이크와 fetch 가 둘 다 막힌다. 주소창에 localhost 가 있는지 확인.
```

- [ ] **Step 2: 눈 확인 — 맨바닥에서 한 번**

브라우저·서버를 다 껐다 켜고 절차대로만 해서 완주한다. 절차에 없던 행동이 필요했으면 절차에 추가한다.

- [ ] **Step 3: 눈 확인 — 마이크가 죽은 상태**

마이크를 "차단" 으로 바꾸고 완주 시도.
기대: 텍스트 폴백으로 완주된다. 발표 중 가장 흔한 사고이고, 이 경로가 살아 있으면 데모가 죽지 않는다. 확인 후 원복.

- [ ] **Step 4: 눈 확인 — 네트워크가 죽은 상태**

DevTools → Network → Offline → 새로고침 → 완주 시도.
기대: 답변 품질은 떨어지고 미션 판정도 1단계로 줄지만 화면은 살아 있다.

- [ ] **Step 5: 남은 `[확인 필요]` 를 `CHECK.md` 에 옮겨 적기**

SPEC 9절 항목 중 안 정해진 것을 발표 질문 대비용으로 적는다. 특히 두 개.

- **Q3 LLM 경로** — "지금은 미리 쓴 답변으로만 동작한다"고 정직하게 말할 수 있게 준비한다.
- **SPEC 10.2 리스크 4** — F12가 Should, F11이 Won't라 **MVP에 음성이 없다.** "AI를 어디에 썼나"라는 질문에 F13(askAI 폴백 구조)과 F16(용어 복습)으로 답할 준비를 한다. 이건 미리 문장을 정해 두지 않으면 발표장에서 막힌다.

- [ ] **Step 6: 커밋** `docs(s3): 시연 절차와 사고 대비 리허설 결과`

---

## 이 계획이 SPEC을 다 덮는지 (자체 점검)

| SPEC 항목 | 등급 | 담당 Task |
|---|---|---|
| F3 가상 홈 화면 | Must | A2 |
| F4+F15 송금 6단계 + 완료 화면 | Must | A1(껍데기), A3 |
| F17 진행 단계 표시 (F4+F15 안) | Must | S0 Step 2(`label`), A1(`#progress`·`showStep`), B2(실제 값 공급) |
| F6 미션 데이터 스키마 | Must | S0 Step 2(골격·`label`), B1(문구), B3(검증) |
| F6↔AI 연결 (`askAI` 3번째 인자) | Must | S0 Step 3(계약), B2(`getMission`), C2 Step 3-b, C3(전달) |
| F7 미션 상태머신 | Must | B2 |
| F8 오답 피드백 | Must | A5(화면), B1(문구) |
| F13 askAI 폴백 | Must | C1, C2 |
| F14 도움 진입점 | Must | A4(DOM), C3(배선) |
| F1 폰 셸 | Should | A6 |
| F5 큰 숫자 키패드 | Should | A7 |
| F12 마이크 질문 STT | Should | C4 |
| F16 금융용어 미니 퀴즈 | Should | B4, B5 |
| F2 용어 병기 | Could | A8 |
| F9·F10·F11 | Won't | 없음 — 의도적으로 만들지 않는다 |
| 6.1 기준 1 완주 | — | A4 Step 4, S1 Step 2, S2 Step 1 |
| 6.1 기준 2 텍스트 질문 왕복 | — | C3 Step 3, S2 Step 2 |
| 6.1 기준 3 폴백 성립 | — | C2 Step 5, B3 Step 3, S2 Step 3 |
| 6.1 기준 4 오답 회복 | — | A5, B2 Step 4, S2 Step 4 |
| 6.1 기준 5 막힘 없음 | — | C1 Step 2, C2 Step 3, S2 Step 5 |
| 6.1 기준 6 미션 데이터 분리 | — | B3 Step 1, S2 Step 6, **C2 Step 3-b**(AI도 같은 데이터를 본다) |
| 6.2 기준 7 음성 왕복 | — | C4 Step 4 |
| 6.2 기준 8 고령자 가독성 | — | A6 Step 5 |
| 6.2 기준 9 키패드 입력 | — | A7 Step 5 |
| 6.2 기준 10 용어 퀴즈 완주 | — | B5 Step 3·5 |
| 7절 F5 공백 (기본 input) | — | A3 Step 1 |
| 7절 F12 공백 (텍스트 입력칸) | — | A4 Step 1 |
| 4.3 미션 1개 확정 (목록 화면 없음) | — | S0 Step 2 — `missions.json` 은 객체 하나 |
| 11.1 계약 합의 | — | S0 Step 2·3 |
| 11.2 파일 소유권 | — 파일 구조표 | 각 Task의 Files 항목 |
| 11.3 스텁 | — | S0 Step 4 |
| 11.5 착수·통합 순서 | — 레인 구조도 | S0 → 레인 → S1 → S2 → Should → S3 |
| 11.6 남은 조율 지점 2개 | — | S1 Step 4(문구 대조), B4 Step 2(용어 대조) |
| 5.2 iOS STT 미지원 | — | C4 Step 6 |
| 5.2 마이크 보안 컨텍스트 | — | S0 Step 5·6 |
| 5.2 API 키 노출 | — | S0 Step 1(.gitignore), C2 Step 1 |
| 13절 SOL 레퍼런스 — 반영 R1~R11 | — | A1(F17 배치·R7), A2(홈 시작), A3(항목 순서·금액 크기·R8), A4(도움바 상시·라벨·R9), A7(키패드 구조·R2) |
| 13절 단순화 S1~S5 | — | A3(은행·계좌 두 화면, 취소 없음), A1(F17 분모 5) — 의도된 차이로 기록만 |
| 13절 제외 X1~X8 | — | 없음 — 만들지 않는다(아래 「안 다루는 SPEC 항목」) |
| 13.4 SOL에 오답 화면이 없다 | — | **A5** — F8은 레퍼런스에 베낄 대상이 없어 우리가 설계한다 |
| 12.1~12.5 팀 결정 5건 확정(2026-08-19) | — | A2·A3·B1 에 ✅ 로 표시. F11 Should·F16 오답 처리·은행명·비밀번호 제외·목표 표시 전부 반영됨 |

### 이 계획이 안 다루는 SPEC 항목

의도적으로 뺐다. SPEC에서 `[확인 필요]` 이거나 범위 밖이라 계획으로 만들 근거가 없다.

- **Q1 미션 개수 — 이제 미결이 아니다.** SPEC 4.3에서 **송금 1개**로 확정했다. 미션 목록·선택 화면을 만들지 않고, `missions.json` 은 객체 하나다. 두 번째 미션은 배열로 바꾸고 목록 화면을 붙이는 별도 작업이며 이 계획에 없다.
- **Q2 금융사기 예방 미션 — 이제 미결이 아니다.** SPEC 4.3에서 **이번 MVP 제외**로 확정했다. "중단이 정답"인 단계가 현재 `submit` 계약에 없어서, 넣으려면 `missions.json` 항목에 `stopIsCorrect: true` 를 더하고 `matches()` 를 고치는 별도 Task가 필요하다. 잔액 조회·거래내역도 같이 제외다.
- **Q7 배포 방식** — 로컬 `localhost` 만 전제. 공개 URL이 필요하면 별도 Task.
- **Q8·Q9 사용성 테스트 인원·심사 기준** — S2 Step 1을 "외부인 1명"으로 잠정 정했다. 팀이 다르게 정하면 그 Step만 고친다.
- **Q11 보호자 동반 시나리오** — 미고려. 사용자 혼자 쓰는 전제.
- **F16 오답 재시도 여부 — SPEC 12.2 확정: 설명 후 다음 문제.** B5 Step 1대로 구현한다. 다시 고를 기회를 주지 않는다. B(서정) 담당.
- **SOL 에는 있고 우리는 안 만드는 것** (SPEC 13.3 X1~X8): 송금 후 **메모 입력**, **다음 미션으로 이어가기**(미션이 1개다), **수수료 표시**, 가이드 사이트 껍데기, **금액 칩(`5만` 한 번 누르면 정답이 된다)**, **이체 후 잔액 감소·거래내역 쌓기**(저장 없음이 전제), **거래내역상세**, **빨간 점으로 다음 누를 곳 찍어 주기**(그게 F10 Won't 의 정체다). 넣자는 이야기가 나오면 3명·1일 범위부터 다시 본다.
- **F11 음성 낭독(TTS) — SPEC 12.1 확정: Should로 상향.** 이 계획에는 아직 세부 Task가 없다 — Must 레인(S0~S2) 완료 후, C(미리) 담당으로 답변 출력 경로(`showAnswer` 호출 지점)에 붙이는 Task를 그때 추가한다. 착수 전까지는 `speechSynthesis` 를 쓰지 않는다. 착수 시 `.claude/agents/code-reviewer.md` 검토 항목 4번도 같이 고쳐야 한다.
- **비밀번호 6자리 단계 — SPEC 12.4 확정: 이번 MVP 제외.** 이 계획의 흐름(`bank`→`account`→`amount`→`confirm`→`done`)에 인증 단계를 넣지 않는다.
- **은행명 — SPEC 12.3 확정: 가상 은행 `한걸음은행`(정답)·`새봄은행`·`푸른은행`(오답 선택지).** A2·A3·B1·C1의 은행명이 전부 이 값으로 맞춰져 있다.
- **목표 금액 표시 — SPEC 12.5 확정: 홈 화면에 한 번만.** `missions.json` 의 `title` 을 A2에서 "오늘의 미션 — 김민수에게 50,000원 보내기"로 띄운다. 각 단계 화면에는 반복하지 않는다(F10과 구분).
