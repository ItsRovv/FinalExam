// src/pages/ProductList.jsx
import React from 'react';
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
    // If already https, return as-is
    if (url.startsWith('https://')) return url;
    // Otherwise use a simple proxy to avoid mixed-content or redirect pages
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
  onAddToCart = () => {},
  onRemoveProduct = () => {},
}) {
  const filtered = category === 'All' ? products : products.filter((p) => p.category === category);

  return (
    <section>
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
                <p>Quantity: {p.quantity}</p>
                <p>Subtotal: {currencyFormatter.format(subtotal)}</p>

                {outOfStock ? (
                  <div className="badge out" style={{ marginTop: 8 }}>Out of stock</div>
                ) : (
                  lowStock && <span className="badge" style={{ marginTop: 8 }}>Low Stock</span>
                )}

                <div className="actions" style={{ marginTop: 12 }}>
                  <button
                    className={`btn ${inCart ? 'btn-added' : 'btn-primary'}`}
                    onClick={() => onAddToCart(p.id)}
                    aria-pressed={inCart}
                    disabled={outOfStock}
                    title={outOfStock ? 'Out of stock' : inCart ? 'Already in cart' : 'Add to cart'}
                  >
                    {inCart ? 'Added to Cart' : 'Add to Cart'}
                  </button>

                  <button
                    onClick={() => onIncrement(p.id)}
                    disabled={outOfStock}
                    aria-label={`Increase quantity of ${p.name}`}
                    className="small-btn"
                  >
                    +
                  </button>

                  <button
                    onClick={() => onDecrement(p.id)}
                    disabled={outOfStock}
                    aria-label={`Decrease quantity of ${p.name}`}
                    className="small-btn"
                  >
                    -
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
