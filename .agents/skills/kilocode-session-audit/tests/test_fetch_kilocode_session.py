from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "scripts" / "fetch_kilocode_session.py"
SPEC = importlib.util.spec_from_file_location("fetch_kilocode_session", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
fetcher = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = fetcher
SPEC.loader.exec_module(fetcher)


class SecretSanitizationTests(unittest.TestCase):
    def test_redacts_prefixed_secret_assignments(self) -> None:
        source = "LINEAR_API_KEY=linear-value GITHUB_TOKEN=github-value GOOGLE_STITCH_API_KEY=google-value"
        result = fetcher.sanitize(source)

        self.assertEqual(
            result,
            "LINEAR_API_KEY=[REDACTED] GITHUB_TOKEN=[REDACTED] GOOGLE_STITCH_API_KEY=[REDACTED]",
        )

    def test_redacts_nested_secret_keys(self) -> None:
        result = fetcher.sanitize({"metadata": {"authorization": "Bearer value", "safe": "visible"}})

        self.assertEqual(result, {"metadata": {"authorization": "[REDACTED]", "safe": "visible"}})


if __name__ == "__main__":
    unittest.main()
