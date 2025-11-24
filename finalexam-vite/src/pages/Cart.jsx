// src/pages/Cart.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export default function Cart({ products = [], cart = {}, onRemoveFromCart = () => {} }) {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);

  const items = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        if (!product) return null;
        return {
          id,
          name: product.name,
          price: product.price,
          qty,
          subtotal: product.price * qty,
          image: product.image,
        };
      })
      .filter(Boolean);
  }, [cart, products]);

  const total = items.reduce((sum, it) => sum + it.subtotal, 0);

  const handleCheckout = () => {
    if (items.length === 0) return;

    // Show toast with fade in/out animation
    setShowToast(true);

    // Match this timeout to the CSS animation duration (in ms)
    const ANIMATION_MS = 3200;
    setTimeout(() => setShowToast(false), ANIMATION_MS);

    // Optional: clear cart or trigger further checkout logic here
  };

  return (
    <section>
      {/* Toast notification */}
      {showToast && (
        <div className="toast toast-success toast-animate" role="status" aria-live="polite">
          On the Way, and will be delivered!
        </div>
      )}

      <div className="cart-header">
        <h2 style={{ color: 'white' }}>Your Cart</h2>
        <div className="cart-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
          <button
            className="btn btn-checkout"
            onClick={handleCheckout}
            disabled={items.length === 0}
            aria-disabled={items.length === 0}
          >
            Check Out
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="muted">Your cart is empty.</p>
      ) : (
        <div className="cart-list">
          {items.map((it) => (
            <div key={it.id} className="cart-row">
              <div className="cart-left">
                <div className="cart-thumb-frame">
                  <img
                    src={it.image}
                    alt={it.name}
                    className="cart-thumb"
                    onError={(e) => { e.currentTarget.src = '/images/fallback.png'; }}
                  />
                </div>
                <div className="cart-meta">
                  <div className="cart-name">{it.name}</div>
                  <div className="cart-price">{currencyFormatter.format(it.price)}</div>
                </div>
              </div>

              <div className="cart-qty">x{it.qty}</div>
              <div className="cart-subtotal">{currencyFormatter.format(it.subtotal)}</div>

              <div className="cart-actions">
                <button
                  className="btn cart-remove"
                  onClick={() => onRemoveFromCart(it.id)}
                  aria-label={`Remove ${it.name} from cart`}
                >
                  Remove Item
                </button>
              </div>
            </div>
          ))}

          <div className="cart-total">
            <strong>Total:</strong> {currencyFormatter.format(total)}
          </div>
        </div>
      )}
    </section>
  );
}
