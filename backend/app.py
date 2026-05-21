"""
backend/app.py - Final Stable Version
"""

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from pathlib import Path
import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from groq import Groq

load_dotenv(Path(__file__).parent / ".env", override=True)

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"])

DATA_PATH = Path(__file__).parent / "products.json"
PRODUCTS: list[dict] = (
    json.loads(DATA_PATH.read_text(encoding="utf-8")) if DATA_PATH.exists() else []
)

ORDERS_PATH = Path(__file__).parent / "orders.json"
ORDERS: list[dict] = (
    json.loads(ORDERS_PATH.read_text(encoding="utf-8")) if ORDERS_PATH.exists() else []
)

def _save_products():
    DATA_PATH.write_text(json.dumps(PRODUCTS, ensure_ascii=False, indent=2), encoding="utf-8")

def _save_orders():
    ORDERS_PATH.write_text(json.dumps(ORDERS, ensure_ascii=False, indent=2), encoding="utf-8")

# Map product names to their sub-types so the AI can filter precisely
_PRODUCT_SUBTYPES = {
    "smartphone": ["iphone", "galaxy s", "pixel", "phone"],
    "laptop": ["laptop", "omen gt-50", "rog strix", "macbook"],
    "tv": ["oled", "tv", "television", "qled"],
    "headphones": ["airpods", "wh-1000", "headphone", "earphone", "earbud"],
    "tablet": ["ipad", "tablet", "tab "],
    "drone": ["drone", "dji"],
    "gaming pc": ["gaming pc", "desktop"],
}

def _get_subtype(p: dict) -> str:
    name_lower = p["name"].lower()
    for subtype, keywords in _PRODUCT_SUBTYPES.items():
        if any(kw in name_lower for kw in keywords):
            return subtype
    return p.get("category", "—").lower()

def _products_snapshot() -> str:
    if not PRODUCTS:
        return "No products available."
    lines = [f"[{p['id']}] {p['name']} | {p.get('category','—')}/{_get_subtype(p)} | ₱{p['price']:,.0f} | Qty:{p.get('quantity', 0)}"
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
- CRITICAL: NEVER add more units to cart than the Qty (stock). If Qty is 8, you CANNOT add 10. Always cap at available Qty and inform the user politely.
- ALWAYS use the EXACT product ID from the brackets [id] above. NEVER invent or modify IDs.
- When listing products, ALWAYS include their ID like: HP Omen GT-50 Gaming PC [p-98].
- ONLY show products that EXACTLY match what the user asked for. Use the 'type' label to filter:
  • If user asks for "phones" → only show type:smartphone
  • If user asks for "laptops" → only show type:laptop
  • If user asks for "TVs" → only show type:tv
  • If user asks for "headphones" → only show type:headphones
  • If user asks for "tablets" → only show type:tablet
  • If user asks for "drones" → only show type:drone
  • NEVER include unrelated product types in the same response.
- When listing 2 or more products, ALWAYS present them as a numbered list, one product per line, using this exact format:
  1. Product Name [id] — ₱Price (Stock: N)
  2. Product Name [id] — ₱Price (Stock: N)
  Put a short intro sentence before the list and a follow-up question after it.
- NEVER write multiple products as a single run-on sentence or paragraph.
- For ADD requests: respond naturally (with IDs in brackets), then at the VERY END output one ADD_TO_CART tag per product.
- For REMOVE requests: respond naturally (with IDs in brackets), then at the VERY END output one REMOVE_FROM_CART tag per product.
- NEVER output ADD_TO_CART for a remove request.
- NEVER output REMOVE_FROM_CART for an add request.
- If removing/adding multiple products, output one tag per product, each on its own line at the very end.
- If the user says "remove all", "remove everything", "clear cart", "remove them all", output REMOVE_FROM_CART for EVERY product currently in the cart.
- CHECKOUT triggers (use CHECKOUT, NEVER REMOVE_FROM_CART for these): "checkout", "check out", "check all out", "check them out", "buy", "buy all", "buy them", "buy everything", "place order", "complete purchase", "finalize", "proceed", or ANY phrase implying payment/buying.
- If user asks to add items AND checkout in the same message: output ADD_TO_CART tags first, then CHECKOUT at the very end.
- When confirming cart additions, keep it SHORT — do NOT repeat/list all products. Just say "Added X items to your cart!" or name 1-2 briefly.
- Do NOT write anything after the action tags.

Example (listing products):
Here are our available laptops:
1. HP Omen GT-50 Gaming PC [p-98] — ₱249,999.00 (Stock: 8)
2. ASUS ROG STRIX G17 [p-100] — ₱170,000.01 (Stock: 18)
Which one would you like?

Example (add one):
Added ASUS ROG STRIX G17 to your cart!

ADD_TO_CART:p-100:1

Example (add multiple briefly):
Added all 3 items to your cart!

ADD_TO_CART:p-100:1
ADD_TO_CART:p-e1:1
ADD_TO_CART:p-98:1

Example (remove one):
Removed HP Omen GT-50 Gaming PC from your cart.

REMOVE_FROM_CART:p-98

Example (checkout):
Order confirmed! Thank you for shopping at Group 1 Shop.

CHECKOUT

Example (add all + checkout in one message):
Done! Added all electronics and placed your order.

ADD_TO_CART:p-98:25
ADD_TO_CART:p-100:18
CHECKOUT
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
    search   = request.args.get("search", "").lower().strip()
    category = request.args.get("category", "").strip()
    sort     = request.args.get("sort", "").strip()
    page     = request.args.get("page")
    per_page = request.args.get("per_page")

    results = PRODUCTS[:]

    if search:
        results = [p for p in results if
                   search in p.get("name", "").lower() or
                   search in p.get("description", "").lower()]

    if category:
        results = [p for p in results if p.get("category", "").lower() == category.lower()]

    sort_map = {
        "price_asc":  lambda p: p.get("price", 0),
        "price_desc": lambda p: -p.get("price", 0),
        "rating":     lambda p: -p.get("rating", 0),
        "name":       lambda p: p.get("name", "").lower(),
    }
    if sort in sort_map:
        results.sort(key=sort_map[sort])

    total = len(results)

    if page is not None or per_page is not None:
        page     = max(1, int(page or 1))
        per_page = min(100, max(1, int(per_page or 20)))
        pages    = max(1, (total + per_page - 1) // per_page)
        start    = (page - 1) * per_page
        return jsonify({
            "products": results[start:start + per_page],
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "pages":    pages,
        })

    return jsonify(results)

@app.route("/api/products", methods=["POST"])
def add_product():
    body = request.get_json(silent=True) or {}
    if not body.get("name"):
        return jsonify({"error": "name is required"}), 400
    if not body.get("id"):
        body["id"] = f"p-{int(time.time() * 1000)}"
    if any(p["id"] == body["id"] for p in PRODUCTS):
        return jsonify({"error": "Product ID already exists"}), 409
    PRODUCTS.append(body)
    _save_products()
    return jsonify(body), 201

@app.route("/api/products/<product_id>", methods=["DELETE"])
def delete_product(product_id):
    original_len = len(PRODUCTS)
    PRODUCTS[:] = [p for p in PRODUCTS if p["id"] != product_id]
    if len(PRODUCTS) == original_len:
        return jsonify({"error": "Product not found"}), 404
    _save_products()
    return jsonify({"success": True}), 200

@app.route("/api/products/<product_id>", methods=["PATCH"])
def update_product(product_id):
    body = request.get_json(silent=True) or {}
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    if "quantity_delta" in body:
        product["quantity"] = max(0, product.get("quantity", 0) + int(body["quantity_delta"]))
    else:
        for key in ["name", "price", "quantity", "description", "specs", "category", "image", "rating", "currency"]:
            if key in body:
                product[key] = body[key]
    _save_products()
    return jsonify(product), 200

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
    messages = messages[-8:]  # Keep last 8 messages to limit token usage
    messages.append({"role": "user", "content": user_message})

    def generate():
        full_text = ""
        try:
            stream = _client.chat.completions.create(
                model=MODEL,
                max_tokens=900,
                temperature=0.5,
                messages=[{"role": "system", "content": build_system_prompt(cart)}] + messages,
                stream=True,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_text += delta
                    yield _sse({"type": "delta", "text": delta})

            actions = _parse_actions(full_text, cart)
            clean = _clean_reply(full_text)
            yield _sse({"type": "done", "actions": actions, "fullText": clean})

        except Exception as e:
            error_msg = str(e)
            print("🚨 Groq Error:", error_msg, flush=True)
            with open("error.log", "a") as f:
                f.write(f"Groq Error: {error_msg}\n")
            yield _sse({"type": "error", "message": "Sorry, I'm having trouble right now. Please try again."})

    return Response(stream_with_context(generate()), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


_ADD_TO_CART_RE = re.compile(r"ADD_TO_CART:([\w-]+)(?::(\d+))?", re.IGNORECASE)
_REMOVE_FROM_CART_RE = re.compile(r"REMOVE_FROM_CART:([\w-]+)", re.IGNORECASE)
_CHECKOUT_RE = re.compile(r"^CHECKOUT$", re.IGNORECASE | re.MULTILINE)

def _parse_actions(text: str, cart: dict = None) -> list[dict]:
    cart = cart or {}
    actions = []
    seen = set()

    for match in _ADD_TO_CART_RE.finditer(text):
        pid = match.group(1)
        try:
            qty = int(match.group(2))
        except (TypeError, ValueError):
            qty = 1
        key = ("add", pid)
        if key not in seen:
            seen.add(key)
            product = next((p for p in PRODUCTS if p["id"] == pid), None)
            if product:
                in_cart = cart.get(pid, 0)
                available = max(0, product.get("quantity", 0) - in_cart)
                qty = min(qty, available)
                if qty <= 0:
                    continue  # Skip — no stock available
            if qty > 0:
                actions.append({"type": "add_to_cart", "productId": pid, "quantity": qty})

    for match in _REMOVE_FROM_CART_RE.finditer(text):
        pid = match.group(1)
        key = ("remove", pid)
        if key not in seen:
            seen.add(key)
            actions.append({"type": "remove_from_cart", "productId": pid})

    if _CHECKOUT_RE.search(text):
        actions = [{"type": "checkout"}]
        return actions

    # Conflict resolution: if same product has both add and remove, keep only remove
    remove_pids = {a["productId"] for a in actions if a["type"] == "remove_from_cart"}
    actions = [a for a in actions if not (a["type"] == "add_to_cart" and a["productId"] in remove_pids)]

    return actions


def _clean_reply(text: str) -> str:
    text = _ADD_TO_CART_RE.sub("", text)
    text = _REMOVE_FROM_CART_RE.sub("", text)
    text = re.sub(r"ADD_TO_CART:[\w-]+(?::\d+)?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"REMOVE_FROM_CART:[\w-]+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^CHECKOUT$", "", text, flags=re.IGNORECASE | re.MULTILINE)
    text = re.sub(r"\[.*?\]", "", text)
    
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines).strip()


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "products": len(PRODUCTS), "orders": len(ORDERS)})


@app.route("/api/categories", methods=["GET"])
def get_categories():
    cats = sorted({p.get("category", "Uncategorized") for p in PRODUCTS if p.get("category")})
    return jsonify(cats)


@app.route("/api/orders", methods=["GET"])
def get_orders():
    return jsonify(ORDERS)


@app.route("/api/orders", methods=["POST"])
def create_order():
    body     = request.get_json(silent=True) or {}
    cart     = body.get("cart") or {}
    customer = body.get("customer") or {}

    if not cart:
        return jsonify({"error": "cart is empty"}), 400

    items = []
    total = 0.0

    for pid, qty in cart.items():
        product = next((p for p in PRODUCTS if p["id"] == pid), None)
        if not product:
            return jsonify({"error": f"Product '{pid}' not found"}), 404
        qty       = int(qty)
        available = product.get("quantity", 0)
        if qty > available:
            return jsonify({"error": f"Insufficient stock for '{product['name']}'. Available: {available}"}), 409
        subtotal = round(product["price"] * qty, 2)
        items.append({
            "productId": pid,
            "name":      product["name"],
            "image":     product.get("image", ""),
            "price":     product["price"],
            "currency":  product.get("currency", "PHP"),
            "quantity":  qty,
            "subtotal":  subtotal,
        })
        total += subtotal

    for item in items:
        product = next(p for p in PRODUCTS if p["id"] == item["productId"])
        product["quantity"] -= item["quantity"]
    _save_products()

    order = {
        "id":        f"ORD-{uuid.uuid4().hex[:8].upper()}",
        "items":     items,
        "total":     round(total, 2),
        "currency":  "PHP",
        "status":    "pending",
        "customer":  customer,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    ORDERS.append(order)
    _save_orders()

    return jsonify(order), 201


@app.route("/api/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    order = next((o for o in ORDERS if o["id"] == order_id), None)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order)


@app.route("/api/orders/<order_id>", methods=["PATCH"])
def update_order_status(order_id):
    body  = request.get_json(silent=True) or {}
    order = next((o for o in ORDERS if o["id"] == order_id), None)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    status = body.get("status")
    if status:
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400
        order["status"] = status
    _save_orders()
    return jsonify(order)


@app.route("/api/products/<product_id>/reviews", methods=["GET"])
def get_reviews(product_id):
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.get("reviews", []))


@app.route("/api/products/<product_id>/reviews", methods=["POST"])
def add_review(product_id):
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    body = request.get_json(silent=True) or {}
    try:
        rating = float(body.get("rating", 0))
    except (TypeError, ValueError):
        rating = 0
    if not (1 <= rating <= 5):
        return jsonify({"error": "rating must be a number between 1 and 5"}), 400
    review = {
        "id":        f"rev-{uuid.uuid4().hex[:8]}",
        "author":    (body.get("author") or "Anonymous").strip(),
        "rating":    round(rating, 1),
        "comment":   (body.get("comment") or "").strip(),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    if "reviews" not in product:
        product["reviews"] = []
    product["reviews"].append(review)
    all_ratings     = [r["rating"] for r in product["reviews"]]
    product["rating"] = round(sum(all_ratings) / len(all_ratings), 1)
    _save_products()
    return jsonify(review), 201


if __name__ == "__main__":
    print("🚀 Server running - llama-3.1-8b-instant")
    app.run(port=5000, debug=True)