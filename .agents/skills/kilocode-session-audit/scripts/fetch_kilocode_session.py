#!/usr/bin/env python3
"""Safely inspect a KiloCode SQLite schema and find exact session-ID references."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
from pathlib import Path


def quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--database", type=Path, default=Path(os.environ.get("USERPROFILE", "~")) / ".local" / "share" / "kilo" / "kilo.db")
    parser.add_argument("--include-schema", action="store_true", help="include table-column metadata; default output lists tables only")
    args = parser.parse_args()
    if not args.database.is_file():
        print(json.dumps({"session_id": args.session_id, "database": str(args.database), "error": "database not found"}, indent=2))
        return 2

    connection = sqlite3.connect(f"file:{args.database.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    schema: dict[str, list[dict[str, object]]] = {}
    matches: list[dict[str, object]] = []
    for table in tables:
        columns = [dict(row) for row in connection.execute(f"PRAGMA table_info({quote_identifier(table)})")]
        schema[table] = columns
        text_columns = [str(column["name"]) for column in columns if str(column["type"]).upper() in {"TEXT", "VARCHAR", "CHAR", "JSON"}]
        for column in text_columns:
            query = f"SELECT rowid FROM {quote_identifier(table)} WHERE {quote_identifier(column)} = ? LIMIT 20"
            for row in connection.execute(query, (args.session_id,)):
                matches.append({"table": table, "column": column, "rowid": row["rowid"]})
    connection.close()
    result: dict[str, object] = {"session_id": args.session_id, "database": str(args.database), "tables": tables, "exact_id_matches": matches}
    if args.include_schema:
        result["schema"] = schema
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
