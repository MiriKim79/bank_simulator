# guide/ — 답변·음성 담당 (레인 C · 담당 미리)

> 이 파일은 **C 담당자만** 고친다.
> `guide/` 안의 파일을 Claude가 읽을 때 **자동으로 함께 읽힌다.**

## 이 폴더가 하는 일

사용자가 막혔을 때 무슨 말을 돌려주는가. 그리고 마이크.

- `guide/qa-data.json` — 단계별로 미리 쓴 답변 + 키워드
- `guide/ai-guide.js` — `window.AIGuide.askAI` 폴백(F13) + 도움바 배선(F14)
- `guide/voice.js` — `window.Voice`. 음성 인식 (F12, Should)

담당 Task: `plan.md` 의 C1~C3(Must), C4(Should).

## 내 규칙

- **`askAI` 는 절대 reject 하지 않는다.** 어떤 실패든 안에서 삼키고 한국어 문장을 돌려준다 (SPEC 6.1 기준 3)
- 인자는 **3개**다: `askAI(question, currentStep, mission)`. 2개로 줄이지 않는다
- **단계 설명을 이 폴더에 다시 적지 않는다.** 미리 쓴 답변에 없으면 `mission` 인자(= `missions.json`)에서 만든다. 여기에 적으면 미션 내용이 두 곳에 생겨 F6이 깨진다
- 답변은 **화면 텍스트로만** 낸다. `speechSynthesis` 를 부르지 않는다 — F11(TTS)은 Should로 확정됐지만(SPEC 12.1) Must 레인 완료 전까지는 착수하지 않는다. Should 단계에서 만들 때도 담당은 C(미리)
- LLM은 기본 미연결이다. `window.LLM_CONFIG` 가 없으면 아예 시도하지 않고, 있으면 `AbortController` 로 5초에 끊는다
- **API 키를 이 폴더에 쓰지 않는다.** 키는 `shared/llm-config.js`(커밋 안 함)에만 둔다
- 도움바는 **`ai-guide.js` 안에서 스스로 배선한다.** `screen/bank-ui.html` 을 열지 않는다
- 마이크 버튼은 `Voice.isSupported()` 가 `true` 일 때만 `hidden` 을 벗긴다. iOS는 미지원이라 안 보이는 것이 정상이다

## 다른 폴더 파일을 읽는 경로

`fetch` 의 기준은 열려 있는 페이지(`screen/bank-ui.html`)다.

```js
fetch('../guide/qa-data.json')        // ← 'qa-data.json' 이라고 쓰면 404
```

## 내가 부르기만 하는 것 (남의 것)

```js
BankUI.showAnswer(text)
MissionEngine.getStep()
MissionEngine.getMission()   // askAI 3번째 인자로 그대로 넘긴다
```

내가 배선하는 DOM id는 A 소유다: `#help-ask` `#help-repeat` `#mic-button` `#question-box` `#question-text` `#question-send` `#ai-answer`.
**id 를 바꿔 달라고 하려면 카톡.** 내가 `bank-ui.html` 을 고치지 않는다.

## 경계

- 고쳐도 되는 곳: `guide/` 안쪽 전부
- 읽어도 되는 곳: 전부
- **고치면 안 되는 곳**: `screen/`, `mission/`, `shared/`, 루트 `CLAUDE.md`, `OWNERS.md`
