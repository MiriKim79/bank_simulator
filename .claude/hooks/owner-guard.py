#!/usr/bin/env python3
"""
owner-guard.py — 남의 폴더를 건드렸을 때 흔적을 남기는 훅.

이 훅은 "막는" 훅이 아니다. 막는 것은 settings.json 의 deny 가 한다.
이 훅은 deny 를 풀고 고쳤을 때(급해서, 또는 통합자라서)
CHANGELOG-INBOX/ 에 쪽지를 자동으로 남긴다.

  하네스는 금지가 아니라 추적이다.

지금은 잠들어 있다 — MY_FOLDER 가 비어 있으면 아무 일도 하지 않는다.
담당이 정해지면 아래 두 줄을 고치고, settings.json 에 등록한다 (OWNERS.md 3단계).

등록 (.claude/settings.json 의 "hooks" 안):
  "PostToolUse": [{
    "matcher": "Write|Edit|NotebookEdit",
    "hooks": [{ "type": "command",
                "command": "python3 \"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/owner-guard.py\"",
                "timeout": 5,
                "statusMessage": "소유권 확인" }]
  }]
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
# 이 두 줄만 각자 고친다 (OWNERS.md 의 담당 표를 보고)
MY_FOLDER = ""        # "screen" / "mission" / "guide" 중 내 것. 통합자는 "*"
MY_NAME = ""          # 내 이름 (쪽지에 적힌다)
# 둘 중 하나라도 비어 있으면 이 훅은 아무 일도 하지 않는다.
# ─────────────────────────────────────────────

# 건드려도 쪽지를 안 남기는 곳 (전원 공용이거나, 원래 각자 고치는 것)
FREE = [
    "CHANGELOG-INBOX",
    ".claude",
    "tasks.md",
    "SYNC-LOG.md",
    "VERSION.txt",
    "personal",          # 팀 앱과 무관한 개인 폴더
    "_workspace",
]


def main():
    if not MY_FOLDER or not MY_NAME:
        return 0  # 담당 미정 — 잠들어 있다

    try:
        event = json.load(sys.stdin)
    except Exception:
        return 0  # 입력이 이상하면 조용히 통과. 훅이 작업을 막으면 안 된다.

    tool_input = event.get("tool_input", {}) or {}
    path = (
        (event.get("tool_response", {}) or {}).get("filePath")
        or tool_input.get("file_path")
        or tool_input.get("notebook_path")
    )
    if not path:
        return 0

    project = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
    try:
        rel = Path(path).resolve().relative_to(project)
    except ValueError:
        return 0  # 프로젝트 밖 파일은 관심 없다

    rel_str = rel.as_posix()
    top = rel.parts[0] if rel.parts else ""

    if any(rel_str.startswith(f) for f in FREE):
        return 0
    if MY_FOLDER != "*" and top == MY_FOLDER:
        return 0  # 내 폴더 = 정상 작업

    # 여기 왔다 = 내 영역 밖을 고쳤다
    inbox = project / "CHANGELOG-INBOX"
    inbox.mkdir(exist_ok=True)

    stamp = datetime.now().strftime("%m%d-%H%M")
    note = inbox / f"{stamp}-{MY_NAME}.md"

    if not note.exists():
        note.write_text(
            f"# {MY_NAME} 가 남의 영역을 고쳤습니다 ({stamp})\n\n"
            f"> 이 쪽지는 자동으로 만들어졌습니다.\n"
            f"> **아래 빈칸을 채우고, 카톡으로도 알리세요.**\n\n"
            f"## 고친 파일\n\n"
            f"- `{rel_str}`\n\n"
            f"## 왜 고쳤나\n\n"
            f"(여기에 한 줄: 무슨 문제 때문에 급했는지)\n\n"
            f"## 되돌리는 법\n\n"
            f"(여기에 한 줄: 원래대로 돌리려면 무엇을 지우면 되는지)\n\n"
            f"## 담당자 확인\n\n"
            f"- [ ] 카톡으로 알렸다\n"
            f"- [ ] 담당자가 확인했다\n",
            encoding="utf-8",
        )
    else:
        # 같은 분에 여러 파일을 고쳤으면 목록에만 덧붙인다
        text = note.read_text(encoding="utf-8")
        if f"`{rel_str}`" not in text:
            text = text.replace("\n\n## 왜 고쳤나", f"\n- `{rel_str}`\n\n## 왜 고쳤나", 1)
            note.write_text(text, encoding="utf-8")

    # exit code 2 = stderr 내용이 Claude 에게 전달된다.
    print(
        f"[소유권 알림] {rel_str} 은(는) {MY_NAME} 의 담당 폴더({MY_FOLDER}/) 밖입니다.\n"
        f"쪽지를 만들었습니다: CHANGELOG-INBOX/{note.name}\n"
        f"사용자에게 (1) 쪽지의 '왜 고쳤나'·'되돌리는 법'을 채우고 "
        f"(2) OWNERS.md 의 담당자에게 카톡으로 알리라고 안내하세요.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
