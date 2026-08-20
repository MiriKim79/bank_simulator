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

  function startListening(onResult, onError) {
    if (!isSupported()) {
      if (onError) onError('unsupported');
      return;
    }

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

  return {
    isSupported: isSupported,
    startListening: startListening
  };
})();
