#!/usr/bin/env python3
"""Locate and safely index a Codex rollout JSONL by its exact session ID."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any


def event_summary(event: dict[str, Any], line: int) -> dict[str, Any]:
    payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
    return {
        "line": line,
        "timestamp": event.get("timestamp") or event.get("time"),
        "event_type": event.get("type") or event.get("event_type"),
        "role": payload.get("role") or event.get("role"),
        "item_type": payload.get("type") or payload.get("item_type"),
        "tool": payload.get("name") or payload.get("tool_name"),
        "status": payload.get("status") or event.get("status"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--sessions-root", type=Path, default=Path(os.environ.get("USERPROFILE", "~")) / ".codex" / "sessions")
    parser.add_argument("--include-events", action="store_true", help="include the redacted event index; default output is aggregate metadata only")
    args = parser.parse_args()

    matches = sorted(args.sessions_root.glob(f"**/rollout-*-{args.session_id}.jsonl"))
    if len(matches) != 1:
        print(json.dumps({"session_id": args.session_id, "matches": [str(p) for p in matches], "error": "expected exactly one matching rollout file"}, indent=2))
        return 2

    summaries: list[dict[str, Any]] = []
    malformed_lines: list[int] = []
    with matches[0].open("r", encoding="utf-8") as stream:
        for line_number, raw in enumerate(stream, start=1):
            try:
                value = json.loads(raw)
            except json.JSONDecodeError:
                malformed_lines.append(line_number)
                continue
            if isinstance(value, dict):
                summaries.append(event_summary(value, line_number))

    event_types: dict[str, int] = {}
    tools: dict[str, int] = {}
    for summary in summaries:
        event_type = str(summary["event_type"] or "unknown")
        event_types[event_type] = event_types.get(event_type, 0) + 1
        if summary["tool"]:
            tool = str(summary["tool"])
            tools[tool] = tools.get(tool, 0) + 1
    result: dict[str, Any] = {
        "session_id": args.session_id,
        "path": str(matches[0]),
        "event_count": len(summaries),
        "malformed_lines": malformed_lines,
        "event_type_counts": event_types,
        "tool_call_counts": tools,
    }
    if args.include_events:
        result["events"] = summaries
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
