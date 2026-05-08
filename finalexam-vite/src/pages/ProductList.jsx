// src/pages/ProductList.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CategoryFilter from '../components/CategoryFilter';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 2,
});

function proxyImage(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
  return url;
}

// Add another button with hover state
function AddToCartBtn({ inCart, outOfStock, onClick }) {
  const [hovered, setHovered] = useState(false);

  if (outOfStock) return null;

  if (inCart) {
    return (
      <button
        className="btn"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flex: 1, marginLeft: 4,
          background: hovered
            ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,153,187,0.2))'
            : 'rgba(0,229,160,0.1)',
          border: hovered ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(0,229,160,0.3)',
          color: hovered ? '#00d4ff' : '#00e5a0',
          transition: 'all 0.2s',
        }}
      >
        {hovered ? 'Add another?' : '✓ In Cart'}
      </button>
    );
  }

  return (
    <button className="btn btn-primary" onClick={onClick} style={{ flex: 1, marginLeft: 4 }}>
      Add to Cart
    </button>
  );
}

export default function ProductList({
  products = [], category = 'All', categories = [],
  setCategory = () => {}, cart = {},
  onIncrement = () => {}, onDecrement = () => {},
  onAddToCart = () => {}, onRemoveProduct = () => {},
}) {
  const navigate = useNavigate();
  const filtered = category === 'All' ? products : products.filter((p) => p.category === category);
  const [orderQty, setOrderQty] = useState({});
  const [toast, setToast] = useState({ visible: false, text: '' });

  useEffect(() => {
    let t;
    if (toast.visible) t = setTimeout(() => setToast({ visible: false, text: '' }), 3200);
    return () => clearTimeout(t);
  }, [toast.visible]);

  const incOrder = (id, stock) => setOrderQty((prev) => ({ ...prev, [id]: Math.min(stock, (prev[id] || 0) + 1) }));
  const decOrder = (id) => setOrderQty((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));

  const handleAddToCart = (id, stock, name) => {
    const qty = orderQty[id] || 1;
    if (qty > stock) { setToast({ visible: true, text: `Only ${stock} left in stock` }); return; }
    onAddToCart(id, qty);
    setOrderQty((prev) => ({ ...prev, [id]: 0 }));
  };

  return (
    <section>
      {toast.visible && (
        <div className="toast toast-animate" style={{ borderColor: 'rgba(255,77,109,0.3)', color: 'var(--red)' }}>
          ⚠ {toast.text}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 10 }}>
          Products <span style={{ color: 'var(--text3)', fontSize: 14, fontWeight: 400 }}>({filtered.length})</span>
        </h2>
        <div style={{ maxWidth: 240 }}>
          <CategoryFilter categories={categories} value={category} onChange={setCategory} />
        </div>
      </div>

      <div className="grid">
        {filtered.map((p) => {
          const subtotal = p.price * p.quantity;
          const lowStock = p.quantity > 0 && p.quantity < 5;
          const outOfStock = p.quantity === 0;
          const inCart = Boolean(cart[p.id]);
          const selected = orderQty[p.id] || 0;

          return (
            <article key={p.id} className={`card ${lowStock ? 'low-stock' : ''} ${outOfStock ? 'out-of-stock' : ''}`}
              onClick={() => navigate(`/product/${p.id}`)} style={{ cursor: 'pointer' }}>
              <div className="thumb-frame">
                <img
                  src={proxyImage(p.image)}
                  alt={p.name}
                  className="thumb-img"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://cdn.dummyjson.com/products/images/smartphones/iPhone%2015%20Pro/1.png`;
                  }}
                />
                <div style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 2,
                  background: 'rgba(8,11,18,0.8)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0,212,255,0.2)', borderRadius: 20,
                  padding: '3px 10px', fontSize: 10, fontWeight: 700,
                  color: 'var(--cyan)', letterSpacing: 1, textTransform: 'uppercase',
                }}>{p.category}</div>

                {lowStock && !outOfStock && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 2,
                    background: 'rgba(240,192,64,0.15)', border: '1px solid rgba(240,192,64,0.4)',
                    borderRadius: 20, padding: '3px 10px',
                    fontSize: 10, fontWeight: 700, color: 'var(--gold)',
                  }}>LOW STOCK</div>
                )}
                {outOfStock && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 2,
                    background: 'rgba(255,77,109,0.15)', border: '1px solid rgba(255,77,109,0.4)',
                    borderRadius: 20, padding: '3px 10px',
                    fontSize: 10, fontWeight: 700, color: 'var(--red)',
                  }}>OUT OF STOCK</div>
                )}
              </div>

              <div className="card-body">
                <h3><Link to={`/product/${p.id}`}>{p.name}</Link></h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 4px' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--cyan)', letterSpacing: -0.5 }}>
                    {currencyFormatter.format(p.price)}
                  </span>
                  <span style={{ fontSize: 11, color: inCart ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>
                    {inCart ? `● ${cart[p.id]} in cart` : `${p.quantity} in stock`}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                  Subtotal: {currencyFormatter.format(subtotal)}
                </div>

                {!outOfStock && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <button className="small-btn" onClick={(e) => { e.stopPropagation(); decOrder(p.id); }} disabled={selected <= 0}>−</button>
                    <div style={{
                      minWidth: 40, textAlign: 'center', fontWeight: 700, fontSize: 15,
                      color: selected > 0 ? 'var(--cyan)' : 'var(--text2)',
                    }}>{selected}</div>
                    <button className="small-btn" onClick={(e) => { e.stopPropagation(); incOrder(p.id, p.quantity); }} disabled={selected >= p.quantity}>+</button>
                    <AddToCartBtn
                      inCart={inCart}
                      outOfStock={outOfStock}
                      onClick={(e) => { e?.stopPropagation?.(); handleAddToCart(p.id, p.quantity, p.name); }}
                    />
                  </div>
                )}

                {outOfStock && <div style={{ marginBottom: 10 }}><div className="badge out">Out of Stock</div></div>}

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button className="remove" onClick={(e) => { e.stopPropagation(); onRemoveProduct(p.id); }}>Remove</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No products in this category</div>
        </div>
      )}
    </section>
  );
}
