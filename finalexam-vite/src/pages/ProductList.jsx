// src/pages/ProductList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CategoryFilter from '../components/CategoryFilter';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

function proxyImage(url) {
  if (!url) return '/images/fallback.png';
  try {
    if (url.startsWith('https://')) return url;
    const clean = url.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}`;
  } catch {
    return '/images/fallback.png';
  }
}

export default function ProductList({
  products = [],
  category = 'All',
  categories = [],
  setCategory = () => {},
  cart = {},
  onIncrement = () => {},
  onDecrement = () => {},
  onAddToCart = () => {}, // expects (id, qty)
  onRemoveProduct = () => {},
}) {
  const filtered = category === 'All' ? products : products.filter((p) => p.category === category);

  // local state to track how many the user intends to order per product
  const [orderQty, setOrderQty] = useState({}); // { [id]: number }

  // toast state
  const [toast, setToast] = useState({ visible: false, text: '' });

  useEffect(() => {
    let t;
    if (toast.visible) {
      t = setTimeout(() => setToast({ visible: false, text: '' }), 3200);
    }
    return () => clearTimeout(t);
  }, [toast.visible]);

  const incOrder = (id, stock) => {
    setOrderQty((prev) => {
      const current = prev[id] || 0;
      const next = Math.min(stock, current + 1);
      return { ...prev, [id]: next };
    });
  };

  const decOrder = (id) => {
    setOrderQty((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current - 1);
      return { ...prev, [id]: next };
    });
  };

  const handleAddToCart = (id, stock, name) => {
    const qty = orderQty[id] || 1; // default to 1 if user didn't set a number
    if (qty <= 0) return;
    if (qty > stock) {
      // simple feedback if requested qty exceeds stock
      setToast({ visible: true, text: `Only ${stock} left in stock` });
      return;
    }
    onAddToCart(id, qty);
    setOrderQty((prev) => ({ ...prev, [id]: 0 }));
    setToast({ visible: true, text: `${qty} × ${name} added to cart` });
  };

  return (
    <section>
      {/* Toast */}
      {toast.visible && (
        <div className="toast toast-success toast-animate" role="status" aria-live="polite">
          {toast.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'white' }}>Products</h2>
        <div style={{ minWidth: 220 }}>
          <CategoryFilter categories={categories} value={category} onChange={setCategory} />
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        {filtered.map((p) => {
          const subtotal = p.price * p.quantity;
          const lowStock = p.quantity > 0 && p.quantity < 5;
          const outOfStock = p.quantity === 0;
          const inCart = Boolean(cart[p.id]);
          const selected = orderQty[p.id] || 0;

          return (
            <article
              key={p.id}
              className={`card ${lowStock ? 'low-stock' : ''} ${outOfStock ? 'out-of-stock' : ''}`}
            >
              <div className="thumb-frame" aria-hidden="true">
                <img
                  src={proxyImage(p.image)}
                  alt={p.name}
                  className="thumb-img hover-zoom"
                  onError={(e) => {
                    e.currentTarget.src = '/images/fallback.png';
                  }}
                />
              </div>

              <div className="card-body">
                <h3 style={{ margin: '8px 0' }}>
                  <Link to={`/product/${p.id}`}>{p.name}</Link>
                </h3>

                <p className="muted">Category: {p.category}</p>
                <p>Price: {currencyFormatter.format(p.price)}</p>

                {/* Stock label (was Quantity) */}
                <p><strong>Stock:</strong> {p.quantity}</p>

                <p>Subtotal (stock value): {currencyFormatter.format(subtotal)}</p>

                {outOfStock ? (
                  <div className="badge out" style={{ marginTop: 8 }}>Out of stock</div>
                ) : (
                  lowStock && <span className="badge" style={{ marginTop: 8 }}>Low Stock</span>
                )}

                {/* Order controls */}
                <div className="actions" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="small-btn"
                    onClick={() => decOrder(p.id)}
                    disabled={selected <= 0}
                    aria-label={`Decrease order quantity for ${p.name}`}
                  >
                    -
                  </button>

                  <div style={{ minWidth: 44, textAlign: 'center', fontWeight: 700 }}>
                    {selected}
                  </div>

                  <button
                    className="small-btn"
                    onClick={() => incOrder(p.id, p.quantity)}
                    disabled={outOfStock || selected >= p.quantity}
                    aria-label={`Increase order quantity for ${p.name}`}
                  >
                    +
                  </button>

                  <button
                    className={`btn ${inCart ? 'btn-added' : 'btn-primary'}`}
                    onClick={() => handleAddToCart(p.id, p.quantity, p.name)}
                    disabled={outOfStock || (orderQty[p.id] || 1) <= 0}
                    title={outOfStock ? 'Out of stock' : 'Add selected quantity to cart'}
                    style={{ marginLeft: 12 }}
                  >
                    Add to Cart
                  </button>
                </div>

                <div className="remove-row center" style={{ marginTop: 12 }}>
                  <button
                    className="remove"
                    onClick={() => onRemoveProduct(p.id)}
                    aria-label={`Remove ${p.name} from product list`}
                  >
                    Remove Product
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="muted" style={{ marginTop: 18 }}>
          No products in this category.
        </p>
      )}
    </section>
  );
}
