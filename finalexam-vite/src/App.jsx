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

  // Add to cart: only updates cart (stock is NOT decremented here)
  const addToCart = (id, qty = 1) => {
    if (qty <= 0) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    // Do not change product.quantity here — stock will be adjusted on checkout
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + qty }));
  };

  // Remove item from cart (no stock restoration here because stock wasn't decremented on add)
  const removeFromCart = (id) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Checkout: validate stock, decrement stock, clear cart
  const handleCheckout = () => {
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    if (entries.length === 0) {
      return { success: false, message: 'Cart is empty.' };
    }

    // Validate stock availability
    for (const [id, qty] of entries) {
      const product = products.find((p) => p.id === id);
      if (!product) {
        return { success: false, message: `Product ${id} not found.` };
      }
      if (product.quantity < qty) {
        return { success: false, message: `Not enough stock for ${product.name}. Available: ${product.quantity}` };
      }
    }

    // All good — decrement stock
    setProducts((prev) =>
      prev.map((p) => {
        const qtyInCart = cart[p.id] || 0;
        if (qtyInCart > 0) {
          return { ...p, quantity: Math.max(0, p.quantity - qtyInCart) };
        }
        return p;
      })
    );

    // Clear cart
    setCart({});

    return { success: true };
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
                  onAddToCart={addToCart} // still accepts (id, qty)
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
            element={<Cart products={products} cart={cart} onRemoveFromCart={removeFromCart} onCheckout={handleCheckout} />}
          />

          <Route path="*" element={<div style={{ color: 'white' }}>Page not found</div>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
