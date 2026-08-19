// [스텁] B가 이 파일을 통째로 교체한다. 무엇을 눌러도 다음 단계로 넘어간다.
window.MissionEngine = (function () {
  var ORDER = ['home', 'bank', 'account', 'amount', 'confirm', 'done'];
  // label 은 A 가 F17 진행 표시를 확인할 수 있게 스텁에도 넣어 둔다.
  var LABELS = { home: '', bank: '은행 선택', account: '계좌번호 입력',
                 amount: '금액 입력', confirm: '확인', done: '완료' };
  var current = 'home';
  return {
    getStep: function () { return current; },
    getMission: function () {
      return {
        id: 'stub', title: '(스텁 미션)',
        steps: ORDER.map(function (s) { return { step: s, label: LABELS[s] }; })
      };
    },
    submit: function () {
      current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      return { ok: true, step: current, message: '' };
    },
    reset: function () { current = 'home'; }
  };
})();
console.warn('[스텁] mission-engine.js — 정답 판정이 없다');
