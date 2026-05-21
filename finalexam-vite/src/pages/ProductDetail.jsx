// src/pages/ProductDetail.jsx
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 2,
});

export default function ProductDetail({ products = [], onAddToCart, onIncrement, onDecrement, onRemoveProduct }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [hovered, setHovered] = useState(false);

  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

  if (!product) {
    return (
      <section style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ marginBottom: 8 }}>Product not found</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>This product does not exist or was removed.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>← Back to Products</button>
      </section>
    );
  }

  const outOfStock = product.quantity === 0;
  const lowStock = product.quantity > 0 && product.quantity < 5;

  // Parse specs string into array
  const specsList = product.specs
    ? product.specs.split(';').map((s) => s.trim()).filter(Boolean)
    : [];

  // Stock color
  const stockColor = outOfStock ? 'var(--red)' : lowStock ? 'var(--gold)' : 'var(--green)';
  const stockLabel = outOfStock ? 'Out of Stock' : lowStock ? `Only ${product.quantity} left!` : `${product.quantity} in stock`;

  const handleAddToCart = () => {
    if (outOfStock || qty < 1) return;
    onAddToCart?.(product.id, qty);
  };

  return (
    <section>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: '1px solid var(--border2)',
          borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
          fontSize: 13, padding: '7px 14px', marginBottom: 24,
          fontFamily: 'Outfit, sans-serif', transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.target.style.borderColor = 'var(--cyan)'; e.target.style.color = 'var(--cyan)'; }}
        onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--text2)'; }}
      >
        ← Back
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 420px) 1fr',
        gap: 32, alignItems: 'start',
      }}>

        {/* ── Image panel ── */}
        <div>
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            aspectRatio: '4/3', position: 'relative',
          }}>
            <img
              src={product.image}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://cdn.dummyjson.com/products/images/smartphones/iPhone%2015%20Pro/1.png';
              }}
            />
            {/* Category badge */}
            <div style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,212,255,0.25)', borderRadius: 20,
              padding: '4px 12px', fontSize: 11, fontWeight: 700,
              color: 'var(--cyan)', letterSpacing: 1, textTransform: 'uppercase',
            }}>{product.category}</div>
          </div>

          {/* Rating */}
          {product.rating && (
            <div style={{
              marginTop: 14, padding: '12px 16px',
              background: 'var(--surface)', border: '1px solid var(--border2)',
              borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 20 }}>{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gold)' }}>{product.rating} / 5.0</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Customer Rating</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Info panel ── */}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, lineHeight: 1.2 }}>{product.name}</h1>

          {/* Price */}
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--cyan)', marginBottom: 16, letterSpacing: -1 }}>
            {currencyFormatter.format(product.price)}
          </div>

          {/* Stock indicator */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: outOfStock ? 'rgba(255,77,109,0.1)' : lowStock ? 'rgba(240,192,64,0.1)' : 'rgba(0,229,160,0.1)',
            border: `1px solid ${stockColor}40`,
            borderRadius: 20, padding: '6px 14px', marginBottom: 24,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: stockColor, boxShadow: `0 0 6px ${stockColor}` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: stockColor }}>{stockLabel}</span>
          </div>

          {/* Stock management */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
              Manage Stock
            </span>
            <button
              className="small-btn"
              onClick={() => onDecrement?.(product.id)}
              disabled={product.quantity <= 0}
              title="Remove 1 from stock"
            >−</button>
            <div style={{ minWidth: 40, textAlign: 'center', fontWeight: 800, fontSize: 16, color: stockColor }}>
              {product.quantity}
            </div>
            <button
              className="small-btn"
              onClick={() => onIncrement?.(product.id)}
              title="Add 1 to stock"
            >+</button>
          </div>

          {/* Description */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 12, padding: '16px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Description</div>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              {product.description || 'No description available.'}
            </p>
          </div>

          {/* Specs */}
          {specsList.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border2)',
              borderRadius: 12, padding: '16px', marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Specifications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {specsList.map((spec, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 0',
                    borderBottom: i < specsList.length - 1 ? '1px solid var(--border2)' : 'none',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add to cart controls */}
          {!outOfStock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button className="small-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
              <div style={{
                minWidth: 50, textAlign: 'center', fontWeight: 800, fontSize: 18,
                color: 'var(--cyan)',
              }}>{qty}</div>
              <button className="small-btn" onClick={() => setQty((q) => Math.min(product.quantity, q + 1))} disabled={qty >= product.quantity}>+</button>
              <button
                className="btn btn-primary"
                onClick={handleAddToCart}
                style={{ flex: 1, padding: '12px 20px', fontSize: 15 }}
              >
                Add {qty} to Cart
              </button>
            </div>
          )}

          {outOfStock && (
            <div style={{
              padding: '14px 20px', borderRadius: 12, marginBottom: 16,
              background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)',
              color: 'var(--red)', fontWeight: 600, textAlign: 'center',
            }}>
              This product is currently out of stock
            </div>
          )}

          {/* Remove button */}
          <button
            className="remove"
            onClick={() => {
              if (window.confirm('Remove this product?')) {
                onRemoveProduct?.(product.id);
                navigate('/');
              }
            }}
            style={{ width: '100%', padding: '10px' }}
          >
            Remove Product
          </button>
        </div>
      </div>
    </section>
  );
}
