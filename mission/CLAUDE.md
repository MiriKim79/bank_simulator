# mission/ — 로직 담당 (레인 B · 담당 `[미정]`)

> 이 파일은 **B 담당자만** 고친다.
> `mission/` 안의 파일을 Claude가 읽을 때 **자동으로 함께 읽힌다.**

## 이 폴더가 하는 일

무엇이 정답인가, 틀리면 무슨 말을 하는가. 그리고 용어 퀴즈.

- `mission/missions.json` — 단계 6개의 `action`·`value`·`next`·`label`·`wrong` (**미션은 송금 1개, 객체 하나**)
- `mission/mission-engine.js` — `window.MissionEngine`. 판정과 단계 전진
- `mission/quiz-data.json` — 용어 퀴즈 문항 5개 (F16, Should)
- `mission/quiz.js` — `window.Quiz`. `#screen-quiz` 안을 직접 그린다 (F16, Should)

담당 Task: `plan.md` 의 B1~B3(Must), B4~B5(Should).

## 내 규칙

- **단계·정답·오답 문구·`label` 은 `missions.json` 에만 있다.** `mission-engine.js` 에 하드코딩하지 않는다 (F6 Must)
- `missions.json` 을 배열로 감싸지 않는다. 미션 목록 화면은 이번 MVP에 없다 (SPEC 4.3)
- `label` 을 지우거나 순서를 바꾸지 않는다. A의 진행 표시(F17) 번호가 배열 순서에서 나온다
- `getMission()` 은 읽은 객체를 **가공하지 않고 그대로** 내준다. 요약하면 C의 `askAI` 가 근거를 잃는다
- 로딩 전·로딩 실패에도 예외를 던지지 않는다. `missions.json` 이 없어도 페이지는 살아 있어야 한다
- 오답이 단계를 넘기지 않는 것을 매번 확인한다. 이게 F7·F8의 핵심이다
- `quiz.js` 는 **`screen/bank-ui.html` 을 열지 않는다.** A가 비워 둔 `#screen-quiz` 안에 DOM을 만들어 넣는다
- `quiz-data.json` 로딩이 성공할 때만 `#quiz-start` 의 `hidden` 을 벗긴다. 죽은 버튼을 보이지 않게

## 다른 폴더 파일을 읽는 경로

`fetch` 의 기준은 **스크립트 파일이 아니라 열려 있는 페이지**(`screen/bank-ui.html`)다. 그래서 `../` 가 필요하다.

```js
fetch('../mission/missions.json')     // ← 'missions.json' 이라고 쓰면 screen/ 에서 찾다가 404
fetch('../mission/quiz-data.json')
```

## 내가 부르기만 하는 것 (남의 것)

```js
BankUI.showStep(name)      // quiz.js 가 완료 화면으로 돌아갈 때
BankUI.showAnswer(text)
```

`#screen-quiz` · `#quiz-start` 는 A가 만든 DOM id다. **id 를 바꿔 달라고 하려면 카톡.**

## 경계

- 고쳐도 되는 곳: `mission/` 안쪽 전부
- 읽어도 되는 곳: 전부
- **고치면 안 되는 곳**: `screen/`, `guide/`, `shared/`, 루트 `CLAUDE.md`, `OWNERS.md`
