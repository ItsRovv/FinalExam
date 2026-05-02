// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessageStream, parseReplySegments } from "../api/chat";

// ── Sub-components ────────────────────────────────────────────────────────────

function ProductLink({ productId, products, onOpenProduct }) {
  const product = products.find((p) => p.id === productId);
  if (!product) return <code style={{ fontSize: 11 }}>{productId}</code>;
  return (
    <button
      onClick={() => onOpenProduct(productId)}
      style={{
        display: "inline",
        background: "rgba(99,102,241,0.12)",
        border: "1px solid rgba(99,102,241,0.35)",
        borderRadius: 5,
        padding: "1px 7px",
        fontSize: 12,
        color: "inherit",
        cursor: "pointer",
        fontWeight: 500,
      }}
      title={`₱${Number(product.price).toLocaleString("en-PH")} — Stock: ${product.quantity}`}
    >
      {product.name}
    </button>
  );
}

function MessageBubble({ msg, products, onOpenProduct }) {
  const isUser = msg.role === "user";

  const renderContent = (text) => {
    const segments = parseReplySegments(text);
    return segments.map((seg, i) =>
      seg.type === "product_link" ? (
        <ProductLink
          key={i}
          productId={seg.productId}
          products={products}
          onOpenProduct={onOpenProduct}
        />
      ) : (
        <span key={i} style={{ whiteSpace: "pre-wrap" }}>
          {seg.content}
        </span>
      )
    );
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: "82%",
          padding: "9px 13px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser
            ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
            : "rgba(255,255,255,0.07)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
          fontSize: 13.5,
          lineHeight: 1.55,
          color: isUser ? "#fff" : "inherit",
          wordBreak: "break-word",
        }}
      >
        {msg.streaming ? (
          <>
            {renderContent(msg.content)}
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 13,
                background: "currentColor",
                opacity: 0.7,
                marginLeft: 2,
                borderRadius: 1,
                animation: "blink .7s step-end infinite",
              }}
            />
          </>
        ) : (
          renderContent(msg.content)
        )}
      </div>
    </div>
  );
}

function ActionToast({ actions, products, onAddToCart, onDismiss }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div
      style={{
        margin: "0 0 8px",
        padding: "8px 12px",
        background: "rgba(34,197,94,0.12)",
        border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: 10,
        fontSize: 12.5,
      }}
    >
      {actions.map((action, i) => {
        if (action.type === "add_to_cart") {
          const product = products.find((p) => p.id === action.productId);
          if (!product) return null;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1 }}>
                Add <strong>{product.name}</strong> × {action.quantity} to cart?
              </span>
              <button
                onClick={() => {
                  onAddToCart(action.productId, action.quantity);
                  onDismiss();
                }}
                style={{
                  padding: "3px 10px",
                  background: "#22c55e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Add
              </button>
              <button
                onClick={onDismiss}
                style={{
                  padding: "3px 8px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "inherit",
                }}
              >
                No
              </button>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function ChatWidget({ products = [], cart = {}, onAddToCart, onOpenProduct: onOpenProductProp }) {
  const navigate = useNavigate();

  const onOpenProduct = useCallback(
    (id) => {
      onOpenProductProp?.(id);
      navigate(`/product/${id}`);
    },
    [navigate, onOpenProductProp]
  );

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I can help you find products, check stock, or add items to your cart. What are you looking for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const [open, setOpen] = useState(true);

  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build history for the API (exclude the streaming placeholder)
  const buildHistory = (msgs) =>
    msgs
      .filter((m) => !m.streaming && m.role !== "system")
      .map(({ role, content }) => ({ role, content }));

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setPendingActions([]);

    const userMsg = { role: "user", content: text };
    const placeholderId = Date.now();
    const assistantPlaceholder = {
      id: placeholderId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => {
      const history = buildHistory(prev);
      const next = [...prev, userMsg, assistantPlaceholder];

      setLoading(true);

      // Start stream
      abortRef.current = sendMessageStream(text, history, {
        onChunk(chunk) {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholderId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        onDone(actions) {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholderId ? { ...msg, streaming: false, id: undefined } : msg
            )
          );
          if (actions.length > 0) setPendingActions(actions);
          setLoading(false);
        },
        onError(err) {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholderId
                ? {
                    ...msg,
                    content: `Sorry, something went wrong: ${err.message}`,
                    streaming: false,
                    id: undefined,
                    error: true,
                  }
                : msg
            )
          );
          setLoading(false);
        },
      });

      return next;
    });
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    abortRef.current?.();
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared! How can I help you?",
      },
    ]);
    setPendingActions([]);
    setLoading(false);
  };

  // Cart summary for context display
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  return (
    <>
      {/* Blink keyframe */}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 80px)",
          position: "sticky",
          top: 80,
          background: "rgba(15,15,25,0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
          color: "#e5e7eb",
          fontFamily: "inherit",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            ✦
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Shopping Assistant</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>
              {products.length} products · {cartCount} in cart
            </div>
          </div>
          <button
            onClick={handleClear}
            title="Clear chat"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              fontSize: 14,
              padding: "4px 6px",
              borderRadius: 6,
            }}
          >
            ↺
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 12px 8px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id ?? i}
              msg={msg}
              products={products}
              onOpenProduct={onOpenProduct}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Pending action toasts */}
        {pendingActions.length > 0 && (
          <div style={{ padding: "0 12px" }}>
            <ActionToast
              actions={pendingActions}
              products={products}
              onAddToCart={onAddToCart}
              onDismiss={() => setPendingActions([])}
            />
          </div>
        )}

        {/* Input */}
        <div
          style={{
            padding: "10px 12px 14px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products…"
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              resize: "none",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13.5,
              color: "inherit",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.4,
              maxHeight: 100,
              overflowY: "auto",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: "9px 14px",
              background:
                loading || !input.trim()
                  ? "rgba(99,102,241,0.3)"
                  : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: 15,
              fontWeight: 600,
              transition: "opacity .15s",
              minWidth: 42,
            }}
          >
            {loading ? "…" : "↑"}
          </button>
        </div>
      </div>
    </>
  );
}
