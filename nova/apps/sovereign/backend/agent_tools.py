"""
agent_tools.py — the Agent Runtime's real tools.

Files / Shell / Git, all sandboxed to a single workspace root so a language
model can act autonomously without touching the rest of the system. Every
write is backed up first so it can be restored.
"""
from __future__ import annotations

import os
import shlex
import subprocess
from pathlib import Path
from typing import Any, Dict

WORKSPACE = Path(os.environ.get("AGENT_WORKSPACE", "./agent_workspace")).resolve()
WORKSPACE.mkdir(parents=True, exist_ok=True)


def _safe(path: str) -> Path:
    """Resolve a path and guarantee it stays inside the workspace sandbox."""
    p = (WORKSPACE / path).resolve()
    if not str(p).startswith(str(WORKSPACE)):
        raise ValueError(f"path escapes workspace: {path}")
    return p


def _git_ready() -> None:
    if not (WORKSPACE / ".git").exists():
        _run(["git", "init", "-q"])
        _run(["git", "config", "user.email", "nova@sovereign.ai"])
        _run(["git", "config", "user.name", "NOVA Agent"])


def _run(args: list[str], timeout: int = 30) -> Dict[str, Any]:
    proc = subprocess.run(
        args, cwd=str(WORKSPACE), capture_output=True, text=True, timeout=timeout
    )
    return {
        "cmd": " ".join(args),
        "exit_code": proc.returncode,
        "stdout": proc.stdout[-6000:],
        "stderr": proc.stderr[-3000:],
    }


# ---------- filesystem ----------
def fs_list(path: str = ".") -> Dict[str, Any]:
    target = _safe(path)
    if not target.exists():
        return {"path": path, "entries": [], "error": "not found"}
    if target.is_file():
        return {"path": path, "entries": [target.name], "is_file": True}
    entries = sorted(
        [f"{c.name}/" if c.is_dir() else c.name for c in target.iterdir()]
    )
    return {"path": path, "entries": entries}


def fs_read(path: str, max_chars: int = 8000) -> Dict[str, Any]:
    target = _safe(path)
    if not target.exists() or not target.is_file():
        return {"path": path, "error": "not found"}
    text = target.read_text(encoding="utf-8", errors="replace")
    return {"path": path, "content": text[:max_chars], "chars": len(text)}


def fs_write(path: str, content: str) -> Dict[str, Any]:
    target = _safe(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    backed_up = False
    if target.exists():
        bak = target.with_suffix(target.suffix + ".bak")
        bak.write_text(target.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")
        backed_up = True
    target.write_text(content, encoding="utf-8")
    return {"path": path, "bytes": len(content.encode()), "backup_created": backed_up}


def fs_restore(path: str) -> Dict[str, Any]:
    target = _safe(path)
    bak = target.with_suffix(target.suffix + ".bak")
    if not bak.exists():
        return {"path": path, "error": "no backup found"}
    target.write_text(bak.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")
    return {"path": path, "restored_from": bak.name}


# ---------- shell ----------
def sh_run(cmd: str, timeout: int = 30) -> Dict[str, Any]:
    return _run(shlex.split(cmd), timeout=timeout)


# ---------- git ----------
def git_run(args: str) -> Dict[str, Any]:
    _git_ready()
    return _run(["git"] + shlex.split(args))


# ---------- registry for the ReAct loop ----------
REGISTRY = {
    "fs.list": (fs_list, "List files in a workspace directory. args: {path}"),
    "fs.read": (fs_read, "Read a workspace file. args: {path}"),
    "fs.write": (fs_write, "Write a workspace file (auto-backup). args: {path, content}"),
    "fs.restore": (fs_restore, "Restore a file from its .bak backup. args: {path}"),
    "sh.run": (sh_run, "Run a shell command inside the workspace. args: {cmd}"),
    "git.run": (git_run, "Run a git command inside the workspace. args: {args}"),
}


def describe_tools() -> str:
    return "TOOLS AVAILABLE:\n" + "\n".join(f"- {name}: {desc}" for name, (_fn, desc) in REGISTRY.items())


def invoke(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    entry = REGISTRY.get(name)
    if not entry:
        return {"error": f"unknown tool: {name}"}
    fn = entry[0]
    try:
        return fn(**(args or {}))
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
