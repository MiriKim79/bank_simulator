window.Quiz = (function () {
  // 문항은 quiz-data.json 에만 있다. 여기에 문제·정답·해설을 적지 않는다 (F6 과 같은 이유).
  var DATA = null;
  var index = 0;
  var answered = false;

  fetch('../mission/quiz-data.json')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      if (!json || !Array.isArray(json.questions) || json.questions.length === 0) {
        console.warn('[Quiz] quiz-data.json 형식이 이상하다. 퀴즈를 켜지 않는다');
        return;
      }
      DATA = json;
      enableEntry();
    })
    .catch(function (e) {
      console.warn('[Quiz] quiz-data.json 을 못 읽었다. 퀴즈를 켜지 않는다:', e.message);
    });

  // 문항을 읽은 뒤에만 완료 화면의 진입 버튼을 보여 준다. 죽은 버튼을 남기지 않는다.
  function enableEntry() {
    var btn = document.getElementById('quiz-start');
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      start();
    });
  }

  function screenEl() { return document.getElementById('screen-quiz'); }

  function questions() { return (DATA && DATA.questions) ? DATA.questions : []; }

  function start() {
    if (!DATA) return;
    index = 0;
    answered = false;
    if (window.BankUI && window.BankUI.showStep) window.BankUI.showStep('quiz');
    render();
  }

  function render() {
    var root = screenEl();
    if (!root) return;
    var list = questions();
    var q = list[index];
    if (!q) { renderDone(); return; }

    root.innerHTML = '';
    root.appendChild(el('h1', 'quiz-title', (DATA.title || '금융 용어 O·X 퀴즈')));
    root.appendChild(el('p', 'quiz-count', (index + 1) + ' / ' + list.length + ' 문제'));

    // 정답·해설 카드는 문제 '위' 에 놓는다. 답하기 전에는 비어 있다.
    var card = el('div', 'quiz-card');
    card.id = 'quiz-card';
    card.hidden = true;
    root.appendChild(card);

    root.appendChild(el('p', 'quiz-question', 'Q' + (index + 1) + '. ' + q.text));

    var choices = el('div', 'quiz-choices');
    choices.appendChild(choiceButton('O', '⭕ 맞아요'));
    choices.appendChild(choiceButton('X', '❌ 아니에요'));
    root.appendChild(choices);

    var nav = el('div', 'quiz-nav');
    nav.id = 'quiz-nav';
    nav.hidden = true;
    var isLast = (index === list.length - 1);
    nav.appendChild(navButton('next', isLast ? '결과 보기' : '다음 문제 풀기', true));
    nav.appendChild(navButton('exit', '처음 화면으로', false));
    root.appendChild(nav);

    answered = false;
  }

  function renderDone() {
    var root = screenEl();
    if (!root) return;
    root.innerHTML = '';
    root.appendChild(el('h1', 'quiz-title', '퀴즈 끝'));

    var card = el('div', 'quiz-card is-done');
    card.appendChild(el('p', 'quiz-card-mark', '🎉 수고하셨습니다'));
    card.appendChild(el('p', 'quiz-card-explain',
      questions().length + '문제를 모두 풀었어요. 헷갈리는 말은 용어 사전에서 다시 읽어 보세요.'));
    root.appendChild(card);

    var nav = el('div', 'quiz-nav');
    nav.appendChild(navButton('exit', '처음 화면으로', true));
    nav.appendChild(navButton('restart', '다시 풀기', false));
    root.appendChild(nav);
  }

  function choiceButton(value, text) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'quiz-choice';
    b.setAttribute('data-quiz-answer', value);
    b.textContent = text;
    return b;
  }

  function navButton(action, text, primary) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = primary ? 'primary' : '';
    b.setAttribute('data-quiz-nav', action);
    b.textContent = text;
    return b;
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  // 오답이어도 다시 고를 기회를 주지 않는다 — 설명하고 다음 문제로 (SPEC 12.2 확정).
  function answer(choice) {
    if (answered) return;
    var q = questions()[index];
    if (!q) return;
    answered = true;

    var correct = (choice === q.answer);
    var card = document.getElementById('quiz-card');
    if (card) {
      card.innerHTML = '';
      card.classList.toggle('is-correct', correct);
      card.classList.toggle('is-wrong', !correct);
      card.appendChild(el('p', 'quiz-card-mark', correct ? '⭕ 정답이에요' : '❌ 아쉬워요'));
      card.appendChild(el('p', 'quiz-card-answer', '정답: ' + q.answer));
      card.appendChild(el('p', 'quiz-card-explain', q.explain || ''));
      card.hidden = false;
    }

    var picked = screenEl().querySelectorAll('[data-quiz-answer]');
    for (var i = 0; i < picked.length; i++) {
      picked[i].disabled = true;
      if (picked[i].getAttribute('data-quiz-answer') === choice) picked[i].classList.add('is-picked');
      if (picked[i].getAttribute('data-quiz-answer') === q.answer) picked[i].classList.add('is-answer');
    }

    var nav = document.getElementById('quiz-nav');
    if (nav) nav.hidden = false;
  }

  function next() {
    index = index + 1;
    if (index >= questions().length) renderDone();
    else render();
  }

  function restart() {
    index = 0;
    render();
  }

  // 버튼 문구가 '처음 화면으로' 이므로 어디서 들어왔든 intro 로 나간다.
  function exit() {
    if (window.BankUI && window.BankUI.showStep) window.BankUI.showStep('intro');
  }

  // 퀴즈 화면 안쪽 클릭만 받는다. data-action 이 없으므로 미션 상태머신에는 가지 않는다.
  document.addEventListener('click', function (e) {
    var root = screenEl();
    if (!root) return;

    var pick = e.target.closest('[data-quiz-answer]');
    if (pick && root.contains(pick)) { answer(pick.getAttribute('data-quiz-answer')); return; }

    var nav = e.target.closest('[data-quiz-nav]');
    if (!nav || !root.contains(nav)) return;
    var action = nav.getAttribute('data-quiz-nav');
    if (action === 'next') next();
    else if (action === 'restart') restart();
    else if (action === 'exit') exit();
  });

  // 퀴즈 화면 전용 스타일. screen/styles.css 는 A 소유라 열지 않고, 색은 거기 :root 토큰만 쓴다.
  (function injectStyle() {
    if (document.getElementById('quiz-style')) return;
    var css = [
      '#screen-quiz .quiz-count { margin: 0 0 12px; font-size: 16px; font-weight: 600; color: var(--accent); }',
      '#screen-quiz .quiz-card { margin: 0 0 16px; padding: 20px; border-radius: 14px; background: var(--info-bg); color: var(--info-fg); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }',
      '#screen-quiz .quiz-card[hidden] { display: none; }',
      '#screen-quiz .quiz-card.is-correct { background: var(--success-bg); color: var(--success-fg); }',
      '#screen-quiz .quiz-card.is-wrong { background: var(--error-bg); color: var(--error-fg); }',
      '#screen-quiz .quiz-card-mark { margin: 0 0 6px; font-size: 28px; font-weight: 800; }',
      '#screen-quiz .quiz-card-answer { margin: 0 0 10px; font-size: 24px; font-weight: 700; }',
      '#screen-quiz .quiz-card-explain { margin: 0; font-size: 20px; line-height: 1.6; }',
      '#screen-quiz .quiz-question { margin: 0 0 16px; font-size: 22px; line-height: 1.6; font-weight: 700; }',
      '#screen-quiz .quiz-choice.is-picked { border-color: var(--accent); border-width: 3px; }',
      '#screen-quiz .quiz-choice.is-answer { background: var(--success-bg); color: var(--success-fg); }',
      '#screen-quiz .quiz-choice:disabled { cursor: default; opacity: 0.9; }',
      '#screen-quiz .quiz-nav[hidden] { display: none; }',
      '#screen-quiz .quiz-nav { margin-top: 20px; }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'quiz-style';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  return {
    start: start,
    isLoaded: function () { return DATA !== null; }
  };
})();
