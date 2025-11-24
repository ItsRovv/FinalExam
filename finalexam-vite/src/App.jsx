// src/App.jsx
import React, { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import AddProductForm from './components/AddProductForm';
import Cart from './pages/Cart';
import { initialProducts } from './data/products';
import './App.css';

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState('All');

  // Derived values
  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + p.price * p.quantity, 0),
    [products]
  );

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Handlers
  const updateProductQuantity = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p))
    );
  };

  const addToCart = (id) => {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  if (product.quantity === 0) {
    // optional: show a toast or console message
    console.warn('Cannot add to cart: product is out of stock', id);
    return;
  }
  setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
};

  const removeFromCart = (id) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const onAddProduct = (newProduct) => {
    setProducts((prev) => [...prev, newProduct]);
  };

  const removeProduct = (id) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/" className="logo">Product Management</Link>
        <nav className="nav">
          <Link to="/">Products</Link>
          <Link to="/add">Add Product</Link>
          <Link to="/cart" className="view-cart">View Cart</Link>
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <ProductList
                  products={products}
                  category={category}
                  categories={categories}
                  setCategory={setCategory}
                  cart={cart}
                  onIncrement={(id) => updateProductQuantity(id, +1)}
                  onDecrement={(id) => updateProductQuantity(id, -1)}
                  onAddToCart={addToCart}
                  onRemoveProduct={removeProduct}
                />
                <div className="totals-bar">
                  <strong>Total value:</strong> {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalValue)}
                </div>
              </>
            }
          />

          <Route
            path="/product/:id"
            element={
              <ProductDetail
                products={products}
                onAddToCart={addToCart}
                onIncrement={(id) => updateProductQuantity(id, +1)}
                onDecrement={(id) => updateProductQuantity(id, -1)}
                onRemoveProduct={removeProduct}
              />
            }
          />

          <Route path="/add" element={<AddProductForm onAddProduct={onAddProduct} />} />

          <Route
            path="/cart"
            element={<Cart products={products} cart={cart} onRemoveFromCart={removeFromCart} />}
          />

          <Route path="*" element={<div style={{ color: 'white' }}>Page not found</div>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
