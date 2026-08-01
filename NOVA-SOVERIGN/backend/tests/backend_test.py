"""
NOVA backend regression tests.
Covers auth, meta, chat, notes, tasks, docs, dashboard.
"""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"
EMAIL = "boss@nova.app"
PASSWORD = "NovaBoss2026!"
TIMEOUT = 90


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=TIMEOUT)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- auth ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body and isinstance(body["access_token"], str)
        assert body.get("email") == EMAIL

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": "wrong"}, timeout=TIMEOUT)
        assert r.status_code == 401

    def test_login_wrong_email(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nope@nova.app", "password": PASSWORD}, timeout=TIMEOUT)
        assert r.status_code == 401

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=TIMEOUT)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        assert body.get("email") == EMAIL


# ---------- meta ----------
class TestMeta:
    def test_models(self, auth_headers):
        r = requests.get(f"{API}/meta/models", headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        assert body.get("default") == "gpt-5.2"
        ids = {m["id"] for m in body.get("models", [])}
        assert {"gpt-5.2", "claude-sonnet-4-5", "gemini-2.5-pro", "gemini-2.5-flash"}.issubset(ids)

    def test_personas(self, auth_headers):
        r = requests.get(f"{API}/meta/personas", headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 200
        personas = r.json().get("personas", [])
        ids = {p["id"] for p in personas}
        assert {"default", "coach", "tutor", "coder", "writer", "strategist"}.issubset(ids)
        assert len(personas) == 6


# ---------- chat ----------
class TestChat:
    session_id = None

    def test_chat_creates_session_and_persists(self, auth_headers):
        r = requests.post(f"{API}/chat", headers=auth_headers, json={
            "message": "Reply with the single word: HELLO",
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("session_id")
        assert body.get("reply")
        assert body.get("model") == "gpt-5.2"
        TestChat.session_id = body["session_id"]

        # history reflects 2 messages in order
        h = requests.get(f"{API}/chat/history/{TestChat.session_id}", headers=auth_headers, timeout=TIMEOUT)
        assert h.status_code == 200
        msgs = h.json().get("messages", [])
        assert len(msgs) >= 2
        assert msgs[0]["role"] == "user"
        assert msgs[1]["role"] == "assistant"

    def test_chat_continues_session(self, auth_headers):
        assert TestChat.session_id, "needs prior session"
        r = requests.post(f"{API}/chat", headers=auth_headers, json={
            "message": "What word did you reply with last? One word only.",
            "session_id": TestChat.session_id,
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert r.json().get("session_id") == TestChat.session_id

    def test_chat_persona_coach(self, auth_headers):
        r = requests.post(f"{API}/chat", headers=auth_headers, json={
            "message": "Give me one accountability question.",
            "persona": "coach",
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("persona") == "coach"
        # cleanup
        requests.delete(f"{API}/chat/session/{body['session_id']}", headers=auth_headers, timeout=TIMEOUT)

    def test_sessions_list_and_delete(self, auth_headers):
        assert TestChat.session_id
        s = requests.get(f"{API}/chat/sessions", headers=auth_headers, timeout=TIMEOUT)
        assert s.status_code == 200
        sessions = s.json()
        assert any(x["session_id"] == TestChat.session_id for x in sessions)

        d = requests.delete(f"{API}/chat/session/{TestChat.session_id}", headers=auth_headers, timeout=TIMEOUT)
        assert d.status_code == 200
        h = requests.get(f"{API}/chat/history/{TestChat.session_id}", headers=auth_headers, timeout=TIMEOUT)
        assert h.status_code == 200
        assert h.json().get("messages") == []


# ---------- notes ----------
class TestNotes:
    note_id = None

    def test_create_list_update_summarize_delete(self, auth_headers):
        # create
        r = requests.post(f"{API}/notes", headers=auth_headers, json={
            "title": "TEST_Note_Roadmap",
            "content": "Roadmap for Q1 2026: ship NOVA MVP, integrate chat, notes, tasks, docs. Priority is reliability and speed.",
            "tags": ["test"],
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        n = r.json()
        assert n["id"] and n["title"] == "TEST_Note_Roadmap"
        TestNotes.note_id = n["id"]

        # list contains it
        lst = requests.get(f"{API}/notes", headers=auth_headers, timeout=TIMEOUT).json()
        assert any(x["id"] == TestNotes.note_id for x in lst)

        # update
        u = requests.patch(f"{API}/notes/{TestNotes.note_id}", headers=auth_headers,
                           json={"title": "TEST_Note_Roadmap_v2"}, timeout=TIMEOUT)
        assert u.status_code == 200
        assert u.json()["title"] == "TEST_Note_Roadmap_v2"

        # summarize
        s = requests.post(f"{API}/notes/{TestNotes.note_id}/summarize", headers=auth_headers, timeout=TIMEOUT)
        assert s.status_code == 200, s.text
        summary = s.json().get("summary")
        assert summary and len(summary.strip()) > 0

        # persisted on note
        lst2 = requests.get(f"{API}/notes", headers=auth_headers, timeout=TIMEOUT).json()
        match = next((x for x in lst2 if x["id"] == TestNotes.note_id), None)
        assert match and match.get("summary")

    def test_delete_note(self, auth_headers):
        assert TestNotes.note_id
        d = requests.delete(f"{API}/notes/{TestNotes.note_id}", headers=auth_headers, timeout=TIMEOUT)
        assert d.status_code == 200
        # confirm gone
        d2 = requests.delete(f"{API}/notes/{TestNotes.note_id}", headers=auth_headers, timeout=TIMEOUT)
        assert d2.status_code == 404


# ---------- tasks ----------
class TestTasks:
    ids: list = []

    def test_create_update_prioritize_delete(self, auth_headers):
        for title, pri in [("TEST_Ship NOVA MVP", "urgent"), ("TEST_Write blog", "low"), ("TEST_Fix bug X", "high")]:
            r = requests.post(f"{API}/tasks", headers=auth_headers, json={"title": title, "priority": pri}, timeout=TIMEOUT)
            assert r.status_code == 200, r.text
            TestTasks.ids.append(r.json()["id"])

        lst = requests.get(f"{API}/tasks", headers=auth_headers, timeout=TIMEOUT).json()
        assert all(any(t["id"] == i for t in lst) for i in TestTasks.ids)

        # toggle done
        u = requests.patch(f"{API}/tasks/{TestTasks.ids[1]}", headers=auth_headers,
                           json={"done": True}, timeout=TIMEOUT)
        assert u.status_code == 200 and u.json()["done"] is True

        # priority change
        u2 = requests.patch(f"{API}/tasks/{TestTasks.ids[0]}", headers=auth_headers,
                            json={"priority": "high"}, timeout=TIMEOUT)
        assert u2.status_code == 200 and u2.json()["priority"] == "high"

        # prioritize (only open tasks)
        p = requests.post(f"{API}/tasks/prioritize", headers=auth_headers, timeout=TIMEOUT)
        assert p.status_code == 200, p.text
        ranked = p.json().get("ranked", [])
        assert isinstance(ranked, list) and len(ranked) >= 1
        for item in ranked:
            assert "id" in item and "rank" in item

        # check ai_rank persisted on at least one task
        lst2 = requests.get(f"{API}/tasks", headers=auth_headers, timeout=TIMEOUT).json()
        any_ranked = any(t.get("ai_rank") is not None for t in lst2 if t["id"] in TestTasks.ids and not t.get("done"))
        assert any_ranked, "expected ai_rank to be set on at least one open test task"

    def test_cleanup_tasks(self, auth_headers):
        for tid in TestTasks.ids:
            requests.delete(f"{API}/tasks/{tid}", headers=auth_headers, timeout=TIMEOUT)


# ---------- docs ----------
class TestDocs:
    doc_id_paste = None
    doc_id_upload = None

    def test_paste_doc_and_ask(self, auth_headers):
        content = (
            "NOVA Project Charter. Owner: Boss. Mission: build a personal AI assistant."
            " The kickoff date is January 15, 2026. The launch target is February 28, 2026."
            " Risk: third-party LLM downtime."
        )
        r = requests.post(f"{API}/docs", headers=auth_headers,
                         json={"title": "TEST_Charter", "content": content}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"] and "content" not in body
        TestDocs.doc_id_paste = body["id"]

        # list excludes content
        lst = requests.get(f"{API}/docs", headers=auth_headers, timeout=TIMEOUT).json()
        match = next((d for d in lst if d["id"] == TestDocs.doc_id_paste), None)
        assert match and "content" not in match

        # full get includes content
        g = requests.get(f"{API}/docs/{TestDocs.doc_id_paste}", headers=auth_headers, timeout=TIMEOUT)
        assert g.status_code == 200 and g.json().get("content")

        # ask grounded question
        a = requests.post(f"{API}/docs/ask", headers=auth_headers, json={
            "doc_id": TestDocs.doc_id_paste,
            "question": "What is the launch target date?",
        }, timeout=TIMEOUT)
        assert a.status_code == 200, a.text
        ans = a.json().get("answer", "").lower()
        # should mention February 28 (or 2026)
        assert "february" in ans or "feb" in ans or "28" in ans, f"answer not grounded: {ans!r}"

    def test_upload_txt(self, auth_headers):
        content = b"This is a plain test document. The secret code is BANANA-42."
        files = {"file": ("test_upload.txt", io.BytesIO(content), "text/plain")}
        r = requests.post(f"{API}/docs/upload", headers=auth_headers, files=files, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"] and body["title"] == "test_upload.txt"
        TestDocs.doc_id_upload = body["id"]

    def test_delete_docs(self, auth_headers):
        for d in [TestDocs.doc_id_paste, TestDocs.doc_id_upload]:
            if d:
                r = requests.delete(f"{API}/docs/{d}", headers=auth_headers, timeout=TIMEOUT)
                assert r.status_code == 200


# ---------- dashboard ----------
class TestDashboard:
    def test_dashboard(self, auth_headers):
        r = requests.get(f"{API}/dashboard", headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        counts = body.get("counts", {})
        for k in ("notes", "tasks_open", "tasks_done", "docs", "chats"):
            assert k in counts and isinstance(counts[k], int)
        assert isinstance(body.get("recent_notes"), list)
        assert isinstance(body.get("recent_tasks"), list)
