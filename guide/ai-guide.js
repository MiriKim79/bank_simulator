var DEFAULT_ANSWER = '지금 화면에서 큰 버튼을 하나 누르면 다음으로 넘어가요.';
var qaDataPromise = null;

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
var lastSpoken = null;
function speak(text) {
  if (!window.speechSynthesis || !text) return;
  if (text === lastSpoken && window.speechSynthesis.speaking) return;
  lastSpoken = text;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  window.speechSynthesis.speak(utterance);
}

function wireHelpBar() {
  if (wireHelpBar.done) return;
  wireHelpBar.done = true;

  var box = document.getElementById('question-box');
  var input = document.getElementById('question-text');
  var repeat = document.getElementById('help-repeat');
  var open = document.getElementById('help-ask');
  var send = document.getElementById('question-send');
  var mic = document.getElementById('mic-button');

  function ask(question) {
    var step = window.MissionEngine ? window.MissionEngine.getStep() : undefined;
    var mission = window.MissionEngine ? window.MissionEngine.getMission() : undefined;
    window.AIGuide.askAI(question, step, mission).then(function (answer) {
      if (window.BankUI) window.BankUI.showAnswer(answer);
      speak(answer);
    });
  }

  function sendQuestion() {
    if (!input || !input.value) return;
    var question = input.value;
    input.value = '';
    if (box) box.hidden = true;
    ask(question);
  }

  if (repeat) repeat.addEventListener('click', function () { ask('지금 무엇을 해야 하나요'); });
  if (open) open.addEventListener('click', function () { if (box) box.hidden = false; });
  if (send) send.addEventListener('click', sendQuestion);
  if (input) input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendQuestion();
  });

  // F12(STT, Should): 지원되는 브라우저에서만 마이크 버튼을 보이고, 실패 시 텍스트 입력으로 폴백한다.
  if (mic && window.Voice && window.Voice.isSupported()) {
    mic.hidden = false;
    mic.addEventListener('click', function () {
      window.Voice.startListening(
        function (text) { ask(text); },
        function () { if (box) box.hidden = false; }
      );
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireHelpBar);
} else {
  wireHelpBar();
}
