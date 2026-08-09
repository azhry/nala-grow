from __future__ import annotations

import argparse
import importlib.util
import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import call, patch
from urllib.error import HTTPError, URLError


MODULE_PATH = Path(__file__).parents[1] / "scripts" / "gh_tooling.py"
SPEC = importlib.util.spec_from_file_location("gh_tooling", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
gh_tooling = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = gh_tooling
SPEC.loader.exec_module(gh_tooling)


class Response:
    def __init__(self, body: bytes) -> None:
        self.body = body

    def __enter__(self) -> "Response":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self) -> bytes:
        return self.body


class GitHubRequestTests(unittest.TestCase):
    @patch.dict("os.environ", {"GITHUB_TOKEN": "test-token"}, clear=True)
    def test_post_request_builds_url_headers_and_payload(self) -> None:
        captured = {}

        def fake_urlopen(request, timeout):
            captured["request"] = request
            captured["timeout"] = timeout
            return Response(b'{"number": 87}')

        with patch.object(gh_tooling, "urlopen", side_effect=fake_urlopen):
            result = gh_tooling.github_request(
                "POST",
                "/repos/azhry/nala-grow/pulls",
                {"title": "Audit fixes", "head": "audit", "base": "main"},
            )

        request = captured["request"]
        self.assertEqual(request.full_url, "https://api.github.com/repos/azhry/nala-grow/pulls")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(json.loads(request.data), {"title": "Audit fixes", "head": "audit", "base": "main"})
        self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
        self.assertEqual(request.get_header("X-github-api-version"), "2022-11-28")
        self.assertEqual(captured["timeout"], 30)
        self.assertEqual(result, {"number": 87})

    @patch.dict("os.environ", {"GITHUB_TOKEN": "test-token"}, clear=True)
    def test_get_request_parses_empty_success_response(self) -> None:
        with patch.object(gh_tooling, "urlopen", return_value=Response(b"")) as mocked:
            result = gh_tooling.github_request("GET", "/repos/azhry/nala-grow/pulls/87")

        request = mocked.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertIsNone(request.data)
        self.assertEqual(result, {})

    @patch.dict("os.environ", {"GITHUB_TOKEN": "test-token"}, clear=True)
    def test_http_error_exits_nonzero_without_printing_authorization(self) -> None:
        error = HTTPError(
            "https://api.github.com/repos/azhry/nala-grow/pulls/87",
            404,
            "Not Found",
            {},
            io.BytesIO(b'{"message":"Not Found"}'),
        )
        stderr = io.StringIO()
        with patch.object(gh_tooling, "urlopen", side_effect=error), patch("sys.stderr", stderr):
            with self.assertRaisesRegex(SystemExit, "1"):
                gh_tooling.github_request("GET", "/repos/azhry/nala-grow/pulls/87")

        self.assertIn("HTTP error 404", stderr.getvalue())
        self.assertNotIn("test-token", stderr.getvalue())

    @patch.dict("os.environ", {"GITHUB_TOKEN": "test-token"}, clear=True)
    def test_network_error_exits_nonzero(self) -> None:
        stderr = io.StringIO()
        with patch.object(gh_tooling, "urlopen", side_effect=URLError("offline")), patch("sys.stderr", stderr):
            with self.assertRaisesRegex(SystemExit, "1"):
                gh_tooling.github_request("GET", "/repos/azhry/nala-grow/pulls/87")

        self.assertIn("Connection error: offline", stderr.getvalue())


class PullRequestCommandTests(unittest.TestCase):
    def test_create_pr_maps_arguments_to_post_request(self) -> None:
        args = argparse.Namespace(
            owner="azhry",
            repo="nala-grow",
            head="audit/fixes",
            base="main",
            title="Audit fixes",
            body="Details",
            draft=True,
            milestone=None,
        )
        with patch.object(gh_tooling, "github_request", return_value={}) as request, patch("builtins.print"):
            gh_tooling.cmd_create_pr(args)

        request.assert_called_once_with(
            "POST",
            "/repos/azhry/nala-grow/pulls",
            {"title": "Audit fixes", "head": "audit/fixes", "base": "main", "body": "Details", "draft": True},
        )

    def test_update_pr_maps_arguments_to_patch_request(self) -> None:
        args = argparse.Namespace(
            owner="azhry",
            repo="nala-grow",
            number=87,
            title="Updated title",
            body=None,
            state="open",
            base=None,
        )
        with patch.object(gh_tooling, "github_request", return_value={}) as request, patch("builtins.print"):
            gh_tooling.cmd_update_pr(args)

        request.assert_called_once_with(
            "PATCH",
            "/repos/azhry/nala-grow/pulls/87",
            {"title": "Updated title", "state": "open"},
        )

    def test_view_pr_maps_arguments_to_get_request(self) -> None:
        args = argparse.Namespace(owner="azhry", repo="nala-grow", number=87)
        with patch.object(gh_tooling, "github_request", return_value={}) as request, patch("builtins.print"):
            gh_tooling.cmd_view_pr(args)

        request.assert_called_once_with("GET", "/repos/azhry/nala-grow/pulls/87")


class DiscussionAndCommitCommentTests(unittest.TestCase):
    def test_list_pr_threads_aggregates_and_tags_all_sources(self) -> None:
        args = argparse.Namespace(owner="azhry", repo="nala-grow", number=87)
        responses = [
            [{"id": 1, "created_at": "2026-08-09T01:00:00Z", "body": "conversation"}],
            [{"id": 2, "created_at": "2026-08-09T02:00:00Z", "path": "app.py"}],
            [{"id": 3, "submitted_at": "2026-08-09T03:00:00Z", "state": "commented"}],
        ]
        with patch.object(gh_tooling, "github_request", side_effect=responses) as request, patch(
            "builtins.print"
        ) as output:
            gh_tooling.cmd_list_pr_threads(args)

        request.assert_has_calls(
            [
                call("GET", "/repos/azhry/nala-grow/issues/87/comments?per_page=100&page=1"),
                call("GET", "/repos/azhry/nala-grow/pulls/87/comments?per_page=100&page=1"),
                call("GET", "/repos/azhry/nala-grow/pulls/87/reviews?per_page=100&page=1"),
            ]
        )
        result = json.loads(output.call_args.args[0])
        self.assertEqual([item["id"] for item in result], [1, 2, 3])
        self.assertEqual(
            [(item["source"], item["kind"]) for item in result],
            [
                ("issue_comments", "issue_comment"),
                ("review_comments", "review_comment"),
                ("reviews", "review_submission"),
            ],
        )

    def test_list_pr_threads_fetches_next_page_when_page_is_full(self) -> None:
        args = argparse.Namespace(owner="azhry", repo="nala-grow", number=87)
        full_page = [
            {"id": index, "created_at": f"2026-08-09T00:{index:02d}:00Z"}
            for index in range(100)
        ]
        responses = [full_page, [{"id": 100, "created_at": "2026-08-09T01:40:00Z"}], [], []]
        with patch.object(gh_tooling, "github_request", side_effect=responses) as request, patch(
            "builtins.print"
        ):
            gh_tooling.cmd_list_pr_threads(args)

        self.assertEqual(
            request.call_args_list[0].args[1],
            "/repos/azhry/nala-grow/issues/87/comments?per_page=100&page=1",
        )
        self.assertEqual(
            request.call_args_list[1].args[1],
            "/repos/azhry/nala-grow/issues/87/comments?per_page=100&page=2",
        )

    def test_list_commit_comments_uses_commit_comments_endpoint(self) -> None:
        args = argparse.Namespace(owner="azhry", repo="nala-grow", commit_sha="abc123")
        response = [{"id": 55, "body": "Please add a test", "path": "app.py"}]
        with patch.object(gh_tooling, "github_request", return_value=response) as request, patch(
            "builtins.print"
        ) as output:
            gh_tooling.cmd_list_commit_comments(args)

        request.assert_called_once_with(
            "GET", "/repos/azhry/nala-grow/commits/abc123/comments?per_page=100&page=1"
        )
        self.assertEqual(json.loads(output.call_args.args[0]), response)

    def test_missing_token_fails_without_exposing_credentials(self) -> None:
        stderr = io.StringIO()
        with patch.dict("os.environ", {}, clear=True), patch("sys.stderr", stderr):
            with self.assertRaisesRegex(SystemExit, "1"):
                gh_tooling.github_request("GET", "/repos/azhry/nala-grow/commits/abc123/comments")

        self.assertIn("GITHUB_TOKEN", stderr.getvalue())
        self.assertNotIn("abc123", stderr.getvalue())

    @patch.dict("os.environ", {"GITHUB_TOKEN": "test-token"}, clear=True)
    def test_commit_comments_http_error_exits_nonzero_without_token(self) -> None:
        error = HTTPError(
            "https://api.github.com/repos/azhry/nala-grow/commits/abc123/comments",
            404,
            "Not Found",
            {},
            io.BytesIO(b'{"message":"Not Found"}'),
        )
        args = argparse.Namespace(owner="azhry", repo="nala-grow", commit_sha="abc123")
        stderr = io.StringIO()
        with patch.object(gh_tooling, "urlopen", side_effect=error), patch("sys.stderr", stderr):
            with self.assertRaisesRegex(SystemExit, "1"):
                gh_tooling.cmd_list_commit_comments(args)

        self.assertIn("HTTP error 404", stderr.getvalue())
        self.assertNotIn("test-token", stderr.getvalue())

    @patch.dict("os.environ", {"GITHUB_TOKEN": "test-token"}, clear=True)
    def test_commit_comments_network_error_exits_nonzero(self) -> None:
        args = argparse.Namespace(owner="azhry", repo="nala-grow", commit_sha="abc123")
        stderr = io.StringIO()
        with patch.object(gh_tooling, "urlopen", side_effect=URLError("offline")), patch(
            "sys.stderr", stderr
        ):
            with self.assertRaisesRegex(SystemExit, "1"):
                gh_tooling.cmd_list_commit_comments(args)

        self.assertIn("Connection error: offline", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
