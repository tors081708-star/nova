"""
NOVA — Personal AI Assistant backend.

Features:
- Auth: JWT, single admin from env
- Chat: multi-model (GPT-5.2 / Claude Sonnet 4.5 / Gemini 2.5 Pro) with session memory
- Notes: CRUD + AI summarize
- Tasks: CRUD + AI prioritize
- Documents: paste/upload text, ask questions grounded in the doc
- Personas: built-in system prompts + custom
- Dashboard: aggregate stats
"""
from __future__ import annotations

import os
import io
import uuid
import jwt
import bcrypt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pypdf import PdfReader

from openai import AsyncOpenAI

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    HAS_EMERGENT = True
except ImportError:
    HAS_EMERGENT = False
    LlmChat = None
    UserMessage = None

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nova")

# ---------- env ----------
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-insecure-change-me")
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 7

ADMIN_EMAIL = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD") or ""
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

# LLM backend selection: "emergent" (cloud via Emergent Universal Key) or "ollama" (fully local)
LLM_BACKEND = os.environ.get("LLM_BACKEND", "emergent").strip().lower()
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODELS = [
    m.strip() for m in os.environ.get("OLLAMA_MODELS", "llama3.1:8b").split(",") if m.strip()
]

# ---------- model registry ----------
_EMERGENT_MODELS = {
    "gpt-5.2": {"provider": "openai", "model": "gpt-5.2", "label": "GPT-5.2", "vendor": "OpenAI"},
    "claude-sonnet-4-5": {"provider": "anthropic", "model": "claude-sonnet-4-5-20250929", "label": "Claude Sonnet 4.5", "vendor": "Anthropic"},
    "gemini-2.5-pro": {"provider": "gemini", "model": "gemini-2.5-pro", "label": "Gemini 2.5 Pro", "vendor": "Google"},
    "gemini-2.5-flash": {"provider": "gemini", "model": "gemini-2.5-flash", "label": "Gemini 2.5 Flash", "vendor": "Google"},
}


def _pretty_ollama_label(tag: str) -> str:
    base = tag.split(":")[0]
    return base.replace("-", " ").title() + (f" ({tag.split(':',1)[1]})" if ":" in tag else "")


def _build_models() -> Dict[str, Dict[str, str]]:
    if LLM_BACKEND == "ollama":
        return {
            tag: {
                "provider": "ollama",
                "model": tag,
                "label": _pretty_ollama_label(tag),
                "vendor": "Ollama · local",
            }
            for tag in OLLAMA_MODELS
        } or {
            "llama3.1:8b": {
                "provider": "ollama",
                "model": "llama3.1:8b",
                "label": "Llama 3.1 8B",
                "vendor": "Ollama · local",
            }
        }
    return _EMERGENT_MODELS


MODELS = _build_models()
DEFAULT_MODEL = (
    next(iter(MODELS)) if LLM_BACKEND == "ollama" else "gpt-5.2"
)

logger.info("LLM backend: %s · default model: %s", LLM_BACKEND, DEFAULT_MODEL)

# ---------- personas ----------
PERSONAS = {
    "default": {
        "id": "default",
        "name": "NOVA",
        "tagline": "Your everyday AI companion",
        "icon": "sparkles",
        "system": (
            "You are NOVA, a warm, sharp, and genuinely helpful personal AI assistant. "
            "You help with everyday tasks: answering questions, drafting text, coding help, "
            "brainstorming, summarizing, planning. Be concise by default; go deep when asked. "
            "Have opinions when asked for them. Admit when you don't know. Format with clean "
            "Markdown (headings, lists, short paragraphs) when it aids clarity."
        ),
    },
    "coach": {
        "id": "coach",
        "name": "Coach",
        "tagline": "Accountability & motivation",
        "icon": "flame",
        "system": (
            "You are Coach, a supportive but no-nonsense personal coach. Help the user "
            "set clear goals, identify the next smallest action, and stay accountable. "
            "Ask sharp questions. Reflect back what you hear. Celebrate wins. Never lecture. "
            "Keep responses focused and action-oriented."
        ),
    },
    "tutor": {
        "id": "tutor",
        "name": "Tutor",
        "tagline": "Patient teacher on any subject",
        "icon": "graduation-cap",
        "system": (
            "You are Tutor, a patient teacher who can explain any subject. Start simple, "
            "build up. Use analogies and examples. After each explanation, offer a quick "
            "check-your-understanding question. Encourage, never condescend."
        ),
    },
    "coder": {
        "id": "coder",
        "name": "Coder",
        "tagline": "Pair programming partner",
        "icon": "code",
        "system": (
            "You are Coder, a senior software engineer pair-programming with the user. "
            "Write clean, idiomatic code with short explanations. Call out edge cases. "
            "Suggest tests when relevant. Prefer boring correct solutions over clever ones."
        ),
    },
    "writer": {
        "id": "writer",
        "name": "Writer",
        "tagline": "Crafts clear, compelling prose",
        "icon": "feather",
        "system": (
            "You are Writer, a skilled editor and ghostwriter. Help the user write with "
            "clarity, rhythm, and voice. Offer 2-3 variations when drafting. Cut filler. "
            "Preserve the user's voice — don't over-polish."
        ),
    },
    "strategist": {
        "id": "strategist",
        "name": "Strategist",
        "tagline": "Thinks in frameworks",
        "icon": "compass",
        "system": (
            "You are Strategist, a clear-eyed thinking partner. Use frameworks (SWOT, "
            "first-principles, second-order effects, MECE) where they actually help. "
            "Probe assumptions. Give a recommendation, not a menu."
        ),
    },
}

# ---------- db ----------
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# ---------- app ----------
app = FastAPI(title="NOVA API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
bearer = HTTPBearer(auto_error=False)

api = APIRouter(prefix="/api")


# ---------- auth helpers ----------
def make_token(sub: str) -> str:
    payload = {
        "sub": sub,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        sub = (payload.get("sub") or "").lower()
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not ADMIN_EMAIL or sub != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"id": sub, "email": sub}


# ---------- pydantic models ----------
class LoginRequest(BaseModel):
    email: str
    password: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None
    persona: Optional[str] = None
    context: Optional[str] = None  # extra context (e.g., a doc being discussed)


class NoteIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = ""
    tags: List[str] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


class TaskIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    notes: Optional[str] = ""
    due: Optional[str] = None  # ISO string
    priority: Optional[str] = "normal"  # low | normal | high | urgent


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    due: Optional[str] = None
    priority: Optional[str] = None
    done: Optional[bool] = None


class DocIn(BaseModel):
    title: str
    content: str


class DocQuestion(BaseModel):
    doc_id: str
    question: str
    model: Optional[str] = None


# ---------- LLM helper ----------
def resolve_model(model_key: Optional[str]) -> Dict[str, str]:
    key = model_key if model_key in MODELS else DEFAULT_MODEL
    return {"key": key, **MODELS[key]}


async def llm_once(system_prompt: str, user_text: str, model_key: Optional[str] = None) -> str:
    """One-shot LLM call (no history) for utility tasks like summarize/prioritize."""
    m = resolve_model(model_key)
    return await _dispatch_llm(system=system_prompt, user_text=user_text, model_info=m)


async def _dispatch_llm(system: str, user_text: str, model_info: Dict[str, str]) -> str:
    """Route a single-turn call to the right backend."""
    if model_info["provider"] == "ollama":
        client = AsyncOpenAI(api_key="ollama", base_url=f"{OLLAMA_BASE_URL}/v1")
        resp = await client.chat.completions.create(
            model=model_info["model"],
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            temperature=0.6,
        )
        return (resp.choices[0].message.content or "").strip()
    # Emergent Universal Key path
    if not HAS_EMERGENT:
        raise HTTPException(500, "emergentintegrations package not installed. Set LLM_BACKEND=ollama to use local Ollama instead")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY is not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"oneshot-{uuid.uuid4()}",
        system_message=system,
    ).with_model(model_info["provider"], model_info["model"])
    return await chat.send_message(UserMessage(text=user_text))


# ---------- routes: auth ----------
@api.post("/auth/login")
async def login(req: LoginRequest):
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        raise HTTPException(500, "Admin not configured")
    if req.email.strip().lower() != ADMIN_EMAIL or req.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid email or password")
    return {"access_token": make_token(ADMIN_EMAIL), "email": ADMIN_EMAIL}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------- routes: meta ----------
@api.get("/meta/models")
async def list_models(_user=Depends(get_current_user)):
    return {
        "backend": LLM_BACKEND,
        "default": DEFAULT_MODEL,
        "models": [{"id": k, **v} for k, v in MODELS.items()],
    }


@api.get("/meta/personas")
async def list_personas(_user=Depends(get_current_user)):
    return {"personas": list(PERSONAS.values())}


# ---------- routes: chat ----------
@api.post("/chat/new-session")
async def new_chat_session(_user=Depends(get_current_user)):
    return {"session_id": str(uuid.uuid4())}


@api.get("/chat/sessions")
async def chat_sessions(user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$sort": {"at": -1}},
        {"$group": {
            "_id": "$session_id",
            "last_at": {"$first": "$at"},
            "last_content": {"$first": "$content"},
            "persona": {"$first": "$persona"},
            "model": {"$first": "$model"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"last_at": -1}},
        {"$limit": 50},
    ]
    rows = await db.chat_messages.aggregate(pipeline).to_list(length=50)
    return [
        {
            "session_id": r["_id"],
            "last_at": r["last_at"],
            "preview": (r.get("last_content") or "")[:90],
            "persona": r.get("persona") or "default",
            "model": r.get("model") or DEFAULT_MODEL,
            "count": r["count"],
        }
        for r in rows
    ]


@api.get("/chat/history/{session_id}")
async def chat_history(session_id: str, user=Depends(get_current_user)):
    msgs = (
        await db.chat_messages
        .find({"session_id": session_id, "user_id": user["id"]}, {"_id": 0})
        .sort("at", 1)
        .to_list(length=500)
    )
    return {"session_id": session_id, "messages": msgs}


@api.delete("/chat/session/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    await db.chat_messages.delete_many({"session_id": session_id, "user_id": user["id"]})
    return {"ok": True}


@api.post("/chat")
async def chat(req: ChatRequest, user=Depends(get_current_user)):
    if LLM_BACKEND == "emergent" and not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured on server")

    persona_key = req.persona if req.persona in PERSONAS else "default"
    persona = PERSONAS[persona_key]
    model_info = resolve_model(req.model)
    session_id = req.session_id or str(uuid.uuid4())
    user_id = user["id"]

    # persist user message
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "role": "user",
        "content": req.message,
        "persona": persona_key,
        "model": model_info["key"],
        "at": now,
    })

    # load prior messages for context
    prior = (
        await db.chat_messages
        .find({"session_id": session_id, "user_id": user_id}, {"_id": 0})
        .sort("at", 1)
        .limit(40)
        .to_list(length=40)
    )

    system = persona["system"]
    if req.context:
        system += f"\n\nCONTEXT DOCUMENT the user is discussing:\n{req.context[:8000]}"

    try:
        if model_info["provider"] == "ollama":
            # Native multi-turn via OpenAI-compatible Ollama endpoint
            client = AsyncOpenAI(api_key="ollama", base_url=f"{OLLAMA_BASE_URL}/v1")
            messages = [{"role": "system", "content": system}]
            for m in prior[:-1][-20:]:  # last 20 prior turns (exclude the just-inserted user msg)
                if m["role"] in ("user", "assistant"):
                    messages.append({"role": m["role"], "content": m["content"]})
            messages.append({"role": "user", "content": req.message})
            resp = await client.chat.completions.create(
                model=model_info["model"],
                messages=messages,
                temperature=0.6,
            )
            reply_text = (resp.choices[0].message.content or "").strip()
        else:
            # Emergent path: embed history in system prompt so each call is stateless but contextual
            if not HAS_EMERGENT:
                raise HTTPException(500, "emergentintegrations package not installed. Set LLM_BACKEND=ollama to use local Ollama instead")
            past = prior[:-1][-20:]
            if past:
                lines = []
                for m in past:
                    role = "User" if m["role"] == "user" else "NOVA"
                    lines.append(f"{role}: {m['content']}")
                system_with_history = system + "\n\nPRIOR CONVERSATION (for context):\n" + "\n".join(lines)
            else:
                system_with_history = system
            chat_obj = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=system_with_history,
            ).with_model(model_info["provider"], model_info["model"])
            reply_text = await chat_obj.send_message(UserMessage(text=req.message))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(502, f"LLM error: {str(e)[:200]}")

    reply = (reply_text or "").strip() or "…"

    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "role": "assistant",
        "content": reply,
        "persona": persona_key,
        "model": model_info["key"],
        "at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "session_id": session_id,
        "reply": reply,
        "model": model_info["key"],
        "model_label": model_info["label"],
        "persona": persona_key,
    }


# ---------- routes: notes ----------
@api.get("/notes")
async def list_notes(user=Depends(get_current_user)):
    rows = await db.notes.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return rows


@api.post("/notes")
async def create_note(payload: NoteIn, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": payload.title,
        "content": payload.content,
        "tags": payload.tags,
        "summary": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.notes.insert_one(dict(doc))
    return doc


@api.patch("/notes/{note_id}")
async def update_note(note_id: str, payload: NoteUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    # invalidate stale summary if content changed
    if "content" in update:
        update["summary"] = None
    res = await db.notes.update_one(
        {"id": note_id, "user_id": user["id"]}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Note not found")
    doc = await db.notes.find_one({"id": note_id, "user_id": user["id"]}, {"_id": 0})
    return doc


@api.delete("/notes/{note_id}")
async def delete_note(note_id: str, user=Depends(get_current_user)):
    res = await db.notes.delete_one({"id": note_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Note not found")
    return {"ok": True}


@api.post("/notes/{note_id}/summarize")
async def summarize_note(note_id: str, user=Depends(get_current_user)):
    note = await db.notes.find_one({"id": note_id, "user_id": user["id"]}, {"_id": 0})
    if not note:
        raise HTTPException(404, "Note not found")
    if not (note.get("content") or "").strip():
        raise HTTPException(400, "Note is empty")
    summary = await llm_once(
        system_prompt=(
            "You are a precise summarizer. Produce a concise 3-5 bullet summary of the "
            "user's note, capturing key points, decisions, and any action items. Use "
            "short sentences. No preamble."
        ),
        user_text=f"Title: {note['title']}\n\nContent:\n{note['content']}",
    )
    await db.notes.update_one(
        {"id": note_id, "user_id": user["id"]},
        {"$set": {"summary": summary, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"id": note_id, "summary": summary}


# ---------- routes: tasks ----------
@api.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    rows = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api.post("/tasks")
async def create_task(payload: TaskIn, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": payload.title,
        "notes": payload.notes or "",
        "due": payload.due,
        "priority": payload.priority or "normal",
        "done": False,
        "ai_rank": None,
        "ai_reason": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.tasks.insert_one(dict(doc))
    return doc


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.tasks.update_one(
        {"id": task_id, "user_id": user["id"]}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Task not found")
    doc = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    return doc


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    res = await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


@api.post("/tasks/prioritize")
async def prioritize_tasks(user=Depends(get_current_user)):
    tasks = await db.tasks.find(
        {"user_id": user["id"], "done": False}, {"_id": 0}
    ).to_list(200)
    if not tasks:
        return {"ranked": []}

    lines = []
    for t in tasks:
        lines.append(
            f"- id={t['id']} | title={t['title']} | due={t.get('due') or 'none'} "
            f"| priority={t.get('priority')} | notes={(t.get('notes') or '')[:120]}"
        )
    prompt = (
        "Rank the following tasks from most to least important to tackle NEXT. "
        "Consider urgency (due date), stated priority, blocker-potential, and quick wins. "
        "Return STRICT JSON with shape: "
        '{"ranked":[{"id":"...","rank":1,"reason":"short reason"}]}. '
        "No prose, no markdown fences. Reason must be under 120 chars."
        "\n\nTASKS:\n" + "\n".join(lines)
    )
    raw = await llm_once(
        system_prompt="You are a precise task prioritizer. Output only valid JSON.",
        user_text=prompt,
    )

    import json, re
    ranked = []
    try:
        # strip code fences if any
        cleaned = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        data = json.loads(cleaned)
        ranked = data.get("ranked", [])
    except Exception:
        logger.warning("Prioritize parse failed; raw=%s", raw[:200])
        # fallback: simple order
        ranked = [{"id": t["id"], "rank": i + 1, "reason": "fallback"} for i, t in enumerate(tasks)]

    # persist ranks
    for item in ranked:
        await db.tasks.update_one(
            {"id": item.get("id"), "user_id": user["id"]},
            {"$set": {
                "ai_rank": item.get("rank"),
                "ai_reason": (item.get("reason") or "")[:200],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

    return {"ranked": ranked}


# ---------- routes: documents ----------
@api.get("/docs")
async def list_docs(user=Depends(get_current_user)):
    rows = await db.docs.find(
        {"user_id": user["id"]}, {"_id": 0, "content": 0}
    ).sort("created_at", -1).to_list(100)
    return rows


@api.get("/docs/{doc_id}")
async def get_doc(doc_id: str, user=Depends(get_current_user)):
    doc = await db.docs.find_one({"id": doc_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Doc not found")
    return doc


@api.post("/docs")
async def create_doc(payload: DocIn, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": payload.title,
        "content": payload.content,
        "size": len(payload.content),
        "source": "paste",
        "created_at": now,
    }
    await db.docs.insert_one(dict(doc))
    return {k: v for k, v in doc.items() if k != "content"}


@api.post("/docs/upload")
async def upload_doc(file: UploadFile = File(...), user=Depends(get_current_user)):
    data = await file.read()
    name = file.filename or "document"
    content = ""
    try:
        if name.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(data))
            content = "\n\n".join((p.extract_text() or "") for p in reader.pages)
        else:
            content = data.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(400, f"Could not read file: {e}")

    if not content.strip():
        raise HTTPException(400, "No readable text found in file")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": name,
        "content": content,
        "size": len(content),
        "source": "upload",
        "created_at": now,
    }
    await db.docs.insert_one(dict(doc))
    return {k: v for k, v in doc.items() if k != "content"}


@api.delete("/docs/{doc_id}")
async def delete_doc(doc_id: str, user=Depends(get_current_user)):
    res = await db.docs.delete_one({"id": doc_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Doc not found")
    return {"ok": True}


@api.post("/docs/ask")
async def ask_doc(payload: DocQuestion, user=Depends(get_current_user)):
    doc = await db.docs.find_one({"id": payload.doc_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Doc not found")
    excerpt = (doc.get("content") or "")[:16000]
    system = (
        "You are a precise document Q&A assistant. Answer ONLY based on the provided "
        "DOCUMENT. If the answer isn't in the document, say so plainly. Quote short "
        "passages when helpful. Be concise."
    )
    user_prompt = (
        f"DOCUMENT TITLE: {doc['title']}\n\nDOCUMENT:\n{excerpt}\n\n"
        f"QUESTION: {payload.question}"
    )
    answer = await llm_once(system, user_prompt, payload.model)
    return {"answer": answer, "doc_id": payload.doc_id}


# ---------- routes: dashboard ----------
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    uid = user["id"]
    notes_count = await db.notes.count_documents({"user_id": uid})
    tasks_open = await db.tasks.count_documents({"user_id": uid, "done": False})
    tasks_done = await db.tasks.count_documents({"user_id": uid, "done": True})
    docs_count = await db.docs.count_documents({"user_id": uid})

    # sessions
    sessions = await db.chat_messages.distinct("session_id", {"user_id": uid})

    # recent
    recent_notes = await db.notes.find(
        {"user_id": uid}, {"_id": 0, "id": 1, "title": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(5).to_list(5)
    recent_tasks = await db.tasks.find(
        {"user_id": uid, "done": False},
        {"_id": 0, "id": 1, "title": 1, "priority": 1, "due": 1, "ai_rank": 1},
    ).sort([("ai_rank", 1), ("created_at", -1)]).limit(5).to_list(5)

    return {
        "counts": {
            "notes": notes_count,
            "tasks_open": tasks_open,
            "tasks_done": tasks_done,
            "docs": docs_count,
            "chats": len(sessions),
        },
        "recent_notes": recent_notes,
        "recent_tasks": recent_tasks,
    }


# ---------- health ----------
@api.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "nova",
        "backend": LLM_BACKEND,
        "default_model": DEFAULT_MODEL,
        "ts": datetime.now(timezone.utc).isoformat(),
        "llm_configured": LLM_BACKEND == "ollama" or bool(EMERGENT_LLM_KEY),
    }


app.include_router(api)


# ---------- static frontend (local/docker single-port mode) ----------
FRONTEND_DIR = os.environ.get("FRONTEND_DIR", "")
if FRONTEND_DIR and os.path.isdir(FRONTEND_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    _assets = os.path.join(FRONTEND_DIR, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="frontend_assets")
    _index_html = os.path.join(FRONTEND_DIR, "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404)
        if full_path:
            candidate = os.path.join(FRONTEND_DIR, full_path)
            if os.path.isfile(candidate):
                return FileResponse(candidate)
        return FileResponse(_index_html)

    logger.info("Serving built frontend from %s", FRONTEND_DIR)
