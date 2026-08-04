"""
Backend-owned agent mission pipeline.

Wires Genie plan → ordered DAG handoffs → critic → optional repair → final,
streaming typed SSE events. Specialists receive prior artifacts (no dead handoffs).
Free path: OpenRouter :free or local Ollama.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Dict, List, Optional

import yaml

def _resolve_config_dir() -> Path:
    env = os.environ.get("NOVA_CONFIG_DIR")
    if env and Path(env).is_dir():
        return Path(env)
    here = Path(__file__).resolve()
    candidates = [
        here.parents[1] / "config",          # apps/sovereign/config
        here.parents[3] / "config",          # nova/config
    ]
    for c in candidates:
        if (c / "pipeline.yaml").exists():
            return c
    return candidates[0]


CONFIG_DIR = _resolve_config_dir()

ORDER_RE = re.compile(
    r"^\s*(?:[-*\d]+[.)]?\s*)?\[?"
    r"(report|design|code|qa|research|integration|repair)"
    r"\]?\s*[:\-]?\s*(.*)$",
    re.IGNORECASE,
)

DEFAULT_WAVES: List[List[str]] = [
    ["research", "design"],
    ["code"],
    ["qa"],
    ["repair"],
    ["report", "integration"],
]


@dataclass
class ArtifactStore:
    run_id: str
    goal: str
    items: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def put(self, role: str, order: str, output: str, name: str = "") -> None:
        self.items[role] = {
            "role": role,
            "name": name or role,
            "order": order,
            "output": output,
            "at": datetime.now(timezone.utc).isoformat(),
        }

    def prior_context(self, exclude: Optional[str] = None, soft_limit: int = 24000) -> str:
        parts: List[str] = []
        total = 0
        for role, item in self.items.items():
            if role == exclude:
                continue
            block = f"## [{item.get('name', role)}] {item.get('order', '')}\n{item.get('output', '')}\n"
            if total + len(block) > soft_limit:
                remain = soft_limit - total
                if remain > 200:
                    parts.append(block[:remain] + "\n…[truncated for context budget]\n")
                break
            parts.append(block)
            total += len(block)
        return "\n".join(parts) if parts else "(no prior specialist output yet)"

    def results_list(self) -> List[Dict[str, str]]:
        return [
            {
                "role": v["role"],
                "name": v.get("name", v["role"]),
                "order": v.get("order", ""),
                "output": v.get("output", ""),
            }
            for v in self.items.values()
        ]


def load_pipeline_config() -> dict:
    path = CONFIG_DIR / "pipeline.yaml"
    if path.exists():
        return yaml.safe_load(path.read_text()) or {}
    return {}


def waves_from_config(cfg: dict) -> List[List[str]]:
    waves = cfg.get("waves")
    if isinstance(waves, list) and waves:
        out: List[List[str]] = []
        for w in waves:
            if isinstance(w, dict) and "parallel" in w:
                out.append(list(w["parallel"]))
            elif isinstance(w, dict) and "serial" in w:
                for role in w["serial"]:
                    out.append([role])
            elif isinstance(w, list):
                out.append(list(w))
        return out or DEFAULT_WAVES
    return DEFAULT_WAVES


def parse_orders(plan_text: str, goal: str, specialists: Dict[str, Dict[str, str]]) -> List[Dict[str, str]]:
    orders: List[Dict[str, str]] = []
    seen: set = set()
    for line in plan_text.splitlines():
        m = ORDER_RE.match(line)
        if not m:
            continue
        role = m.group(1).lower()
        if role not in specialists or role in seen:
            continue
        text = m.group(2).strip()
        if text.count("[") > 2 or len(text) > 400:
            text = ""
        text = text or f"Contribute to this goal: {goal}"
        orders.append({
            "role": role,
            "name": specialists[role]["name"],
            "order": text[:400],
        })
        seen.add(role)
    if not orders:
        for role in ("research", "design", "code", "qa", "report"):
            if role in specialists:
                orders.append({
                    "role": role,
                    "name": specialists[role]["name"],
                    "order": f"Contribute to this goal: {goal}",
                })
    return orders


def order_by_waves(orders: List[Dict[str, str]], waves: List[List[str]]) -> List[List[Dict[str, str]]]:
    by_role = {o["role"]: o for o in orders}
    scheduled: List[List[Dict[str, str]]] = []
    used: set = set()
    for wave in waves:
        batch = [by_role[r] for r in wave if r in by_role]
        if batch:
            scheduled.append(batch)
            used.update(o["role"] for o in batch)
    leftovers = [o for o in orders if o["role"] not in used]
    if leftovers:
        scheduled.append(leftovers)
    return scheduled


async def run_mission(
    *,
    goal: str,
    model: str,
    specialists: Dict[str, Dict[str, str]],
    genie_system: str,
    complete_fn: Callable[..., Any],
    emit: Optional[Callable[[dict], Any]] = None,
) -> Dict[str, Any]:
    """
    complete_fn(system, user_messages, temperature=..., max_tokens=...) -> str
    emit(event_dict) may be sync or async; used for SSE.
    """
    run_id = str(uuid.uuid4())
    store = ArtifactStore(run_id=run_id, goal=goal)
    cfg = load_pipeline_config()
    waves = waves_from_config(cfg)
    max_tokens = int(cfg.get("max_tokens", os.environ.get("NOVA_MAX_TOKENS", "4096")))
    repair_on_fail = bool(cfg.get("repair_on_fail", True))

    async def _emit(ev: dict) -> None:
        ev.setdefault("run_id", run_id)
        ev.setdefault("ts", datetime.now(timezone.utc).isoformat())
        if emit:
            res = emit(ev)
            if asyncio.iscoroutine(res):
                await res

    await _emit({"type": "stage_start", "stage": "plan"})
    plan = await complete_fn(
        genie_system,
        [{"role": "user", "content": f"Goal from the operator:\n{goal}"}],
        temperature=0.4,
        max_tokens=min(max_tokens, 1200),
    )
    orders = parse_orders(plan, goal, specialists)
    await _emit({"type": "plan", "acknowledgement": plan, "orders": orders})
    await _emit({"type": "stage_done", "stage": "plan"})

    scheduled = order_by_waves(orders, waves)

    async def run_one(order: Dict[str, str]) -> None:
        role = order["role"]
        await _emit({"type": "stage_start", "stage": role, "order": order["order"], "name": order["name"]})
        prior = store.prior_context(exclude=role)
        user_msg = (
            f"Overall mission goal:\n{goal}\n\n"
            f"Your specific order:\n{order['order']}\n\n"
            f"Prior specialist outputs (use these — do not ignore handoffs):\n{prior}\n\n"
            "Deliver your part now, following your output format. "
            "Build on prior work; do not restart from zero."
        )
        try:
            output = await complete_fn(
                specialists[role]["system"],
                [{"role": "user", "content": user_msg}],
                temperature=0.5,
                max_tokens=max_tokens,
            )
            store.put(role, order["order"], output, name=order["name"])
            await _emit({
                "type": "stage_done",
                "stage": role,
                "name": order["name"],
                "order": order["order"],
                "output": output,
            })
            await _emit({"type": "handoff", "from": role, "artifact_chars": len(output)})
        except Exception as e:  # noqa: BLE001
            err = f"(agent error: {e})"
            store.put(role, order["order"], err, name=order["name"])
            await _emit({
                "type": "stage_done",
                "stage": role,
                "name": order["name"],
                "order": order["order"],
                "output": err,
                "error": str(e),
            })

    for batch in scheduled:
        # Conditionally skip repair wave unless QA failed
        if len(batch) == 1 and batch[0]["role"] == "repair":
            qa = store.items.get("qa", {}).get("output", "")
            failed = bool(re.search(r"VERDICT:\s*FAIL", qa, re.I))
            if not (repair_on_fail and failed):
                await _emit({"type": "stage_done", "stage": "repair", "skipped": True, "reason": "qa_pass_or_no_qa"})
                continue
        await asyncio.gather(*(run_one(o) for o in batch))

    # Critic
    await _emit({"type": "stage_start", "stage": "critic"})
    body = store.prior_context(soft_limit=32000)
    critic_prompt = (
        f"Original goal:\n{goal}\n\nAssembled team output:\n{body}\n\n"
        "Judge whether the assembled output satisfies the goal. Emit exactly:\n"
        "  VERDICT: PASS|FAIL\n  RATIONALE: one short paragraph\n  P0_ISSUES: bullets (or 'none')"
    )
    qa_system = specialists.get("qa", {}).get("system", "You are QA.")
    try:
        verdict = await complete_fn(
            qa_system,
            [{"role": "user", "content": critic_prompt}],
            temperature=0.3,
            max_tokens=min(max_tokens, 1200),
        )
    except Exception as e:  # noqa: BLE001
        verdict = f"VERDICT: FAIL\nRATIONALE: critic error: {e}\nP0_ISSUES:\n- critic failed"
    await _emit({"type": "critic", "verdict": verdict})
    await _emit({"type": "stage_done", "stage": "critic"})

    # Optional post-critic repair if FAIL and repair not already run
    if repair_on_fail and re.search(r"VERDICT:\s*FAIL", verdict, re.I) and "repair" not in store.items and "repair" in specialists:
        await run_one({
            "role": "repair",
            "name": specialists["repair"]["name"],
            "order": f"Fix P0 issues from critic so the goal is met:\n{verdict}",
        })

    final_parts = [f"# Mission report\n\n**Goal:** {goal}\n\n## Genie plan\n\n{plan}\n"]
    for item in store.results_list():
        final_parts.append(f"## {item['name']}\n\n> {item['order']}\n\n{item['output']}\n")
    final_parts.append(f"## Critic verdict\n\n{verdict}\n")
    final_text = "\n".join(final_parts)

    await _emit({"type": "final", "text": final_text, "results": store.results_list(), "verdict": verdict})
    await _emit({"type": "done", "ok": True})

    return {
        "run_id": run_id,
        "goal": goal,
        "model": model,
        "plan": plan,
        "orders": orders,
        "results": store.results_list(),
        "verdict": verdict,
        "final": final_text,
    }
