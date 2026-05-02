"""
backend/app.py
Flask AI chat backend with product-aware RAG and streaming SSE.
Requires: flask flask-cors anthropic python-dotenv
"""

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from pathlib import Path
import json
import os
import re
from dotenv import load_dotenv
import anthropic

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])  # Vite / CRA

# ── Product catalogue ────────────────────────────────────────────────────────

DATA_PATH = Path(__file__).parent / "products.json"
PRODUCTS: list[dict] = (
    json.loads(DATA_PATH.read_text(encoding="utf-8")) if DATA_PATH.exists() else []
)

def _products_snapshot() -> str:
    """Render current in-memory products as a compact text block for the prompt."""
    if not PRODUCTS:
        return "No products available."
    lines = []
    for p in PRODUCTS:
        stock = "In stock" if (p.get("quantity") or 0) > 0 else "Out of stock"
        price = f"₱{p['price']:,.2f}" if p.get("price") is not None else "N/A"
        lines.append(
            f"• [{p['id']}] {p['name']} | {p.get('category','—')} | {price} | "
            f"Stock: {p.get('quantity', 0)} | {stock}\n"
            f"  {p.get('description','')}"
        )
    return "\n".join(lines)


# ── System prompt ────────────────────────────────────────────────────────────

SYSTEM_TEMPLATE = """\
You are a helpful shopping assistant for a product store. \
You help customers find products, answer questions about specs and availability, \
and assist with their cart.

Current product catalogue:
{catalogue}

Guidelines:
- Be concise and friendly.
- When recommending or referencing a product, always include its id in the format [id:p-xxx] \
  so the frontend can create a clickable link. Example: "Check out the iPhone 15 Pro [id:p-iphone-15-pro]".
- When a user wants to add something to their cart, confirm and include \
  [action:add_to_cart:PRODUCT_ID:QTY] in your reply. Example: [action:add_to_cart:p-iphone-15-pro:1].
- Never invent products that aren't in the catalogue.
- If a product is out of stock, say so clearly.
- Prices are in Philippine Pesos (₱).
"""

def build_system_prompt() -> str:
    return SYSTEM_TEMPLATE.format(catalogue=_products_snapshot())


# ── Anthropic client ─────────────────────────────────────────────────────────

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-20250514"


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify(PRODUCTS)


@app.route("/api/products/<product_id>/quantity", methods=["PATCH"])
def update_quantity(product_id: str):
    """
    Let the frontend sync quantity changes back to the server.
    Body: { "delta": 1 }  or  { "quantity": 5 }
    """
    body = request.get_json(silent=True) or {}
    for p in PRODUCTS:
        if p["id"] == product_id:
            if "quantity" in body:
                p["quantity"] = max(0, int(body["quantity"]))
            elif "delta" in body:
                p["quantity"] = max(0, (p.get("quantity") or 0) + int(body["delta"]))
            else:
                return jsonify({"error": "Provide 'quantity' or 'delta'"}), 400
            return jsonify(p)
    return jsonify({"error": "Product not found"}), 404


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Non-streaming chat endpoint (easier to start with).
    Body: { "message": "...", "history": [{"role":"user"|"assistant","content":"..."}] }
    Returns: { "reply": "...", "actions": [...] }
    """
    body = request.get_json(silent=True) or {}
    user_message: str = (body.get("message") or "").strip()
    history: list[dict] = body.get("history") or []

    if not user_message:
        return jsonify({"error": "message is required"}), 400

    # Build messages array: history + new user turn
    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    messages.append({"role": "user", "content": user_message})

    try:
        response = _client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=build_system_prompt(),
            messages=messages,
        )
        reply_text: str = response.content[0].text
    except anthropic.APIError as e:
        return jsonify({"error": str(e)}), 502

    # Parse action tags out of the reply
    actions = _parse_actions(reply_text)
    clean_reply = _strip_action_tags(reply_text)

    return jsonify({"reply": clean_reply, "actions": actions})


@app.route("/api/chat/stream", methods=["POST"])
def chat_stream():
    """
    Streaming SSE endpoint.
    Body: same as /api/chat
    Emits:
      data: {"type":"delta","text":"..."}
      data: {"type":"done","actions":[...]}
      data: {"type":"error","message":"..."}
    """
    body = request.get_json(silent=True) or {}
    user_message: str = (body.get("message") or "").strip()
    history: list[dict] = body.get("history") or []

    if not user_message:
        return jsonify({"error": "message is required"}), 400

    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    messages.append({"role": "user", "content": user_message})

    def generate():
        full_text = ""
        try:
            with _client.messages.stream(
                model=MODEL,
                max_tokens=1024,
                system=build_system_prompt(),
                messages=messages,
            ) as stream:
                for text_chunk in stream.text_stream:
                    full_text += text_chunk
                    yield _sse({"type": "delta", "text": text_chunk})

            # After stream ends, parse actions and send done event
            actions = _parse_actions(full_text)
            clean = _strip_action_tags(full_text)
            yield _sse({"type": "done", "actions": actions, "fullText": clean})

        except anthropic.APIError as e:
            yield _sse({"type": "error", "message": str(e)})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx: disable proxy buffering
        },
    )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# Matches: [action:add_to_cart:p-iphone-15-pro:1]
_ACTION_RE = re.compile(r"\[action:([^\]]+)\]")
# Matches: [id:p-xxx]
_ID_TAG_RE = re.compile(r"\[id:([\w-]+)\]")


def _parse_actions(text: str) -> list[dict]:
    actions = []
    for match in _ACTION_RE.finditer(text):
        parts = match.group(1).split(":")
        if len(parts) >= 2:
            action_type = parts[0]
            if action_type == "add_to_cart" and len(parts) >= 3:
                try:
                    qty = int(parts[3]) if len(parts) > 3 else 1
                except ValueError:
                    qty = 1
                actions.append({
                    "type": "add_to_cart",
                    "productId": parts[2],
                    "quantity": qty,
                })
    return actions


def _strip_action_tags(text: str) -> str:
    """Remove action tags but keep id tags (frontend renders them as links)."""
    return _ACTION_RE.sub("", text).strip()


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(port=5000, debug=True)