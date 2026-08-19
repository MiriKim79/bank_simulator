#!/usr/bin/env python3
"""PostToolUse syntax check for the vibecoding project.

Reads the hook payload on stdin, looks at the file that was just written,
and runs a cheap syntax check based on the extension.

Exit 0: pass, or nothing to check (silent).
Exit 2: failed. The message on stderr is fed back to Claude.

No dependencies beyond the stdlib and node (already required for --check).
Every check is parse-only, so it stays well under the 5s hook timeout.
"""

import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

# Void elements never have a closing tag.
VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

# HTML lets these omit the end tag, so an unclosed one is not an error.
OPTIONAL_END = {
    "p", "li", "dt", "dd", "option", "optgroup",
    "thead", "tbody", "tfoot", "tr", "td", "th",
    "rt", "rp", "colgroup",
}


def fail(path, problems):
    name = os.path.basename(path)
    sys.stderr.write("문법 검사 실패: %s\n" % name)
    for p in problems:
        sys.stderr.write("  - %s\n" % p)
    sys.stderr.write("파일을 고친 뒤 다시 저장하세요.\n")
    sys.exit(2)


def check_js(path):
    try:
        r = subprocess.run(
            ["node", "--check", path],
            capture_output=True, text=True, timeout=4,
        )
    except FileNotFoundError:
        return []          # node 없으면 조용히 통과
    except subprocess.TimeoutExpired:
        return ["node --check 가 4초 안에 끝나지 않았다"]
    if r.returncode == 0:
        return []
    msg = (r.stderr or r.stdout).strip().splitlines()
    # node 는 소스 발췌 + 캐럿까지 뱉는다. 실제 에러 줄만 남긴다.
    keep = [l.strip() for l in msg if "Error" in l or "^" not in l and ":" in l and l.strip().startswith(path)]
    return keep[:4] or [msg[-1].strip() if msg else "구문 오류"]


def check_json(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    try:
        json.loads(text)
    except json.JSONDecodeError as e:
        return ["%d행 %d열: %s" % (e.lineno, e.colno, e.msg)]
    return []


def strip_css_noise(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r'"(?:[^"\\\n]|\\.)*"', '""', text)
    text = re.sub(r"'(?:[^'\\\n]|\\.)*'", "''", text)
    return text


def check_css(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    text = strip_css_noise(raw)
    depth = 0
    line = 1
    for ch in text:
        if ch == "\n":
            line += 1
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth < 0:
                return ["%d행: 짝 없는 닫는 중괄호 }" % line]
    if depth > 0:
        return ["닫히지 않은 중괄호 { 가 %d개 남았다" % depth]
    return []


class TagStack(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self, convert_charrefs=True)
        self.stack = []
        self.problems = []

    def handle_starttag(self, tag, attrs):
        if tag in VOID or tag in OPTIONAL_END:
            return
        self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag in VOID or tag in OPTIONAL_END:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                unclosed = self.stack[i + 1:]
                for name, ln in unclosed:
                    self.problems.append(
                        "%d행 <%s> 가 닫히지 않았는데 %d행에서 </%s> 를 만났다"
                        % (ln, name, self.getpos()[0], tag)
                    )
                del self.stack[i:]
                return
        self.problems.append(
            "%d행: </%s> 에 맞는 여는 태그가 없다" % (self.getpos()[0], tag)
        )


def check_html(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    p = TagStack()
    try:
        p.feed(text)
        p.close()
    except Exception as e:
        return ["HTML 파싱 실패: %s" % e]
    problems = list(p.problems)
    for name, ln in p.stack:
        problems.append("%d행 <%s> 가 끝까지 닫히지 않았다" % (ln, name))
    return problems[:6]


CHECKS = {
    ".js": check_js,
    ".json": check_json,
    ".css": check_css,
    ".html": check_html,
    ".htm": check_html,
}


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return
    ti = payload.get("tool_input") or {}
    tr = payload.get("tool_response") or {}
    path = tr.get("filePath") or ti.get("file_path") or ti.get("notebook_path")
    if not path or not os.path.isfile(path):
        return

    ext = os.path.splitext(path)[1].lower()
    check = CHECKS.get(ext)
    if not check:
        return

    try:
        problems = check(path)
    except Exception as e:
        problems = ["검사기 자체가 실패했다: %s" % e]

    if problems:
        fail(path, problems)


if __name__ == "__main__":
    main()
