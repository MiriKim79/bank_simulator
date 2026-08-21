var DEFAULT_ANSWER = '지금 화면에서 큰 버튼을 하나 누르면 다음으로 넘어가요.';
var qaDataPromise = null;

// 발표용 MVP 임시 조치: STT(F12)/TTS(F11) 구현은 남겨두되 사용자 화면에는 노출하지 않는다.
// 실제 Chrome QA에서 TTS 앞부분 잘림, STT 인식 후 답변 연결 불안정 문제가 확인돼 시연 안정성
// 우선으로 껐다 — 코드는 그대로 두고 이 플래그만 true로 되돌리면 다시 켤 수 있다.
var STT_TTS_ENABLED = false;

function loadQaData() {
  if (qaDataPromise) return qaDataPromise;
  qaDataPromise = fetch('../guide/qa-data.json')
    .then(function (res) { return res.json(); })
    .catch(function () {
      qaDataPromise = null; // 실패는 기억하지 않는다 — 다음 질문에서 다시 fetch 를 시도한다
      return null;
    });
  return qaDataPromise;
}

function normalize(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, '');
}

function matchKeywords(stepData, question) {
  var q = normalize(question);
  var best = null;
  var bestHits = 0;
  if (q && stepData.items) {
    for (var i = 0; i < stepData.items.length; i++) {
      var item = stepData.items[i];
      var hits = 0;
      var keywords = item.keywords || [];
      for (var k = 0; k < keywords.length; k++) {
        if (q.indexOf(normalize(keywords[k])) !== -1) hits++;
      }
      if (hits > bestHits) {
        bestHits = hits;
        best = item;
      }
    }
  }
  return best ? best.answer : null;
}

// missions.json 의 wrong 문구를 그대로 쓴다 — 계좌번호·금액·은행명 같은 미션 값을
// 여기에 다시 적으면 F6(미션이 데이터로 분리됨)이 깨진다.
function fromMission(step, mission) {
  var steps = mission && mission.steps;
  if (!steps) return null;
  for (var i = 0; i < steps.length; i++) {
    if (steps[i].step === step && steps[i].wrong) return steps[i].wrong;
  }
  return null;
}

function matchLocal(qaData, question, step, mission) {
  if (!qaData) return fromMission(step, mission) || DEFAULT_ANSWER;
  var stepData = qaData.byStep && qaData.byStep[step];
  if (!stepData) return qaData.default || DEFAULT_ANSWER;

  var hit = matchKeywords(stepData, question);
  if (hit) return hit;
  return fromMission(step, mission) || stepData.fallback || qaData.default || DEFAULT_ANSWER;
}

window.AIGuide = {
  askAI: function (question, step, mission) {
    return loadQaData()
      .then(function (qaData) { return matchLocal(qaData, question, step, mission); })
      .catch(function () { return DEFAULT_ANSWER; });
  }
};

// F11(TTS, Should): 답변을 선택적으로 읽어준다. 같은 문장을 중복 재생하지 않는다.
// 크롬은 speechSynthesis 가 아무것도 말하고 있지 않을 때 cancel()을 호출한 직후 speak()를 부르면
// 엔진이 미처 정리되지 않은 상태로 다음 발화를 시작해 앞부분을 잘라먹는 경우가 있다(관찰된 버그).
// 실제로 뭔가 말하고 있을 때만 cancel()을 부르면 이 잘림이 사라진다 — 불필요한 cancel()을 없앤 것.
var lastSpoken = null;
function speak(text) {
  if (!window.speechSynthesis || !text) return;
  if (text === lastSpoken && window.speechSynthesis.speaking) return;
  lastSpoken = text;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  window.speechSynthesis.speak(utterance);
}

// 크롬은 페이지에서 처음 speak()를 부르기 전에 음성 목록(voices)이 비어 있으면 첫 발화의
// 앞부분이 잘리는 경우가 있다. getVoices()를 한 번 미리 불러 두면(이미 로드돼 있으면 그냥
// 반환, 아직이면 브라우저가 비동기로 채워 둠) 이 문제를 피할 수 있다 — 지연시간 추가 없음.
if (window.speechSynthesis) window.speechSynthesis.getVoices();

function wireHelpBar() {
  if (wireHelpBar.done) return;
  wireHelpBar.done = true;

  var box = document.getElementById('question-box');
  var input = document.getElementById('question-text');
  var repeat = document.getElementById('help-repeat');
  var open = document.getElementById('help-ask');
  var send = document.getElementById('question-send');
  var mic = document.getElementById('mic-button');

  // 사용자가 직접 입력/발화한 질문만 "내 질문: ..."으로 보여준다 — "다시 설명해주세요"가
  // 내부적으로 보내는 고정 문구는 사용자가 쓴 말이 아니므로 여기 표시하지 않는다.
  function showMyQuestion(text) {
    var el = document.getElementById('my-question');
    if (!el) return;
    if (text) {
      el.textContent = '내 질문: ' + text;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function ask(question) {
    var step = window.MissionEngine ? window.MissionEngine.getStep() : undefined;
    var mission = window.MissionEngine ? window.MissionEngine.getMission() : undefined;
    window.AIGuide.askAI(question, step, mission).then(function (answer) {
      if (window.BankUI) window.BankUI.showAnswer(answer);
      if (STT_TTS_ENABLED) speak(answer);
    });
  }

  function sendQuestion() {
    if (!input || !input.value) return;
    var question = input.value;
    input.value = '';
    if (box) box.hidden = true;
    showMyQuestion(question);
    ask(question);
  }

  if (repeat) repeat.addEventListener('click', function () { showMyQuestion(''); ask('지금 무엇을 해야 하나요'); });
  if (open) open.addEventListener('click', function () { if (box) box.hidden = false; });
  if (send) send.addEventListener('click', sendQuestion);
  if (input) input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendQuestion();
  });

  // F12(STT, Should): 지원되는 브라우저에서만 마이크 버튼을 보이고, 실패 시 텍스트 입력으로 폴백한다.
  // 인식 중에는 버튼 문구를 "듣고 있어요…"로 바꿔 사용자가 지금 상태를 알 수 있게 하고,
  // 인식이 끝나면(성공/실패 모두) 원래 문구로 되돌린다.
  if (STT_TTS_ENABLED && mic && window.Voice && window.Voice.isSupported()) {
    mic.hidden = false;
    var micDefaultLabel = mic.textContent;
    mic.addEventListener('click', function () {
      mic.disabled = true;
      mic.textContent = '🎤 듣고 있어요…';
      window.Voice.startListening(
        function (text) {
          mic.disabled = false;
          mic.textContent = micDefaultLabel;
          showMyQuestion(text);
          ask(text);
        },
        function (errType) {
          mic.disabled = false;
          mic.textContent = micDefaultLabel;
          if (box) box.hidden = false;
          var message = (errType === 'denied')
            ? '마이크 사용을 허용해야 음성으로 물어볼 수 있어요. 아래에 글자로 적어 주세요.'
            : '음성이 잘 안 들렸어요. 아래에 글자로 적어 주세요.';
          if (window.BankUI) window.BankUI.showAnswer(message);
        }
      );
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireHelpBar);
} else {
  wireHelpBar();
}
