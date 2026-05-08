"""
backend/app.py - Final Stable Version
"""

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from pathlib import Path
import json
import os
import re
from dotenv import load_dotenv
from groq import Groq

load_dotenv(Path(__file__).parent / ".env")

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"])

DATA_PATH = Path(__file__).parent / "products.json"
PRODUCTS: list[dict] = (
    json.loads(DATA_PATH.read_text(encoding="utf-8")) if DATA_PATH.exists() else []
)

def _products_snapshot() -> str:
    if not PRODUCTS:
        return "No products available."
    lines = [f"• [{p['id']}] {p['name']} | {p.get('category','—')} | ₱{p['price']:,.2f} | Stock: {p.get('quantity', 0)}" 
             for p in PRODUCTS]
    return "\n".join(lines)

def _cart_snapshot(cart: dict) -> str:
    if not cart:
        return "(empty)"
    lines = []
    for pid, qty in cart.items():
        product = next((p for p in PRODUCTS if p['id'] == pid), None)
        name = product['name'] if product else pid
        lines.append(f"• [{pid}] {name} (qty: {qty})")
    return "\n".join(lines) if lines else "(empty)"

# Very Strict System Prompt
SYSTEM_TEMPLATE = """\
You are a friendly shopping assistant for Group 1 Shop.

Current products:
{catalogue}

Current cart:
{cart_contents}

RULES YOU MUST OBEY:
- Speak naturally and shortly.
- For ADD requests: respond naturally, then at the VERY END output one ADD_TO_CART tag per product.
- For REMOVE requests: respond naturally, then at the VERY END output one REMOVE_FROM_CART tag per product.
- NEVER output ADD_TO_CART for a remove request.
- NEVER output REMOVE_FROM_CART for an add request.
- If removing/adding multiple products, output one tag per product, each on its own line at the very end.
- If the user says "remove all", "remove everything", "clear cart", "remove them all", "remove all of them", output REMOVE_FROM_CART for EVERY product currently in the cart.
- Do NOT write anything after the action tags.

Example (add one):
I've added the ASUS ROG STRIX G17 to your cart.

ADD_TO_CART:p-100:1

Example (remove one):
I've removed the HP Omen GT-50 Gaming PC from your cart.

REMOVE_FROM_CART:p-2

Example (remove multiple):
I've removed both items from your cart.

REMOVE_FROM_CART:p-2
REMOVE_FROM_CART:p-5

Example (add multiple):
I've added both items to your cart.

ADD_TO_CART:p-100:1
ADD_TO_CART:p-5:1
"""

def build_system_prompt(cart: dict = None) -> str:
    return SYSTEM_TEMPLATE.format(
        catalogue=_products_snapshot(),
        cart_contents=_cart_snapshot(cart or {})
    )

_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.1-8b-instant"

@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify(PRODUCTS)

@app.route("/api/chat/stream", methods=["POST"])
def chat_stream():
    body = request.get_json(silent=True) or {}
    user_message = (body.get("message") or "").strip()
    history = body.get("history") or []
    cart = body.get("cart") or {}

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
            stream = _client.chat.completions.create(
                model=MODEL,
                max_tokens=1024,
                temperature=0.6,          # Lower temperature = more consistent
                messages=[{"role": "system", "content": build_system_prompt(cart)}] + messages,
                stream=True,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_text += delta
                    yield _sse({"type": "delta", "text": delta})

            actions = _parse_actions(full_text)
            clean = _clean_reply(full_text)
            yield _sse({"type": "done", "actions": actions, "fullText": clean})

        except Exception as e:
            error_msg = str(e)
            print("🚨 Groq Error:", error_msg)
            yield _sse({"type": "error", "message": "Sorry, I'm having trouble right now. Please try again."})

    return Response(stream_with_context(generate()), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


_ADD_TO_CART_RE = re.compile(r"ADD_TO_CART:([\w-]+):(\d+)", re.IGNORECASE)
_REMOVE_FROM_CART_RE = re.compile(r"REMOVE_FROM_CART:([\w-]+)", re.IGNORECASE)

def _parse_actions(text: str) -> list[dict]:
    actions = []
    seen = set()

    for match in _ADD_TO_CART_RE.finditer(text):
        pid = match.group(1)
        try:
            qty = int(match.group(2))
        except:
            qty = 1
        key = ("add", pid)
        if key not in seen:
            seen.add(key)
            actions.append({"type": "add_to_cart", "productId": pid, "quantity": qty})

    for match in _REMOVE_FROM_CART_RE.finditer(text):
        pid = match.group(1)
        key = ("remove", pid)
        if key not in seen:
            seen.add(key)
            actions.append({"type": "remove_from_cart", "productId": pid})

    # Conflict resolution: if same product has both add and remove, keep only remove
    remove_pids = {a["productId"] for a in actions if a["type"] == "remove_from_cart"}
    actions = [a for a in actions if not (a["type"] == "add_to_cart" and a["productId"] in remove_pids)]

    return actions


def _clean_reply(text: str) -> str:
    text = _ADD_TO_CART_RE.sub("", text)
    text = _REMOVE_FROM_CART_RE.sub("", text)
    text = re.sub(r"ADD_TO_CART:[\w-]+:\d+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"REMOVE_FROM_CART:[\w-]+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\[.*?\]", "", text)
    
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines).strip()


if __name__ == "__main__":
    print("🚀 Server running - llama-3.1-8b-instant")
    app.run(port=5000, debug=True)