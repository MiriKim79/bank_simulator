# screen/ — 화면 담당 (레인 A · 담당 영원)

> 이 파일은 **A 담당자만** 고친다.
> `screen/` 안의 파일을 Claude가 읽을 때 **자동으로 함께 읽힌다.**
> 그래서 여기 쓴 규칙은 **내 작업에만** 걸리고, 팀원에게는 안 걸린다.

## 이 폴더가 하는 일

화면에 무엇이 어디에 보이는가. 화면 9개·버튼·글자·배치·흔들림.

- `screen/bank-ui.html` — 화면 9개 DOM, `window.BankUI`, 클릭 위임, 도움바 DOM, `<script src>` 선언
- `screen/styles.css` — 색·크기·표시/숨김·흔들림·폰 셸·키패드

담당 Task: `plan.md` 의 A1~A5(Must), A6~A8(Should/Could).

## 내 규칙

- 색은 `styles.css` 맨 위 `:root` 커스텀 프로퍼티로만 정하고, **다크모드 오버라이드를 같이 넣는다**
- 새 애니메이션을 만들면 `@media (prefers-reduced-motion: reduce)` 선택자 목록에 **반드시 추가한다**
- **단계 이름·오답 문구를 이 폴더에 적지 않는다.** 진행 표시(F17) 문구는 `MissionEngine.getMission()` 의 `label` 에서 읽는다. 여기에 적으면 F6이 깨진다
- `<script src>` 5개를 **처음에 다 선언한다.** 아직 없는 파일은 404가 찍히지만 페이지는 돈다 — 이게 B·C가 이 폴더를 열지 않아도 되는 이유다
- 로드 순서를 바꾸지 않는다: 인라인 `BankUI` → `mission-engine.js` → `voice.js` → `ai-guide.js` → `quiz.js`
- `#screen-quiz` 는 **비워 둔다.** 안쪽은 `mission/quiz.js` 가 그린다
- `#quiz-start` 에는 `data-action` 을 붙이지 않는다. 미션 입력이 아니라서 상태머신에 가면 안 된다
- 화면을 바꿨으면 **브라우저에서 직접 열어 보고** 끝낸다. 코드만 보고 "됐다"고 하지 않는다

## 다른 폴더 파일을 부르는 경로

이 페이지가 진입점이라 상대 경로의 기준이 `screen/` 이다. `../` 를 붙인다.

```html
<script src="../shared/llm-config.js"></script>   <!-- 없으면 404, 정상 -->
<script src="../mission/mission-engine.js"></script>
<script src="../guide/voice.js"></script>
<script src="../guide/ai-guide.js"></script>
<script src="../mission/quiz.js"></script>
```

## 내가 부르기만 하는 것 (남의 것)

이 함수들은 `mission/` · `guide/` 소유다. 이름이나 동작을 바꾸지 않는다. 부르기만 한다.

```js
MissionEngine.submit({action, value})   // → {ok, step, message}
MissionEngine.getStep()
MissionEngine.getMission()              // label 을 읽어 진행 표시(F17)를 만든다
AIGuide.askAI(question, currentStep, mission)
Voice.isSupported()
Quiz.start()
```

바꿔야 하면 → **카톡으로 담당자에게 요청.** 내가 직접 고치지 않는다.

## 경계

- 고쳐도 되는 곳: `screen/` 안쪽 전부
- 읽어도 되는 곳: 전부
- **고치면 안 되는 곳**: `mission/`, `guide/`, `shared/`, 루트 `CLAUDE.md`, `OWNERS.md`
