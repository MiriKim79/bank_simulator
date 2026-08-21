// [F12, Should] window.Voice — Web Speech API 기반 음성 인식.
window.Voice = (function () {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function isSupported() {
    return !!SpeechRecognition;
  }

  function mapError(errorEvent) {
    if (errorEvent === 'no-speech') return 'no-speech';
    if (errorEvent === 'not-allowed' || errorEvent === 'service-not-allowed') return 'denied';
    return 'error';
  }

  function beginRecognition(onResult, onError) {
    var recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
      var text = event.results && event.results[0] && event.results[0][0]
        ? event.results[0][0].transcript
        : '';
      if (text && onResult) onResult(text);
      else if (onError) onError('no-speech');
    };

    recognition.onerror = function (event) {
      if (onError) onError(mapError(event.error));
    };

    try {
      recognition.start();
    } catch (e) {
      if (onError) onError('error');
    }
  }

  // getUserMedia로 마이크 접근을 먼저 확인/요청한다 — 이미 허용돼 있으면 브라우저가 팝업 없이
  // 바로 넘겨주고, 아직이면 여기서 브라우저 기본 권한 프롬프트가 뜬다. 권한 자체를 코드로
  // 초기화하거나 강제로 다시 묻게 만들지는 않는다(그건 브라우저가 관리하는 영역). 인식 전
  // 확인용으로만 스트림을 열었다가 즉시 트랙을 꺼서 마이크를 계속 점유하지 않게 한다.
  function startListening(onResult, onError) {
    if (!isSupported()) {
      if (onError) onError('unsupported');
      return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        beginRecognition(onResult, onError);
      }).catch(function () {
        if (onError) onError('denied');
      });
    } else {
      beginRecognition(onResult, onError);
    }
  }

  return {
    isSupported: isSupported,
    startListening: startListening
  };
})();
