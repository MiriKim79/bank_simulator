window.MissionEngine = (function () {
  // missions.json 로딩이 끝나기 전에 클릭이 들어올 수 있으므로 최소 기본값을 들고 시작한다.
  var DOC = {
    id: 'loading', title: '(로딩 중)',
    steps: [{ step: 'home', action: 'transfer', next: 'bank', label: '', wrong: '"이체" 버튼을 누르세요.' }]
  };
  var MISSION = DOC.steps;
  var loaded = false;
  var current = 'home';

  fetch('../mission/missions.json')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      if (json && Array.isArray(json.steps) && json.steps.length === 6) {
        DOC = json;
        MISSION = json.steps;
        loaded = true;
      } else {
        console.warn('[MissionEngine] missions.json 형식이 이상하다. 기본값 유지');
      }
    })
    .catch(function (e) {
      console.warn('[MissionEngine] missions.json 을 못 읽었다. 기본값 유지:', e.message);
    });

  function rule(step) {
    for (var i = 0; i < MISSION.length; i++) {
      if (MISSION[i].step === step) return MISSION[i];
    }
    return null;
  }

  // 금액·계좌번호는 사용자가 콤마나 공백을 넣을 수 있으므로 숫자만 남겨 비교한다.
  function digits(v) {
    return String(v == null ? '' : v).replace(/[^0-9]/g, '');
  }

  function matches(r, action, value) {
    if (r.action !== action) return false;
    if (r.value === undefined) return true;
    if (/^[0-9]+$/.test(r.value)) return digits(value) === r.value;
    return String(value) === r.value;
  }

  function getStep() { return current; }

  function submit(input) {
    input = input || {};
    var r = rule(current);
    if (!r) {
      return { ok: false, step: current, message: '알 수 없는 단계입니다.' };
    }
    if (matches(r, input.action, input.value)) {
      current = r.next;
      return { ok: true, step: current, message: '' };
    }
    return { ok: false, step: current, message: r.wrong };
  }

  function reset() { current = 'home'; }

  // A 는 label 로 F17 진행 표시를 만들고, C 는 이걸 askAI 3번째 인자로 넘긴다.
  // 원본을 그대로 내준다. 여기서 요약하거나 가공하면 F6 이 깨진다.
  function getMission() { return DOC; }

  return {
    getStep: getStep, submit: submit, reset: reset, getMission: getMission,
    isLoaded: function () { return loaded; }
  };
})();
