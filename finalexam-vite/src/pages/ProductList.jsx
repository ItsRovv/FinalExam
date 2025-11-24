import { Link } from 'react-router-dom';
import CategoryFilter from '../components/CategoryFilter';

export default function ProductList({
  products,
  category,
  categories,
  setCategory,
  onIncrement,
  onDecrement,
  onAddToCart,
}) {
  const filtered =
    category === 'All'
      ? products
      : products.filter((p) => p.category === category);

  return (
    <section>
      <h2>Products</h2>
      <CategoryFilter
        categories={categories}
        value={category}
        onChange={setCategory}
      />

      <div className="grid">
        {filtered.map((p) => {
          const subtotal = (p.price * p.quantity).toFixed(2);
          const lowStock = p.quantity < 5;

          return (
            <article key={p.id} className={`card ${lowStock ? 'low-stock' : ''}`}>
              <img src={p.image} alt={p.name} className="thumb" />
              <div className="card-body">
                <h3>
                  <Link to={`/product/${p.id}`}>{p.name}</Link>
                </h3>
                <p className="muted">Category: {p.category}</p>
                <p>Price: ${p.price.toFixed(2)}</p>
                <p>Quantity: {p.quantity}</p>
                <p>Subtotal: ${subtotal}</p>
                {lowStock && <span className="badge">Low Stock</span>}

                <div className="actions">
                  <button onClick={() => onAddToCart(p.id)}>Add to Cart</button>
                  <button onClick={() => onIncrement(p.id)}>+</button>
                  <button
                    onClick={() => onDecrement(p.id)}
                    disabled={p.quantity === 0}
                  >
                    -
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <p className="muted">No products in this category.</p>
        )}
      </div>
    </section>
  );
}
