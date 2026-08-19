// [F16, Should] window.Quiz — #screen-quiz 안을 직접 그린다. screen/bank-ui.html 은 열지 않는다.
window.Quiz = (function () {
  var quizData = null;
  var current = 0;

  function loadQuizData() {
    return fetch('../mission/quiz-data.json')
      .then(function (res) { return res.json(); })
      .catch(function () { return null; });
  }

  function root() {
    return document.getElementById('screen-quiz');
  }

  function renderQuestion() {
    var el = root();
    if (!el || !quizData) return;
    var q = quizData.questions[current];
    var total = quizData.questions.length;

    var html = '<h1>금융용어 퀴즈</h1>';
    html += '<p class="hint">' + (current + 1) + ' / ' + total + '</p>';
    html += '<p class="confirm-amount" style="font-size:22px">' + q.question + '</p>';
    html += '<div id="quiz-options"></div>';
    html += '<p id="quiz-feedback"></p>';
    html += '<button id="quiz-next" hidden class="primary">다음 문제</button>';
    el.innerHTML = html;

    var optionsBox = document.getElementById('quiz-options');
    q.options.forEach(function (option, i) {
      var btn = document.createElement('button');
      btn.textContent = option;
      btn.addEventListener('click', function () { answer(i); });
      optionsBox.appendChild(btn);
    });
  }

  function answer(i) {
    var q = quizData.questions[current];
    var optionsBox = document.getElementById('quiz-options');
    var feedback = document.getElementById('quiz-feedback');
    var next = document.getElementById('quiz-next');
    if (!optionsBox || !feedback || !next) return;

    Array.prototype.forEach.call(optionsBox.querySelectorAll('button'), function (btn) {
      btn.disabled = true;
    });

    var correct = i === q.answer;
    feedback.textContent = (correct ? '정답이에요! ' : '아쉬워요. 정답은 "' + q.options[q.answer] + '"예요. ') + q.explain;
    next.hidden = false;
    next.textContent = (current + 1 < quizData.questions.length) ? '다음 문제' : '완료';
    next.onclick = function () {
      current++;
      if (current < quizData.questions.length) {
        renderQuestion();
      } else if (window.BankUI) {
        window.BankUI.showStep('done');
      }
    };
  }

  function start() {
    if (!quizData) return;
    current = 0;
    renderQuestion();
    if (window.BankUI) window.BankUI.showStep('quiz');
  }

  loadQuizData().then(function (data) {
    if (!data || !data.questions || !data.questions.length) return;
    quizData = data;
    var startBtn = document.getElementById('quiz-start');
    if (startBtn) {
      startBtn.hidden = false;
      startBtn.addEventListener('click', start);
    }
  });

  return { start: start };
})();
