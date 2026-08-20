# 금융한걸음

고령자를 위한 AI 모바일뱅킹 학습 서비스

## 실행 방법

빌드·번들러 없는 바닐라 웹페이지라 로컬 서버 하나만 있으면 된다.

```
python3 -m http.server 8000
```

띄운 채로 브라우저에서 아래 주소를 연다.

```
http://localhost:8000/screen/bank-ui.html
```

**`file://`로 직접 열면 동작하지 않는다.** 페이지가 `fetch`로 JSON 데이터를 읽으니 위처럼 HTTP 서버를 거쳐야 한다.

자세한 기획은 `SPEC.md`, 팀 작업 규칙은 `CLAUDE.md`, 진행 상황은 `tasks.md`를 본다.
