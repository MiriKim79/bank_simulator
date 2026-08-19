# 인터페이스 계약 (2026-08-19 합의)

이 파일을 고치려면 세 사람이 같이 고친다. 혼자 바꾸면 다른 두 명 코드가 깨진다.

## 1. 화면 이름 8개 (그중 미션 단계는 6개)

미션 단계:  home → bank → account → amount → confirm → done
미션 아님:  intro  (첫 화면. 미션 안내만 보여주고 "송금 연습 시작"을 누르면 home 으로 간다. data-goto 로 전환하며 MissionEngine 을 부르지 않는다)
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
  `#screen-intro` `#screen-home` `#screen-bank` `#screen-account` `#screen-amount` `#screen-confirm` `#screen-done` `#screen-quiz`
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
- 퀴즈 진입 버튼: `#quiz-start` (완료 화면 안), `#quiz-start-intro` (인트로 화면 안, 4차 UI 확정·SPEC 13.6 U6).
  **둘 다 data-action 을 쓰지 않는다** — 미션 입력이 아니므로 상태머신에 가면 안 된다.
  둘 다 hidden 상태로 시작한다. B 의 `quiz.js` 가 로드되면 두 버튼을 같이 노출·배선한다
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
