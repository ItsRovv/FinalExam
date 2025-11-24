import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function ProductDetail({
  products,
  onAddToCart,
  onIncrement,
  onDecrement,
}) {
  const { id } = useParams();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

  if (!product) {
    return (
      <section>
        <p>Product not found.</p>
        <Link to="/">Back to Products</Link>
      </section>
    );
  }

  const subtotal = (product.price * product.quantity).toFixed(2);
  const lowStock = product.quantity < 5;

  return (
    <section className="detail">
      <Link to="/" className="back">&larr; Back</Link>
      <div className="detail-card">
        <img src={product.image} alt={product.name} className="detail-img" />
        <div>
          <h2>{product.name}</h2>
          <p className="muted">Category: {product.category}</p>
          <p>{product.description}</p>
          <p><strong>Specs:</strong> {product.specs}</p>
          <p><strong>Rating:</strong> {product.rating} / 5</p>
          <p><strong>Price:</strong> ${product.price.toFixed(2)}</p>
          <p><strong>Quantity:</strong> {product.quantity}</p>
          <p><strong>Subtotal:</strong> ${subtotal}</p>
          {lowStock && <span className="badge">Low Stock</span>}

          <div className="actions">
            <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
            <button onClick={() => onIncrement(product.id)}>+</button>
            <button
              onClick={() => onDecrement(product.id)}
              disabled={product.quantity === 0}
            >
              -
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
