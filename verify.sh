#!/usr/bin/env bash
# 검증 진입점 — 이 프로젝트는 테스트 러너가 없어서(OWNERS.md), 스크립트로 되는 부분만 여기서 자동 검사한다.
# 브라우저로 눈으로 봐야 하는 부분(완주·오답 흔들림·AI 답변)은 자동화하지 않는다 —
# Puppeteer 같은 새 도구가 필요한데, 그건 팀 규칙상 먼저 물어봐야 하는 대상이다(CLAUDE.md).
# 그 대신 이 스크립트 맨 끝에 "수동 확인 필요" 목록으로 남겨서 숨기지 않는다.
#
# 사용:
#   bash verify.sh          # 전체
#   bash verify.sh --fast   # 느린 것 생략 (지금은 전부 빠름 — 자리만 마련)

set -uo pipefail
cd "$(dirname "$0")"

FAST=0
[ "${1:-}" = "--fast" ] && FAST=1

pass=0
fail=0

run() {
  local name="$1"; shift
  printf '  %-28s' "$name"
  if "$@" >/tmp/verify-last.log 2>&1; then
    echo "OK"
    pass=$((pass + 1))
  else
    echo "FAIL"
    echo "  ── 출력 ──────────────────────────"
    sed 's/^/  /' /tmp/verify-last.log | tail -n 25
    echo "  ─────────────────────────────────"
    fail=$((fail + 1))
  fi
}

echo "검증 시작 $([ $FAST -eq 1 ] && echo '(빠른 검사만)')"
echo

# ── 필요한 파일이 다 있는가 ──────────────────────────────────
run "screen/bank-ui.html 존재"   test -f screen/bank-ui.html
run "screen/styles.css 존재"     test -f screen/styles.css
run "mission/missions.json 존재" test -f mission/missions.json
run "mission-engine.js 존재"     test -f mission/mission-engine.js
run "quiz-data.json 존재"        test -f mission/quiz-data.json
run "quiz.js 존재"               test -f mission/quiz.js
run "qa-data.json 존재"          test -f guide/qa-data.json
run "ai-guide.js 존재"           test -f guide/ai-guide.js
run "voice.js 존재"              test -f guide/voice.js
run "shared/CONTRACT.md 존재"    test -f shared/CONTRACT.md

# ── JSON이 문법적으로 유효한가 ───────────────────────────────
run "missions.json JSON 유효"    python3 -m json.tool mission/missions.json
run "quiz-data.json JSON 유효"   python3 -m json.tool mission/quiz-data.json
run "qa-data.json JSON 유효"     python3 -m json.tool guide/qa-data.json

# ── missions.json 이 F6·F17 계약을 지키는가 ──────────────────
run "missions.json 단계 6개+wrong 전부" python3 -c "
import json, sys
d = json.load(open('mission/missions.json'))
steps = d.get('steps', [])
assert len(steps) == 6, f'steps {len(steps)}개 (6개여야 함)'
for s in steps:
    assert s.get('wrong'), f\"{s.get('step')} 단계에 wrong 없음\"
    if s.get('step') != 'home':
        assert s.get('label'), f\"{s.get('step')} 단계에 label 없음 (F17 깨짐)\"
"

# ── qa-data.json 이 6단계 + default 커버리지를 지키는가 (C1.8) ─
run "qa-data.json 6단계+fallback 커버리지" python3 -c "
import json
d = json.load(open('guide/qa-data.json'))
assert d.get('default'), 'default 답변 없음'
by_step = d.get('byStep', {})
need = {'home','bank','account','amount','confirm','done'}
missing = need - set(by_step)
assert not missing, f'byStep에 없는 단계: {missing}'
for step, data in by_step.items():
    assert data.get('fallback'), f'{step} 단계에 fallback 없음'
"

# ── JS 문법 오류가 없는가 (node 있을 때만) ────────────────────
if command -v node >/dev/null 2>&1; then
  run "mission-engine.js 문법"  node --check mission/mission-engine.js
  run "quiz.js 문법"            node --check mission/quiz.js
  run "ai-guide.js 문법"        node --check guide/ai-guide.js
  run "voice.js 문법"           node --check guide/voice.js

  # bank-ui.html 안의 인라인 <script>(src 없는 것)도 같은 방식으로 뽑아서 검사한다.
  run "bank-ui.html 인라인 스크립트 문법" python3 -c "
import re, subprocess, sys, tempfile, os
html = open('screen/bank-ui.html', encoding='utf-8').read()
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)
assert blocks, '인라인 <script> 를 하나도 못 찾음'
for i, code in enumerate(blocks):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
        f.write(code)
        path = f.name
    try:
        subprocess.run(['node', '--check', path], check=True)
    finally:
        os.unlink(path)
"
else
  echo "  (node 없음 — JS 문법 검사 생략)"
fi

# ── script 로드 순서가 규칙(CONTRACT.md)과 같은가 ─────────────
run "script 로드 순서 (llm-config→engine→voice→ai-guide→quiz)" python3 -c "
import re
html = open('screen/bank-ui.html', encoding='utf-8').read()
order = re.findall(r'<script src=\"([^\"]+)\"', html)
expect = ['../shared/llm-config.js', '../mission/mission-engine.js',
          '../guide/voice.js', '../guide/ai-guide.js', '../mission/quiz.js']
assert order == expect, f'실제 순서 {order} != 기대 순서 {expect}'
"

# ── API 키 파일이 커밋되지 않았는가 ───────────────────────────
run "shared/llm-config.js 미커밋" bash -c '! git ls-files --error-unmatch shared/llm-config.js >/dev/null 2>&1'

echo
echo "통과 $pass · 실패 $fail"

echo
echo "── 스크립트로 못 하는 수동 확인 (OWNERS.md 검증 명령, 반드시 눈으로) ──"
echo "  1. 이체 → 한걸음은행 → 11022233344 → 50000 → 보내기 → 완료 화면까지 간다"
echo "  2. 홈에서 \"거래내역\"을 누르면 화면이 넘어가지 않고 오답 설명이 뜬다"
echo "  3. \"AI 선생님에게 물어보기\" → \"다시 설명해주세요\"를 누르면 답변이 화면에 뜬다"
echo "  이 셋은 자동화 안 함 — 새 테스트 도구(Puppeteer 등) 추가는 팀 승인 필요(CLAUDE.md)"

if [ "$fail" -ne 0 ]; then
  echo
  echo "완료가 아닙니다. 위 실패를 고친 뒤 다시 실행하세요."
  exit 1
fi

echo "전부 통과. (단, 위 수동 확인 3개는 별도로 직접 해야 한다)"
exit 0
