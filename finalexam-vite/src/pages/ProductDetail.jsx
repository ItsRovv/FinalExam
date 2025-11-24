// src/pages/ProductDetail.jsx
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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

export default function ProductDetail({
  products = [],
  cart = {},
  onAddToCart = () => {},
  onIncrement = () => {},
  onDecrement = () => {},
  onRemoveProduct = () => {},
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const inCart = Boolean(cart && product && cart[product.id]);

  if (!product) {
    return (
      <section>
        <h2 style={{ color: 'white' }}>Product not found</h2>
        <p className="muted">This product does not exist or was removed.</p>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </section>
    );
  }

  const outOfStock = product.quantity === 0;

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'white' }}>{product.name}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, marginTop: 12 }}>
        <div>
          <div className="thumb-frame" style={{ width: '100%', aspectRatio: '4/3' }}>
            <img
              src={proxyImage(product.image)}
              alt={product.name}
              className="thumb-img hover-zoom"
              onError={(e) => { e.currentTarget.src = '/images/fallback.png'; }}
            />
          </div>
        </div>

        <div>
          <p className="muted">Category: {product.category}</p>
          <p style={{ fontSize: 18, marginTop: 6 }}>{currencyFormatter.format(product.price)}</p>
          <p style={{ marginTop: 8 }}>Quantity available: {product.quantity}</p>

          {outOfStock ? (
            <div className="badge out" style={{ marginTop: 8 }}>Out of stock</div>
          ) : (
            product.quantity < 5 && <div className="badge" style={{ marginTop: 8 }}>Low Stock</div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className={`btn ${inCart ? 'btn-added' : 'btn-primary'}`}
              onClick={() => onAddToCart(product.id)}
              disabled={outOfStock}
              aria-pressed={inCart}
            >
              {outOfStock ? 'Out of stock' : inCart ? 'Added to Cart' : 'Add to Cart'}
            </button>

            <button onClick={() => onIncrement(product.id)} disabled={outOfStock} className="small-btn">+</button>
            <button onClick={() => onDecrement(product.id)} disabled={outOfStock} className="small-btn">-</button>

            <button
              className="remove"
              onClick={() => {
                onRemoveProduct(product.id);
                navigate('/');
              }}
              style={{ marginLeft: 12 }}
            >
              Remove Product
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            <h4 style={{ marginBottom: 8 }}>Description</h4>
            <p className="muted">{product.description || 'No description provided.'}</p>
          </div>

          {product.specs && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ marginBottom: 8 }}>Specifications</h4>
              <p className="muted">{product.specs}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
