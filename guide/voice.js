// [스텁] C가 F12(Should)에서 이 파일을 통째로 교체한다.
window.Voice = {
  isSupported: function () { return false; },
  startListening: function (onResult, onError) { if (onError) onError('unsupported'); }
};
console.warn('[스텁] voice.js — 항상 미지원으로 답한다');
