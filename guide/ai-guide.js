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
