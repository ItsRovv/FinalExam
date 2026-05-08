// src/pages/Cart.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 2,
});

export default function Cart({ products = [], cart = {}, onRemoveFromCart = () => {}, onCheckout = () => ({ success: false }) }) {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);

  const items = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        if (!product) return null;
        return { id, name: product.name, price: product.price, qty, subtotal: product.price * qty, image: product.image, category: product.category };
      })
      .filter(Boolean);
  }, [cart, products]);

  const total = items.reduce((sum, it) => sum + it.subtotal, 0);

  const handleCheckout = () => {
    if (items.length === 0) return;
    const result = onCheckout();
    if (result && result.success) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);
    } else {
      alert((result && result.message) || 'Checkout failed.');
    }
  };

  return (
    <section style={{ maxWidth: 860, margin: '0 auto' }}>
      {showToast && (
        <div className="toast toast-success toast-animate" role="status" aria-live="polite">
          🎉 Order placed! On its way to you!
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Your Cart</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0 }}>
            {items.length === 0 ? 'No items yet' : `${items.length} item${items.length > 1 ? 's' : ''} · ${currencyFormatter.format(total)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
              fontFamily: 'Outfit, sans-serif', fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = 'var(--cyan)'; e.target.style.color = 'var(--cyan)'; }}
            onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text2)'; }}
          >
            ← Back
          </button>
          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            style={{
              padding: '10px 28px', borderRadius: 10,
              background: items.length === 0 ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #00d4ff, #0099bb)',
              border: 'none', color: items.length === 0 ? 'rgba(0,212,255,0.3)' : '#000',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
              boxShadow: items.length === 0 ? 'none' : '0 4px 14px rgba(0,212,255,0.3)',
              transition: 'all 0.2s',
            }}
          >
            Checkout →
          </button>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
          <h3 style={{ marginBottom: 8, color: 'var(--text)' }}>Your cart is empty</h3>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Add some products to get started!</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Products</button>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {items.map((it) => (
              <div key={it.id} style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr auto auto auto',
                alignItems: 'center', gap: 16,
                background: 'var(--surface)',
                border: '1px solid var(--border2)',
                borderRadius: 14, padding: '14px 18px',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border2)'}
              >
                {/* Image - fixed size */}
                <div style={{
                  width: 80, height: 80, borderRadius: 10,
                  overflow: 'hidden', flexShrink: 0,
                  background: 'var(--bg3)',
                  border: '1px solid var(--border2)',
                }}>
                  <img
                    src={it.image}
                    alt={it.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://cdn.dummyjson.com/products/images/smartphones/iPhone%2015%20Pro/1.png';
                    }}
                  />
                </div>

                {/* Name & category */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{it.name}</div>
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: 20, padding: '2px 9px', fontSize: 10,
                    fontWeight: 700, color: 'var(--cyan)', letterSpacing: 0.8, textTransform: 'uppercase',
                  }}>{it.category}</div>
                </div>

                {/* Unit price */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Unit price</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{currencyFormatter.format(it.price)}</div>
                </div>

                {/* Qty */}
                <div style={{ textAlign: 'center', minWidth: 48 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Qty</div>
                  <div style={{
                    fontWeight: 800, fontSize: 16, color: 'var(--cyan)',
                    background: 'rgba(0,212,255,0.08)', borderRadius: 8,
                    padding: '4px 12px', border: '1px solid rgba(0,212,255,0.2)',
                  }}>×{it.qty}</div>
                </div>

                {/* Subtotal + remove */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Subtotal</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>
                    {currencyFormatter.format(it.subtotal)}
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(it.id)}
                    style={{
                      padding: '4px 12px', borderRadius: 6,
                      background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)',
                      color: 'var(--red)', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.target.style.background = 'rgba(255,77,109,0.18)'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'rgba(255,77,109,0.08)'; }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>
              Order Summary
            </div>

            {items.map((it) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>{it.name} ×{it.qty}</span>
                <span>{currencyFormatter.format(it.subtotal)}</span>
              </div>
            ))}

            <div style={{ height: 1, background: 'var(--border2)', margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--cyan)' }}>
                {currencyFormatter.format(total)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={items.length === 0}
              style={{
                width: '100%', marginTop: 16, padding: '14px',
                background: 'linear-gradient(135deg, #00d4ff, #0099bb)',
                border: 'none', borderRadius: 12, color: '#000',
                fontSize: 15, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                boxShadow: '0 6px 20px rgba(0,212,255,0.3)',
                transition: 'all 0.2s',
                letterSpacing: 0.5,
              }}
            >
              Place Order →
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
              Free delivery • Secure checkout • 30-day returns
            </p>
          </div>
        </>
      )}
    </section>
  );
}
