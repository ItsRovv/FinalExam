// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessageStream } from "../api/chat";

function cleanText(text) {
  return text
    .replace(/ADD_TO_CART:[\w-]+:\d+/gi, "")
    .replace(/REMOVE_FROM_CART:[\w-]+/gi, "")
    .replace(/PRODUCT_REF:[\w-]+/gi, "")
    .replace(/\[(action|id):[^\]]*\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes('electronic') || lower.includes('laptop') || lower.includes('phone') || 
      lower.includes('tv') || lower.includes('tablet') || lower.includes('drone') || 
      lower.includes('headphone')) return 'Electronics';
  if (lower.includes('home') || lower.includes('kitchen') || lower.includes('vacuum') || 
      lower.includes('oven') || lower.includes('coffee') || lower.includes('purifier')) return 'Home';
  if (lower.includes('sport') || lower.includes('running') || lower.includes('fitness') || 
      lower.includes('tennis') || lower.includes('basketball') || lower.includes('swimming') || 
      lower.includes('gym')) return 'Sports';
  return null;
}

const SUGGESTIONS = [
  '📱 Show me phones',
  '💻 I need a laptop',
  '🏠 Home appliances',
  '🏃 Sports gear',
];

// Improved Action Notification
function ActionNotification({ actions, products }) {
  if (!actions || actions.length === 0) return null;

  const adds = actions.filter(a => a.type === 'add_to_cart');
  const removes = actions.filter(a => a.type === 'remove_from_cart');

  return (
    <div className="chat-msg" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
      <div style={{
        background: adds.length > 0 ? 'rgba(0,229,160,0.08)' : 'rgba(255,77,109,0.08)',
        border: `1px solid ${adds.length > 0 ? 'rgba(0,229,160,0.25)' : 'rgba(255,77,109,0.25)'}`,
        borderRadius: 12, padding: '10px 13px', fontSize: 12.5, maxWidth: '90%',
      }}>
        {adds.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, color: '#00e5a0', marginBottom: 8, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              ✓ Added to Cart ({adds.length} item{adds.length > 1 ? 's' : ''})
            </div>
            {adds.map((a, i) => {
              const p = products.find(x => x.id === a.productId);
              const quantity = a.quantity || 1;
              return p ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < adds.length - 1 ? 6 : 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'rgba(0,212,255,0.1)' }}>
                    <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#e8f0fe' }}>{p.name}</span>
                    {quantity > 1 && <span style={{ color: '#00d4ff', fontWeight: 600 }}> ×{quantity}</span>}
                  </div>
                  <span style={{ color: '#00d4ff', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ₱{Number(p.price * quantity).toLocaleString('en-PH')}
                  </span>
                </div>
              ) : null;
            })}
          </div>
        )}

        {removes.length > 0 && (
          <div style={{ marginTop: adds.length > 0 ? 10 : 0 }}>
            <div style={{ fontWeight: 700, color: '#ff4d6d', marginBottom: 6, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              ✕ Removed from Cart ({removes.length} item{removes.length > 1 ? 's' : ''})
            </div>
            {removes.map((a, i) => {
              const p = products.find(x => x.id === a.productId);
              return p ? (
                <div key={i} style={{ color: '#8899aa', fontSize: 12 }}>• {p.name}</div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className="chat-msg" style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginRight: 7, marginTop: 2,
          background: 'linear-gradient(135deg, #00d4ff, #0088aa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, boxShadow: '0 0 8px rgba(0,212,255,0.3)', color: '#000', fontWeight: 700,
        }}>✦</div>
      )}
      <div style={{
        maxWidth: "78%", padding: "9px 13px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? 'linear-gradient(135deg, #00d4ff, #0099bb)' : 'rgba(255,255,255,0.07)',
        border: isUser ? 'none' : '1px solid rgba(0,212,255,0.12)',
        fontSize: 13, lineHeight: 1.55,
        color: isUser ? '#000' : '#e8f0fe',
        wordBreak: "break-word", whiteSpace: "pre-wrap",
        fontWeight: isUser ? 600 : 400,
        boxShadow: isUser ? '0 4px 12px rgba(0,212,255,0.2)' : 'none',
      }}>
        {cleanText(msg.content)}
        {msg.streaming && (
          <span style={{
            display: "inline-block", width: 6, height: 13, background: "currentColor",
            opacity: 0.6, marginLeft: 3, borderRadius: 2, animation: "chatBlink .7s step-end infinite",
          }} />
        )}
      </div>
    </div>
  );
}

function CategoryRedirect({ category, onRedirect }) {
  return (
    <div className="chat-msg" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
      <div style={{
        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 12, padding: '9px 13px', fontSize: 12.5,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#8899aa' }}>View {category} products?</span>
        <button onClick={onRedirect} style={{
          background: 'linear-gradient(135deg, #00d4ff, #0099bb)',
          border: 'none', borderRadius: 8, padding: '4px 12px',
          color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
        }}>Go to {category} →</button>
      </div>
    </div>
  );
}

const TOOLTIP_MESSAGES = ["Need Assistance?", "Try me now!", "Ask me anything!"];

export default function ChatWidget({ products = [], cart = {}, onAddToCart, onRemoveFromCart, onSetCategory }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isReopened, setIsReopened] = useState(false);
  const [tooltipIdx, setTooltipIdx] = useState(0);
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Hey! Welcome to Group 1 Shop 👋\nAsk me about products, check stock, or add/remove items from your cart!",
  }]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(null);

  const [showReopenPrompt, setShowReopenPrompt] = useState(false);

  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);
  const processedRef = useRef(new Set());
  const reopenTimerRef = useRef(null);
  const promptDismissTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(reopenTimerRef.current);
      clearTimeout(promptDismissTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (hasInteracted) return;
    const id = setInterval(() => setTooltipIdx(i => (i + 1) % TOOLTIP_MESSAGES.length), 4500);
    return () => clearInterval(id);
  }, [hasInteracted]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [open, messages]);

  useEffect(() => {
    if (!open && messages.length > 1) setUnread(u => u + 1);
  }, [messages.length]);

  const buildHistory = (msgs) =>
    msgs.filter(m => !m.streaming && m.role !== 'action')
        .map(({ role, content }) => ({ role, content: cleanText(content) }));

  const handleSend = useCallback((overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    setInput("");
    setPendingCategory(null);
    const placeholderId = Date.now().toString();

    setMessages(prev => {
      const history = buildHistory(prev);
      const nextMessages = [...prev,
        { role: "user", content: text },
        { id: placeholderId, role: "assistant", content: "", streaming: true }
      ];

      setLoading(true);

      abortRef.current = sendMessageStream(text, history, {
          cart,
        onChunk(chunk) {
          if (!chunk) return;
          setMessages(m => m.map(msg =>
            msg.id === placeholderId 
              ? { ...msg, content: (msg.content || "") + chunk } 
              : msg
          ));
        },

        onDone(actions = [], fullText = "") {
          if (processedRef.current.has(placeholderId)) return;
          processedRef.current.add(placeholderId);

          const cleaned = cleanText(fullText);

          // Execute cart actions
          const processedActions = new Set();
          actions.forEach(a => {
            if (a.type === 'add_to_cart') {
              const key = a.productId;
              if (processedActions.has(key)) return;
              processedActions.add(key);
              onAddToCart?.(a.productId, a.quantity || 1);
            }
            if (a.type === 'remove_from_cart') {
              onRemoveFromCart?.(a.productId);
            }
          });

          // Update messages and show notification
          setMessages(prev => {
            const updated = prev.map(msg =>
              msg.id === placeholderId
                ? { ...msg, content: cleaned || "Sorry, I couldn't generate a response.", streaming: false, id: undefined }
                : msg
            );

            return actions.length > 0
              ? [...updated, { role: 'action', actions }]
              : updated;
          });

          const cat = detectCategory(cleaned);
          if (cat) setPendingCategory(cat);
          setLoading(false);
        },
      });

      return nextMessages;
    });
  }, [input, loading, onAddToCart, onRemoveFromCart]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    abortRef.current?.();
    setMessages([{ role: "assistant", content: "Chat cleared! How can I help you today?" }]);
    setPendingCategory(null);
    setLoading(false);
    processedRef.current.clear();
  };

  const startReopenTimer = () => {
    clearTimeout(reopenTimerRef.current);
    clearTimeout(promptDismissTimerRef.current);
    setShowReopenPrompt(false);
    reopenTimerRef.current = setTimeout(() => {
      setShowReopenPrompt(true);
      promptDismissTimerRef.current = setTimeout(() => setShowReopenPrompt(false), 8000);
    }, 12000);
  };

  const handleBubbleClick = () => {
    if (!open) {
      clearTimeout(reopenTimerRef.current);
      clearTimeout(promptDismissTimerRef.current);
      setShowReopenPrompt(false);
      if (!hasInteracted) setHasInteracted(true);
    } else {
      startReopenTimer();
    }
    setOpen(o => !o);
    setUnread(0);
  };

  const handleClose = () => {
    setOpen(false);
    startReopenTimer();
  };

  const handleReopenYes = () => {
    clearTimeout(reopenTimerRef.current);
    clearTimeout(promptDismissTimerRef.current);
    setShowReopenPrompt(false);
    setHasInteracted(false);
    setIsReopened(true);
    setOpen(true);
  };

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const showSuggestions = messages.length <= 1;
  const glowMode = open ? 'open' : !hasInteracted ? (isReopened ? 'breath' : 'intense') : 'none';

  return (
    <>
      <style>{`
        @keyframes chatBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes chatFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bubblePop { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes chatSlideUp { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes chatGlow { 0%,100%{box-shadow:0 6px 24px rgba(0,212,255,0.4),0 0 0 0 rgba(0,212,255,0.5)} 50%{box-shadow:0 6px 32px rgba(0,212,255,0.7),0 0 0 12px rgba(0,212,255,0)} }
        @keyframes chatGlowBreath { 0%,100%{box-shadow:0 4px 14px rgba(0,212,255,0.2)} 50%{box-shadow:0 6px 34px rgba(0,212,255,0.7),0 0 0 10px rgba(0,212,255,0.12)} }
        @keyframes tooltipPop { from{opacity:0;transform:translateY(6px) scale(0.92)} to{opacity:1;transform:translateY(0) scale(1)} }
        .chat-msg { animation: chatFadeIn 0.25s ease both; }
        .chat-suggest:hover { background: rgba(0,212,255,0.18) !important; color: #00d4ff !important; border-color: rgba(0,212,255,0.4) !important; }
        .chat-bubble-btn:hover { transform: scale(1.08); box-shadow: 0 8px 30px rgba(0,212,255,0.45) !important; }
        .chat-panel { animation: chatSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* Continue Conversation prompt */}
      {showReopenPrompt && !open && (
        <div style={{
          position: 'fixed', bottom: 100, right: 28, zIndex: 99,
          background: 'rgba(8,11,18,0.97)', border: '1px solid rgba(0,212,255,0.4)',
          borderRadius: 14, padding: '13px 16px',
          fontFamily: 'Outfit, sans-serif',
          boxShadow: '0 6px 28px rgba(0,212,255,0.25)',
          animation: 'tooltipPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          minWidth: 210,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 10, letterSpacing: 0.2 }}>
            Continue Conversation?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleReopenYes} style={{
              flex: 1, background: 'linear-gradient(135deg, #00d4ff, #0099bb)',
              border: 'none', borderRadius: 8, padding: '7px 0',
              color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}>Yes</button>
            <button onClick={() => { setShowReopenPrompt(false); setHasInteracted(false); setIsReopened(true); handleClear(); }} style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '7px 0',
              color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Tooltip callout */}
      {!hasInteracted && !open && (
        <div key={tooltipIdx} style={{
          position: 'fixed', bottom: 38, right: 100, zIndex: 99,
          background: 'rgba(8,11,18,0.95)', border: '1px solid rgba(0,212,255,0.35)',
          borderRadius: 12, padding: '10px 18px', fontSize: 15, color: '#ffffff',
          fontFamily: 'Outfit, sans-serif', fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 22px rgba(0,212,255,0.25)',
          animation: 'tooltipPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          pointerEvents: 'none', letterSpacing: 0.2,
        }}>
          {TOOLTIP_MESSAGES[tooltipIdx]}
          <div style={{
            position: 'absolute', right: -6, top: '50%',
            transform: 'translateY(-50%)',
            width: 6, height: 12, overflow: 'hidden',
          }}>
            <div style={{
              width: 10, height: 10, background: 'rgba(8,11,18,0.95)',
              border: '1px solid rgba(0,212,255,0.35)', transform: 'rotate(45deg)',
              marginTop: 1, marginLeft: -5,
            }} />
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button key={glowMode} className="chat-bubble-btn" onClick={handleBubbleClick} title="Open Shop Assistant"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 99,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00d4ff, #0077aa)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#000',
          boxShadow: '0 6px 24px rgba(0,212,255,0.4)',
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          animation: open
            ? 'chatGlowBreath 2.5s ease-in-out infinite'
            : !hasInteracted
              ? (!isReopened
                  ? 'bubblePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both, chatGlow 2s ease-in-out 0.5s infinite'
                  : 'chatGlowBreath 2.5s ease-in-out infinite')
              : 'bubblePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
        {open ? '✕' : '✦'}
        {!open && unread > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: '#ff4d6d', color: '#fff',
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)',
          }}>{unread}</div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel" style={{
          position: 'fixed', bottom: 100, right: 28, zIndex: 98,
          width: 380, height: 'calc(100vh - 180px)', maxHeight: 560,
          display: "flex", flexDirection: "column",
          background: "rgba(8,11,18,0.96)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(0,212,255,0.15)", borderRadius: 20,
          overflow: "hidden", color: "#e8f0fe", fontFamily: "Outfit, sans-serif",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.08)",
        }}>
          {/* Header */}
          <div style={{
            padding: "13px 16px", display: "flex", alignItems: "center", gap: 10,
            borderBottom: "1px solid rgba(0,212,255,0.08)",
            background: "linear-gradient(135deg, rgba(0,212,255,0.05), transparent)",
            flexShrink: 0,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #0077aa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, boxShadow: '0 0 14px rgba(0,212,255,0.35)', color: '#000', fontWeight: 700,
            }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Shop Assistant</div>
              <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.6)', marginTop: 1 }}>
                {products.length} products · {cartCount} in cart
              </div>
            </div>
            <button onClick={handleClear} title="Clear" style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "rgba(255,255,255,0.3)", cursor: "pointer",
              fontSize: 15, padding: "4px 8px",
            }}>↺</button>
            <button onClick={handleClose} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "rgba(255,255,255,0.3)", cursor: "pointer",
              fontSize: 15, padding: "4px 8px",
            }}>✕</button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 8px", display: "flex", flexDirection: "column" }}>
            {showSuggestions ? (
              <>
                {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8, marginBottom: 4 }}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="chat-suggest"
                      onClick={() => handleSend(s.replace(/^[\p{Emoji}\s]+/u, '').trim())}
                      style={{
                        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)',
                        borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'rgba(0,212,255,0.8)',
                        cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Outfit, sans-serif',
                      }}>{s}</button>
                  ))}
                </div>
              </>
            ) : (
              messages.map((msg, i) => {
                if (msg.role === 'action') {
                  return <ActionNotification key={i} actions={msg.actions} products={products} />;
                }
                return <MessageBubble key={msg.id ?? i} msg={msg} />;
              })
            )}

            {pendingCategory && (
              <CategoryRedirect category={pendingCategory} onRedirect={() => { onSetCategory?.(pendingCategory); setPendingCategory(null); }} />
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: "9px 11px 12px", borderTop: "1px solid rgba(0,212,255,0.08)",
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "rgba(0,0,0,0.25)", flexShrink: 0,
          }}>
            <textarea ref={inputRef} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products…" rows={1} disabled={loading}
              style={{
                flex: 1, resize: "none", background: "rgba(0,212,255,0.05)",
                border: "1px solid rgba(0,212,255,0.15)", borderRadius: 10,
                padding: "9px 12px", fontSize: 13, color: "#e8f0fe",
                fontFamily: "Outfit, sans-serif", lineHeight: 1.4,
                maxHeight: 90, overflowY: "auto", outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(0,212,255,0.15)'}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 90) + "px"; }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              style={{
                padding: "9px 14px",
                background: loading || !input.trim() ? "rgba(0,212,255,0.08)" : "linear-gradient(135deg, #00d4ff, #0099bb)",
                border: "none", borderRadius: 10,
                color: loading || !input.trim() ? "rgba(0,212,255,0.25)" : "#000",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 15, fontWeight: 700, minWidth: 42,
                boxShadow: loading || !input.trim() ? "none" : "0 4px 12px rgba(0,212,255,0.25)",
                transition: "all 0.2s",
              }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}