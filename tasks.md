# 작업 체크리스트 (tasks.md)

`plan.md` 를 실행용으로 잘게 쪼갠 목록이다. 코드와 자세한 확인 방법은 `plan.md` 의 같은 번호 Task를 본다.

**3인 병렬 구조.** S0이 끝나면 A·B·C가 **각자 자기 파일만** 고치며 동시에 끝까지 간다. S1까지 서로 부르지 않는다.

| 레인 | 담당 폴더 | Must | Should / Could |
|---|---|---|---|
| **A** 화면 | `screen/` — `bank-ui.html`, `styles.css` | A1~A5 | A6 F1 · A7 F5 · A8 F2(Could) |
| **B** 로직 | `mission/` — `missions.json`, `mission-engine.js`, `quiz-*` | B1~B3 | B4·B5 F16 |
| **C** 답변·음성 | `guide/` — `qa-data.json`, `ai-guide.js`, `voice.js` | C1~C3 | C4 F12 |
| 통합 | `shared/` — `CONTRACT.md`, `llm-config.js`(커밋 안 함) | — | — |

**폴더 하나 = 사람 하나. 자기 폴더 밖은 읽기만 한다.** 담당 표는 `OWNERS.md`, 내 폴더 규칙은 `내폴더/CLAUDE.md`.
담당·통합자는 아직 미정이므로 권한 deny 와 소유권 훅은 아직 안 켰다 — `OWNERS.md` 「담당이 정해지면 할 일」.

**진입 주소는 `http://localhost:8000/screen/bank-ui.html` 다.** 다른 폴더 파일은 `../mission/...` 처럼 `../` 를 붙인다.

**SPEC 3차 수정(2026-08-19) 반영분** — 아래 항목들이 이 목록에 들어와 있다.

| 무엇 | 어느 Task |
|---|---|
| `askAI(question, currentStep, mission)` 인자 3개 | 0.7, 0.10, C2.5b, C2.7b, C3.2b, S1.5c |
| `MissionEngine.getMission()` | 0.7, 0.9, B2.6b, B2.7b |
| F17 진행 표시 (`2 / 5 단계 — 계좌번호 입력`) | 0.3, A1.5b, A1.7, A1.9b, S1.5b, S2.8 |
| 미션은 송금 1개 (목록 화면 없음) | 0.3 |
| F16 오답 = 설명 후 다음 (정답 알려주고 잠금) | B5.5, B5.6, B5.12 |

**팀 결정 대기 5건은 SPEC 12절.** F11(TTS) 등급 · F16 오답 처리 · **은행명(실존→가상)** · **비밀번호 단계** · **목표 금액 표시**. 다섯 다 Must 구현을 막지 않으므로 **정해지기 전에는 이 목록의 지금 값 그대로 만든다.** 다만 **은행명(12.3)은 S0에서 정하는 게 싸다** — 나중에 정하면 세 폴더를 같이 고친다.

**UI/UX 레퍼런스는 신한 SOL뱅크 「돈 보내기」 체험**(SPEC 13절, 8화면 직접 확인). 흐름·입력 방식만 참고하고 **로고·브랜드명·색·아이콘은 복제하지 않는다.** SOL에 있어도 우리가 안 만드는 것: 메모, 다음 미션, 수수료, **금액 칩**, 잔액 감소·거래내역, **빨간 점으로 다음 누를 곳 찍어 주기**(= F10 Won't).

**SOL에는 오답 화면이 아예 없다**(정해진 한 경로만 따라간다). 그래서 **F8(오답 피드백)은 베낄 대상이 없고 A5에서 우리가 설계한다** — 이 서비스가 SOL 체험과 갈라지는 지점이다.

---

## S0 — 시작 전 합의 (셋이 같이, 30분)

### Task S0 — 계약 · missions.json · 스텁 · 서버 · git

- [ ] 0.1 `mkdir -p screen mission guide shared` (폴더는 이미 있다 — `OWNERS.md`). **`git init` 안 함** — 원격이 이미 있다. `git clone` 후 `git checkout develop`, **작업은 develop 에서 바로**
- [ ] 0.2 `.gitignore` 는 원격에 이미 있다. 빠진 두 줄(`shared/llm-config.js`, `_workspace/`)은 **통합자가 PR 로 추가** — 혼자 고치지 않는다
- [ ] 0.3 **`mission/missions.json` 을 셋이 같이 작성** — 단계 6개의 `step`/`action`/`value`/`next`/**`label`**. `wrong` 은 비워 둠 (B1에서 채움)
  - `label` = F17 진행 표시 문구. `home` 은 빈 문자열, 나머지 5개가 분모 5가 된다
  - **미션은 송금 1개.** 객체 하나로 쓰고 배열로 감싸지 않는다 (SPEC 4.3)
- [ ] 0.4 `shared/CONTRACT.md` — 화면 이름 7개(미션 단계 6개 + `quiz`)
- [ ] 0.5 `shared/CONTRACT.md` — 폴더 소유권 표(`OWNERS.md` 와 같은 값) + **경로 규칙**(다른 폴더는 `../폴더명/파일`)
- [ ] 0.6 `shared/CONTRACT.md` — `data-action` 값 8개, 입력칸·도움바·질문칸·퀴즈 버튼 id
- [ ] 0.7 `shared/CONTRACT.md` — `BankUI`/`MissionEngine`/`AIGuide`/`Voice`/`Quiz` 시그니처
  - **`AIGuide.askAI(question, currentStep, mission)` — 인자 3개.** 2개로 줄이면 단계 설명이 `ai-guide.js` 에 하드코딩되고 F6이 반쪽이 된다 (SPEC 8)
  - **`MissionEngine.getMission()`** — 미션 객체를 그대로 내준다. A는 `label`, C는 `askAI` 3번째 인자로 쓴다
- [ ] 0.8 `shared/CONTRACT.md` — 로드 순서(`../shared/llm-config.js` → 인라인 `BankUI` → `../mission/mission-engine.js` → `../guide/voice.js` → `../guide/ai-guide.js` → `../mission/quiz.js`)
- [ ] 0.9 **스텁** `mission/mission-engine.js` — 무엇을 눌러도 다음 단계로 + `getMission()` 이 `label` 붙은 가짜 미션 반환 (A가 F17을 바로 확인할 수 있게)
- [ ] 0.10 **스텁** `guide/ai-guide.js` — `askAI(question, step, mission)` 3인자로 `(스텁 답변)` 즉시 반환 + 도움바 최소 배선
- [ ] 0.11 **스텁** `guide/voice.js` — `isSupported()` 항상 `false`
- [ ] 0.12 `python3 -m http.server 8000` 실행
- [ ] 0.13 Chrome 으로 `http://localhost:8000/screen/bank-ui.html` 열어 스크립트 5개가 로드되는지 확인(없는 파일 404 는 정상)
- [ ] 0.14 `git pull` → 커밋 `chore(s0): 인터페이스 계약, missions.json, 스텁 3개` → `git push` (develop 에 바로)

> **게이트**: 세 사람이 `CONTRACT.md` 를 읽고 자기가 만들 함수 이름을 말로 다시 말할 수 있다. `missions.json` 의 `action` 값에 셋이 동의했다. **여기서 갈라진다.**

---

# A 레인 — 화면

### Task A1 — 화면 7개 껍데기 + BankUI + script 선언 5개

- [ ] A1.1 `screen/bank-ui.html` — `<section class="screen" id="screen-*">` 7개(`quiz` 포함) + `#ai-answer` + `#progress`(F17, `hidden`)
- [ ] A1.2 `<script src>` **를 지금 다 선언** — `../shared/llm-config.js` → `../mission/mission-engine.js` → `../guide/voice.js` → `../guide/ai-guide.js` → `../mission/quiz.js` 순. 없는 파일 404는 정상
- [ ] A1.3 `BankUI.showStep(name)` — 화면 7개, 모르는 값이면 `console.warn`
- [ ] A1.4 `BankUI.showAnswer(text)`
- [ ] A1.5 `BankUI.showError(message, selector)` 스텁 (A5에서 흔들림 추가)
- [ ] A1.5b **F17** `updateProgress(name)` — `MissionEngine.getMission()` 의 `label` 로 `n / 5 단계 — 이름`. `label` 없으면 숨김. `showStep` 끝에서 호출
  - **단계 이름을 이 파일에 적지 않는다.** 문구는 `missions.json` 에서만 온다 (F6)
- [ ] A1.6 `screen/styles.css` — `:root` 색상 변수 + `@media (prefers-color-scheme: dark)` 오버라이드
- [ ] A1.7 `screen/styles.css` — `.screen`/`.is-active`, 큰 버튼·큰 input 기본값, `#ai-answer`, `#progress`(작은 글씨 — 크게 만들면 F10 Won't 가 된다)
- [ ] A1.8 눈 확인 — 페이지 열면 "홈"만 보인다
- [ ] A1.9 콘솔 확인 — 7개 화면이 전부 `is-active` 로 전환된다
- [ ] A1.9b 콘솔 확인 — **F17**: `home` 빈칸 → `1 / 5 단계 — 은행 선택` … `5 / 5 단계 — 완료` → `quiz` 빈칸
- [ ] A1.10 콘솔 확인 — `showStep('없는화면')` 은 경고만, `showAnswer('')` 로 박스 사라짐
- [ ] A1.11 커밋 `feat(a1): 화면 7개 껍데기, BankUI, F17 진행 표시, script 선언 5개`

> **게이트**: 콘솔에서 7개 화면을 왕복할 수 있다. B·C가 자기 코드를 확인할 무대가 생겼다.

### Task A2 — F3 가상 홈 화면 · Must

- [ ] A2.1 `출금계좌` 라벨 + 가짜 계좌번호 `국민은행 123456-78-901234` — ⚠ 은행명은 **SPEC 12.3 팀 결정 대기**(실존 브랜드명). 정해지면 `missions.json`·`qa-data.json` 과 같이 고친다
- [ ] A2.2 `잔액 1,250,000 원`
- [ ] A2.3 버튼 3개 — `data-action="transfer"`(파란색) / `history` / `balance`
- [ ] A2.4 `styles.css` 에 `.label-sm`, `.account-no`, `.balance`
- [ ] A2.5 눈 확인 — 출금계좌·계좌번호·잔액·버튼 3개가 큼직하게 보인다
- [ ] A2.6 커밋 `feat(a2): F3 가상 홈 화면`

> **게이트**: `출금계좌`·`잔액`·`이체` 세 용어가 화면에 나왔다. F16 퀴즈가 이걸 묻는다.

### Task A3 — F4+F15 송금 화면 4개 + 완료 화면 + 기본 입력칸 · Must

- [ ] A3.1 `#screen-bank` — 국민/신한/농협 (`data-action="pick-bank" data-value`)
- [ ] A3.2 `#screen-account` — `#input-account` + `submit-account` + `수취인: 김민수` 표기
- [ ] A3.3 `#screen-amount` — `#input-amount` + `submit-amount`
- [ ] A3.4 `#screen-confirm` — 출금계좌·수취인·계좌번호 `11022233344`·`50,000 원` + `confirm`
- [ ] A3.5 `#screen-done` — "보냈습니다" + `restart` 버튼
- [ ] A3.6 `#screen-done` — **"연습이라 실제 돈은 움직이지 않았습니다" 문장 (빼지 말 것)**
- [ ] A3.7 `#screen-done` — `<button id="quiz-start" hidden>용어 복습하기</button>`. **`data-action` 없음, `hidden` 임**
- [ ] A3.8 `styles.css` 에 `.hint`
- [ ] A3.9 콘솔 확인 — 다섯 화면 `h1` 문구가 전부 출력된다
- [ ] A3.10 눈 확인 — 계좌번호 칸에 직접 타이핑된다
- [ ] A3.11 눈 확인 — 완료 화면에서 "용어 복습하기" 가 **안 보인다** (`quiz.js` 없음)
- [ ] A3.12 커밋 `feat(a3): F4+F15 송금 화면과 완료 화면, 기본 입력칸`

> **게이트**: SPEC 7절 "F5가 Should라서 생기는 입력 공백"이 기본 `<input>` 으로 메워졌다. 화면의 계좌·금액이 `missions.json` 값과 같다. 퀴즈가 묻는 다섯 용어가 전부 화면에 있다.

### Task A4 — 클릭 위임 배선 + F14 도움바 DOM · Must

- [ ] A4.1 `#help-bar` — `#mic-button`(**`hidden`**) / `#help-ask` / `#help-repeat`, 화면 `<section>` **밖**에
- [ ] A4.2 `#question-box`(`hidden`) — `#question-text` + `#question-send`
- [ ] A4.3 인라인 script 에 `[data-action]` 클릭 위임 리스너
- [ ] A4.4 `!window.MissionEngine` 가드 — 파일이 없어도 페이지가 죽지 않게
- [ ] A4.5 `submit-account`/`submit-amount` 는 버튼 대신 입력칸 `value` 를 읽기
- [ ] A4.6 `ok` 면 답변 비우기, `restart` 면 두 입력칸도 비우기
- [ ] A4.7 `ok` 아니면 `showError(r.message, '#screen-' + r.step)`
- [ ] A4.8 마지막에 `showStep(r.step)`
- [ ] A4.9 `styles.css` 에 `#help-bar`, `#question-box`, `[hidden]` 규칙
- [ ] A4.10 눈 확인 — 스텁 엔진으로 마우스 완주 + 입력칸 초기화
- [ ] A4.11 눈 확인 — 도움 버튼 2개가 **7개 화면 전부**에서 같은 자리에 보인다
- [ ] A4.12 눈 확인 — 마이크 버튼이 **안 보인다**
- [ ] A4.13 눈 확인 — "다시 설명해주세요" 에 `(스텁 답변) home 단계 ...` 가 뜬다
- [ ] A4.14 커밋 `feat(a4): 클릭 위임 배선과 F14 도움바 DOM`

> **게이트**: 마우스만으로 화면이 끝까지 돈다. C의 스텁 배선이 도는 것까지 A가 확인했다.

### Task A5 — F8 오답 피드백 화면 쪽 · Must

- [ ] A5.1 `styles.css` 에 `@keyframes shake` + `.shake`
- [ ] A5.2 **`@media (prefers-reduced-motion: reduce)` 에 `.shake { animation: none }` (빼지 말 것)**
- [ ] A5.3 `showError` 본문 — `remove('shake')` → `void offsetWidth` → `add('shake')`
- [ ] A5.4 콘솔 확인 — `showError('테스트','#screen-home')` 로 흔들림 + 메시지
- [ ] A5.5 콘솔 확인 — 0.5초 간격 3연속 호출에 3번 다 흔들린다 (리플로우 줄 검증)
- [ ] A5.6 눈 확인 — `prefers-reduced-motion: reduce` 에뮬레이션 시 흔들림만 사라지고 설명은 남는다
- [ ] A5.7 커밋 `feat(a5): F8 오답 피드백 화면 쪽`

> **게이트**: **A의 Must 레인 끝. S1로 간다.** 기다리는 동안 A6 시작 가능.

---

# B 레인 — 로직

### Task B1 — F6 미션 데이터 완성 · Must

- [ ] B1.1 `missions.json` 의 `home` `wrong` — 왜 틀렸는지 + "이체" 를 누르라고
- [ ] B1.2 `bank` `wrong` — 김민수님 은행이 국민은행이라고 (⚠ 은행명 **SPEC 12.3** 대기)
- [ ] B1.3 `account` `wrong` — `11022233344`, 작대기 안 넣어도 된다고
- [ ] B1.4 `amount` `wrong` — 5만원 = `50000`, 0 네 개
- [ ] B1.5 `confirm` `wrong` — "보내기" 를 누르라고
- [ ] B1.6 `done` `wrong` — "다시 연습하기" 를 누르라고
- [ ] B1.7 파싱·완성도 확인 — `6 단계` 이고 빈 `wrong` 이 하나도 없다
- [ ] B1.8 커밋 `feat(b1): F6 미션 데이터 - 오답 문구 6개`

> **게이트**: 모든 `wrong` 에 **왜 틀렸는지와 무엇을 눌러야 하는지 둘 다** 들어 있다. 이 파일은 이제 B만 고친다.

### Task B2 — F7 미션 상태머신 · Must

- [ ] B2.1 스텁 `mission-engine.js` **내용 전체 교체** (파일 새로 만들지 않음)
- [ ] B2.2 `fetch('../mission/missions.json')` + 로딩 전 최소 기본값 1단계 + `isLoaded()` — **`../` 없으면 404**(경로 기준은 열려 있는 페이지 `screen/`)
- [ ] B2.3 형식 이상(steps 6개 아님)·로딩 실패 시 기본값 유지 + `console.warn`
- [ ] B2.4 `digits(v)` — 콤마·공백 제거
- [ ] B2.5 `matches()` — 숫자 정답은 `digits` 비교, 문자 정답은 그대로
- [ ] B2.6 `getStep()` / `submit({action,value})` → `{ok, step, message}` / `reset()`
- [ ] B2.6b `getMission()` — 읽은 미션 객체를 **가공하지 않고 그대로** 반환. 로딩 전이면 기본값 객체 (A의 F17·C의 askAI 가 이걸 쓴다)
- [ ] B2.7 콘솔 확인 — `MissionEngine.isLoaded()` 가 `true`
- [ ] B2.7b 콘솔 확인 — `getMission().steps` 의 `label` 6개가 `missions.json` 값과 같다 (`home` 만 빈 문자열)
- [ ] B2.8 콘솔 확인 — 정상 6단계 전부 `ok:true`
- [ ] B2.9 콘솔 확인 — `50,000` 처럼 콤마를 넣어도 통과
- [ ] B2.10 콘솔 확인 — 오답(`history`)을 내도 `step` 이 `home` 에 머문다 + B1 문구가 나온다
- [ ] B2.11 콘솔 확인 — 계좌번호 `99999` 면 `account` 에 머문다
- [ ] B2.12 눈 확인 — (A4가 끝났으면) 홈에서 "거래내역" 누르면 화면 그대로 + B1 문구. 아니면 S1로 넘김
- [ ] B2.13 커밋 `feat(b2): F7 미션 상태머신 - missions.json 기반 판정`

> **게이트**: 화면 없이도 콘솔만으로 미션 전체를 시뮬레이션할 수 있다. 오답이 절대 단계를 넘기지 않는다.

### Task B3 — 미션 데이터 교체 검증 + 로딩 실패 방어 · Must

- [ ] B3.1 `missions.json` 의 `amount` `value` 를 `"30000"` 으로 바꾸고 새로고침
- [ ] B3.2 콘솔 확인 — 5만원은 `ok:false`, 3만원은 `ok:true`. **JS 한 줄도 안 고쳤다**
- [ ] B3.3 **`value` 를 `"50000"` 으로, `wrong` 을 B1 문구로 원복** (확인 화면 표시 금액과 어긋나지 않게)
- [ ] B3.4 원복 확인 — `value= 50000`
- [ ] B3.5 `mv mission/missions.json mission/missions.json.bak` 후 새로고침
- [ ] B3.6 콘솔 확인 — 경고는 뜨지만 페이지가 살아 있고 홈→은행 전환은 된다. 하얗게 죽으면 실패
- [ ] B3.7 `mv mission/missions.json.bak mission/missions.json` 원복
- [ ] B3.8 커밋 `test(b3): 미션 데이터 교체 검증과 로딩 실패 방어`

> **게이트**: **B의 Must 레인 끝. S1로 간다.** SPEC 6.1 기준 6이 성립한다. 기다리는 동안 B4 시작 가능.

---

# C 레인 — 답변·음성

### Task C1 — 미리 쓴 답변 데이터 · Must

- [ ] C1.1 `guide/qa-data.json` — `default` 답변 1개
- [ ] C1.2 `byStep.home` — 이체 / 잔액 / 출금계좌 / **막힘대응**
- [ ] C1.3 `byStep.bank` — 은행 / **막힘대응**
- [ ] C1.4 `byStep.account` — 계좌번호 / 하이픈 / 수취인 / **막힘대응**
- [ ] C1.5 `byStep.amount` — 5만원 / 0 개수 / **막힘대응**
- [ ] C1.6 `byStep.confirm` — 확인 / **막힘대응**
- [ ] C1.7 `byStep.done` — 다시 / 실제 돈 / **막힘대응**
- [ ] C1.8 커버리지 확인 — 6단계 모두 `막힘대응 OK`
- [ ] C1.9 커밋 `feat(c1): 단계별 미리 쓴 답변과 막힘 대응 문구`

> **게이트**: 6단계 전부에 `무엇/뭐/어떻게/모르` 항목이 있다. 하나라도 없으면 그 단계에서 사용자가 멈춘다 (SPEC 6.1 기준 5).

### Task C2 — F13 askAI 폴백 인터페이스 · Must

- [ ] C2.1 스텁 `ai-guide.js` 의 `window.AIGuide` 부분 교체 (배선은 C3에서)
- [ ] C2.2 `fetch('../guide/qa-data.json')` + 실패 시 최소 기본값 — **`../` 없으면 404**
- [ ] C2.3 `matchLocal()` — 키워드 히트 수 최대인 답변, 0이면 `null`
- [ ] C2.4 `tryLLM()` — `window.LLM_CONFIG` 없으면 즉시 `null`, 있으면 `AbortController` 5초
- [ ] C2.5 `askAI(question, step, mission)` — **인자 3개.** LLM → 미리 쓴 답변 → `fromMission` → 기본 답변. **절대 reject 하지 않게** `.catch` 로 감싸기
- [ ] C2.5b `fromMission(step, mission)` — `missions.json` 의 `label`·`value`·`wrong` 으로 답변을 만든다. **단계 설명을 이 파일에 직접 쓰지 않는다** (F6)
- [ ] C2.5c `tryLLM` 이 `mission` 도 body 에 실어 보낸다 (`mission: mission || null`)
- [ ] C2.6 콘솔 확인 — `home`/`account`/`amount` 답변이 서로 다르다
- [ ] C2.7 콘솔 확인 — **6단계 전부** "지금 무엇을 해야 하나요" 에 단계별 답이 나오고 `default` 로 안 떨어진다
- [ ] C2.7b 콘솔 확인 — **mission 인자가 실제로 쓰이는가**: `askAI('zzzz','account',M)` 과 `askAI('zzzz','account')` 의 답이 **다르다**. 앞쪽에 `missions.json` 의 `11022233344` 가 들어 있다. 같으면 3번째 인자를 안 쓰는 것
- [ ] C2.8 콘솔 확인 — "오늘 날씨"·빈 문자열은 `default` 로 떨어지고 빨간 에러가 없다
- [ ] C2.9 콘솔 확인 — 죽은 endpoint 를 넣어도 5초 안에 폴백 답변이 나온다
- [ ] C2.10 `LLM_CONFIG` 원복 + 새로고침
- [ ] C2.11 커밋 `feat(c2): F13 askAI 폴백 인터페이스`

> **게이트**: SPEC 6.1 기준 3의 절반. LLM이 없거나 죽어도 항상 한국어 문장이 나온다. API 키는 어디에도 없다.

### Task C3 — F14 도움바 배선 · Must

- [ ] C3.1 스텁 배선 IIFE 를 교체. **`bank-ui.html` 을 열지 않는다**
- [ ] C3.2 `ask(question)` — `MissionEngine.getStep()` 으로 단계 얻고, 대기 중 "생각 중입니다..."
- [ ] C3.2b `currentMission()` — `MissionEngine.getMission()` 을 `askAI` 3번째 인자로 넘긴다. **C가 단계 설명을 따로 들고 있지 않는다**
- [ ] C3.3 `#help-repeat` → `ask('지금 무엇을 해야 하나요')`
- [ ] C3.4 `#help-ask` → 질문 입력칸 열기 + 안내 문구
- [ ] C3.5 `#question-send` → 값 읽고 비우고 닫은 뒤 `ask`
- [ ] C3.6 `#question-text` 에서 Enter 로도 보내기
- [ ] C3.7 `#mic-button` — `Voice.isSupported()` 가 `true` 일 때만 `hidden` 벗기고 배선
- [ ] C3.8 마이크 `onError` 분기 — `no-speech` 재시도 안내 / `denied`·`error` 는 텍스트 폴백
- [ ] C3.9 눈 확인 — "다시 설명해주세요" 답변이 홈과 은행 화면에서 다르다
- [ ] C3.10 눈 확인 — 텍스트로 물어보면 답이 나오고 입력칸이 정리된다. Enter 도 동작
- [ ] C3.11 눈 확인 — 마이크 버튼이 **안 보인다** (`voice.js` 스텁)
- [ ] C3.12 눈 확인 — **낭독 소리가 없다** (F11 Won't)
- [ ] C3.13 커밋 `feat(c3): F14 도움바 배선 - 텍스트 질문 왕복`

> **게이트**: **C의 Must 레인 끝. S1로 간다.** SPEC 6.1 기준 2가 성립한다.

---

## S1 — 합류 (셋이 같이)

### Task S1 — 스텁 교체 확인 + 완주

- [ ] S1.1 `grep -l '\[스텁\]' mission/*.js guide/*.js` → **`guide/voice.js` 만** 나와야 한다
- [ ] S1.2 눈 확인 — 마우스만으로 홈→완료→홈 완주, 입력칸 초기화
- [ ] S1.3 눈 확인 — 홈에서 "거래내역": 화면 그대로 + 흔들림 + B1 문구
- [ ] S1.4 눈 확인 — 은행에서 "신한은행": 화면 그대로 + 국민은행 안내
- [ ] S1.5 눈 확인 — 금액 `30000` 막히고 `50000` 로 고치면 통과
- [ ] S1.5b 눈 확인 — **F17**: 완주하며 `1 / 5` → `5 / 5` 가 뜬다. `missions.json` 의 `label` 을 바꾸면 화면도 바뀐다 (확인 후 원복). 안 바뀌면 A가 단계 이름을 하드코딩한 것
- [ ] S1.5c 콘솔 확인 — **mission 인자**: `askAI('zzzz','account',getMission())` 과 3번째 인자 없는 호출의 답이 다르다. 같으면 C3의 배선이 안 넘기고 있다
- [ ] S1.6 **대조** — `qa-data.json` 의 따옴표 문구가 `bank-ui.html` 화면 글자와 같은지 스크립트로 확인. `없음!!` 이면 C가 고친다
- [ ] S1.7 눈 확인 — 마이크 버튼과 "용어 복습하기" 가 **둘 다 안 보인다** (Should 미착수)
- [ ] S1.8 커밋 `chore(s1): 세 레인 합류, 스텁 교체 확인`

> **게이트**: 세 레인이 붙었고 완주된다. 안 되면 담당자가 자기 레인으로 돌아간다.

---

## S2 — Must 합격 판정 (셋이 같이, 코드 안 씀)

### Task S2 — SPEC 6.1 기준 1~6

- [ ] S2.1 기준 1 — 팀원 아닌 사람 1명에게 설명 없이 시켜 완료 화면까지 가는지
- [ ] S2.2 기준 2 — 텍스트로 질문 → 화면 텍스트 답변. 낭독 소리 없음
- [ ] S2.3 기준 3 — `window.LLM_CONFIG` 가 `undefined` 인 상태로 1·2 통과
- [ ] S2.4 기준 3 — DevTools Offline 에서도 화면이 하얗게 죽지 않는다
- [ ] S2.5 기준 4 — 6단계 전부 오답 시 화면 고정 + 흔들림 + 왜/무엇 안내
- [ ] S2.6 기준 5 — 6단계 전부 "다시 설명해주세요" 답변만 읽고 다음으로 갈 수 있다
- [ ] S2.7 부족한 단계가 있으면 C가 `qa-data.json` 고치고 S2.6 다시
- [ ] S2.8 기준 6 — `missions.json` **하나만** 고쳐(`value` 50000→70000, `label` 금액 입력→보낼 돈 입력) **세 곳이 다 따라오는지** 확인 후 원복
  - 판정(B): `70000` 이 정답이 된다 / 진행 표시(A·F17): `3 / 5 단계 — 보낼 돈 입력` / AI 답변(C): 답에 `70000` 이 나온다
  - 하나라도 옛 값이면 그 파일에 미션 내용이 하드코딩된 것이다
- [ ] S2.9 `shared/CHECK.md` 에 6개 기준 결과 표로 기록
- [ ] S2.10 커밋 `docs(s2): Must 합격 판정 결과`

> **게이트**: 여섯 기준 모두 통과. **여기까지가 MVP다. 못 넘기면 Should로 가지 않는다.**

---

# Should — 세 레인 다시 병렬

### Task A6 — F1 폰 셸 + 큰 글씨·큰 버튼 · Should

- [ ] A6.1 `#phone` 을 `<div id="shell">` 으로 감싸기
- [ ] A6.2 `styles.css` 에 `#shell` (어두운 프레임·둥근 모서리·그림자)
- [ ] A6.3 `#shell #phone` 안의 글씨·버튼·입력칸 크기 올리기
- [ ] A6.4 `@media (max-width: 460px)` 에서 프레임 없애고 전체 화면
- [ ] A6.5 눈 확인 — 폰처럼 보이고 글씨·버튼이 커졌다
- [ ] A6.6 눈 확인 — Device Toolbar 390px 에서 가로 스크롤바가 안 생긴다
- [ ] A6.7 눈 확인 (기준 8) — 팔 뻗은 거리에서 버튼 글씨가 읽힌다
- [ ] A6.8 커밋 `feat(a6): F1 폰 셸과 고령자용 큰 글씨/큰 버튼`

### Task A7 — F5 큰 숫자 키패드 · Should

- [ ] A7.1 `#screen-account` 에 `.keypad[data-target="input-account"]` 12버튼
- [ ] A7.2 `#screen-amount` 에 `.keypad[data-target="input-amount"]` 로 같은 12버튼
- [ ] A7.3 `data-key` 전용 클릭 리스너 (`data-action` 리스너와 별개)
- [ ] A7.4 `clear` / `back` / 숫자 처리
- [ ] A7.5 `styles.css` 에 `.keypad` 3열 그리드
- [ ] A7.6 눈 확인 — 숫자가 쌓이고 `← 지움`·`전체지움` 동작
- [ ] A7.7 눈 확인 (기준 9) — **키보드를 아예 안 쓰고** 마우스만으로 완주
- [ ] A7.8 커밋 `feat(a7): F5 큰 숫자 키패드`

### Task A8 — F2 용어 병기 라벨 · Could

- [ ] A8.1 홈 버튼 3개에 `<small>` — 이체/돈 보내기, 거래내역/들어오고 나간 기록, 잔액조회/남은 돈 보기
- [ ] A8.2 `styles.css` 에 `button small`
- [ ] A8.3 눈 확인 — 큰 글씨는 실제 용어, 작은 글씨가 쉬운 말
- [ ] A8.4 눈 확인 — `data-action` 을 안 건드렸으니 미션이 그대로 진행된다
- [ ] A8.5 커밋 `feat(a8): F2 용어 병기 라벨`

### Task B4 — F16 퀴즈 문항 데이터 · Should

- [ ] B4.1 `mission/quiz-data.json` — 문항 5개 (이체 / 출금계좌 / 계좌번호 / 잔액 / 수취인)
- [ ] B4.2 각 문항에 `q` / `choices` 4개 / `answer` / `why`
- [ ] B4.3 `answer` 를 전부 `0` 으로 고정 (화면에서 섞는다. 검수하기 쉽게)
- [ ] B4.4 `why` 에 쉬운 말 설명 + 송금 화면 어디에 있었는지
- [ ] B4.5 **대조** — 정답 용어 5개가 `bank-ui.html` 에 실제로 있는지 스크립트로 확인
- [ ] B4.6 `없음!!` 이면 문항을 바꾸거나 A에게 화면 라벨 추가 요청
- [ ] B4.7 커밋 `feat(b4): F16 퀴즈 문항 5개`

> **게이트**: SPEC 6.2 기준 10의 "송금 6단계에서 실제로 화면에 등장한 용어만" 조건이 스크립트로 검증됐다.

### Task B5 — F16 퀴즈 엔진 + 화면 · Should

- [ ] B5.1 `mission/quiz.js` 생성. **`bank-ui.html` 을 열지 않는다** (A가 `#screen-quiz` 를 비워 뒀다)
- [ ] B5.2 `fetch('../mission/quiz-data.json')` — 성공 시에만 `#quiz-start` 의 `hidden` 벗기기
- [ ] B5.3 `render()` — 진행 표시 `n / 5`, 문제, 보기 버튼 4개
- [ ] B5.4 `render()` — 보기 순서 섞기 (Fisher-Yates)
- [ ] B5.5 `answer()` — 정답이면 `맞았습니다 + why`, 오답이면 **`아닙니다. 정답은 "○○" 입니다.` + `why`**
- [ ] B5.6 `answer()` — 보기 버튼 `disabled`. 이 잠금이 **"다시 선택 없음"** 을 만든다 (SPEC 4.1 F16 확정값 · 뒤집기는 SPEC 12.2)
- [ ] B5.7 `answer()` — "다음 문제" / 마지막은 "끝내기" → `BankUI.showStep('done')`
- [ ] B5.8 `#quiz-start` 클릭 배선을 `quiz.js` 안에서 스스로
- [ ] B5.9 눈 확인 — 완료 화면에 "용어 복습하기" 가 **이제 보인다**
- [ ] B5.10 눈 확인 — 5문제 완주하고 완료 화면으로 돌아온다
- [ ] B5.11 눈 확인 — 두 번 들어가면 1번 문제의 보기 순서가 다르다
- [ ] B5.12 눈 확인 — 오답을 골라도 **정답과 설명**이 나오고, 보기 4개가 잠겨 **다시 고를 수 없다**
- [ ] B5.13 눈 확인 — 퀴즈 후 "다시 연습하기" 로 송금 미션이 정상 동작 (상태머신 안 깨짐)
- [ ] B5.14 커밋 `feat(b5): F16 금융용어 미니 퀴즈`

### Task C4 — F12 마이크 질문 STT · Should

- [ ] C4.1 스텁 `voice.js` **내용 전체 교체**
- [ ] C4.2 `window.SpeechRecognition || window.webkitSpeechRecognition` 잡고 `isSupported()`
- [ ] C4.3 `startListening()` — `lang='ko-KR'`, `interimResults=false`, 중복 클릭 방지
- [ ] C4.4 `onerror` 를 `no-speech` / `denied` / `error` 로 분류, 미지원은 `unsupported`
- [ ] C4.5 콘솔 확인 — `Voice.isSupported()` 가 `true`
- [ ] C4.6 눈 확인 — 마이크 버튼이 **이제 보인다** (C3 배선이 `hidden` 을 벗김)
- [ ] C4.7 귀+눈 확인 (기준 7) — 말로 물으면 답이 **화면 텍스트로** 뜬다. 낭독 소리 없음
- [ ] C4.8 눈 확인 — 마이크를 "차단" 하면 텍스트 폴백이 열리고, 텍스트로도 답이 나온다
- [ ] C4.9 마이크 "허용" 으로 원복
- [ ] C4.10 콘솔 확인 — `var SR = null;` 로 잠깐 바꿔 새로고침하면 마이크 버튼이 다시 숨는다 (iOS 재현). 확인 후 원복
- [ ] C4.11 커밋 `feat(c4): F12 마이크 STT와 미지원·거부 폴백`

---

## S3 — 발표 준비 (셋이 같이)

### Task S3 — 시연 리허설과 사고 대비

- [ ] S3.1 `shared/CHECK.md` 맨 위에 시연 절차 4줄 (서버 → URL → 마이크 허용 → `file://` 금지)
- [ ] S3.2 눈 확인 — 브라우저·서버 다 껐다 켜고 절차대로만 해서 완주
- [ ] S3.3 절차에 없던 행동이 필요했으면 절차에 추가
- [ ] S3.4 눈 확인 — 마이크 "차단" 상태에서도 텍스트 폴백으로 완주
- [ ] S3.5 눈 확인 — DevTools Offline 상태에서도 화면이 살아 있다
- [ ] S3.6 `CHECK.md` 에 Q3(LLM 경로) 답변 준비 — "지금은 미리 쓴 답변으로만 동작한다"
- [ ] S3.7 `CHECK.md` 에 **리스크 4 답변 준비** — F12 Should + F11 Won't 라 MVP에 음성이 없다. "AI를 어디에 썼나"에 F13·F16으로 답할 문장을 미리 정할 것
- [ ] S3.8 커밋 `docs(s3): 시연 절차와 사고 대비 리허설 결과`

---

## 진행 현황 한 눈에

| 구분 | Task | 담당 | 기능 | 등급 | 상태 |
|---|---|---|---|---|---|
| S0 | 계약·missions.json·스텁 | 셋이 | — | — | ☐ |
| A | A1 화면 7개 껍데기 + 진행 표시 | A | F4 기반 · **F17** | Must | ☐ |
| A | A2 홈 화면 | A | F3 | Must | ☐ |
| A | A3 송금·완료 화면 | A | F4+F15 | Must | ☐ |
| A | A4 배선 + 도움바 DOM | A | F14 | Must | ☐ |
| A | A5 오답 흔들림 | A | F8 | Must | ☐ |
| B | B1 미션 데이터 문구 | B | F6·F8 | Must | ☐ |
| B | B2 상태머신 + `getMission` | B | F7 · F6 | Must | ☐ |
| B | B3 데이터 교체 검증 | B | F6 | Must | ☐ |
| C | C1 답변 데이터 | C | F13 | Must | ☐ |
| C | C2 askAI 폴백 (인자 3개) | C | F13 · F6 연결 | Must | ☐ |
| C | C3 도움바 배선 | C | F14 | Must | ☐ |
| S1 | 합류·완주 | 셋이 | — | — | ☐ |
| S2 | Must 합격 판정 | 셋이 | 기준 1~6 | — | ☐ |
| A | A6 폰 셸 | A | F1 | Should | ☐ |
| A | A7 숫자 키패드 | A | F5 | Should | ☐ |
| A | A8 용어 병기 | A | F2 | Could | ☐ |
| B | B4 퀴즈 문항 | B | F16 | Should | ☐ |
| B | B5 퀴즈 엔진 | B | F16 | Should | ☐ |
| C | C4 마이크 STT | C | F12 | Should | ☐ |
| S3 | 시연 리허설 | 셋이 | — | — | ☐ |

**S2까지가 MVP다.** Must 7항목 = F3 · F4+F15 · F6 · F7 · F8 · F13 · F14.

---

## 안 하는 것 (Won't · 확인 필요)

체크리스트에 없는 이유를 적어 둔다. "빠뜨렸나?" 하고 다시 찾지 않게.

- **F9 반복 오답 힌트 상승 / F10 단계별 안내 배너 / F11 음성 낭독(TTS)** — SPEC 10절 Won't. 만들지 않는다. 특히 `speechSynthesis` 를 호출하는 코드가 들어가면 안 된다.
  - **F10 ≠ F17.** F17(진행 표시)은 만든다. F10은 "무엇을 하세요"라는 큰 지시 배너이고, F17은 "2 / 5 단계 — 계좌번호 입력"이라는 작은 위치 표시다 (SPEC 4.1).
  - **F11은 등급 재검토 대기**(SPEC 12.1). Should로 올라가면 C의 답변 출력 지점에 붙이는 Task가 하나 생기고, `code-reviewer` 서브에이전트의 `speechSynthesis` 무조건 지적 규칙도 같이 고쳐야 한다. **올라가기 전까지는 쓰지 않는다.**
- **미션 개수 (구 Q1)** — **송금 1개로 확정**(SPEC 4.3). 미션 목록·선택 화면 없음. `missions.json` 은 객체 하나. 두 번째 미션은 배열로 바꾸고 목록 화면을 붙이는 별도 작업이다.
- **금융사기 예방 미션 (구 Q2)** — **이번 MVP 제외로 확정**(SPEC 4.3). "중단이 정답"인 단계가 `submit` 계약에 없다. 넣으려면 `missions.json` 에 `stopIsCorrect: true` + `matches()` 수정이라는 별도 Task가 필요하다. 잔액 조회·거래내역도 같이 제외.
- **Q3·Q4 LLM 경로·API 키** — 미정. C2가 `LLM_CONFIG` 자리만 비워 뒀다. 정해지면 `shared/llm-config.js` 하나만 추가하면 되고, 그 파일은 이미 `.gitignore` 에 있다.
- **Q7 배포 방식** — 로컬 `localhost` 만 전제.
- **Q8·Q9 사용성 테스트 인원·심사 기준** — S2.1을 "외부인 1명" 으로 잠정 정했다. 팀이 다르게 정하면 그 줄만 고친다.
- **Q11 보호자 동반 시나리오** — 미고려.
- **SOL 에는 있고 우리는 안 만드는 것** (SPEC 13.3): 송금 후 **메모**, **다음 미션 이어가기**(미션 1개), **수수료 표시**, 가이드 사이트 껍데기.
- **6자리 비밀번호 단계** — **SPEC 12.4 팀 결정 대기.** 지금은 없다. **SOL 쉬운이체에도 없다**(화면 확인 · SPEC 13.5 정정 2) — 즉 지금 흐름이 레퍼런스와 같다. 넣으면 단계 7개, F17 분모 6이 되고, 가짜 화면에 비밀번호를 넣는 습관을 만들 위험도 있다.
- **목표 금액 화면 표시** — **SPEC 12.5 팀 결정 대기.** 지금은 화면에 없고 사람이 말로 준다("김민수에게 5만원을 보내 보세요").
- **F16 오답 재시도** — **SPEC 12.2 팀 결정 대기.** SPEC 확정값 "설명 후 다음 문제"로 구현한다(B5.5·B5.6). 뒤집으면 `answer()` 의 버튼 잠금 하나만 고친다. B 담당.
