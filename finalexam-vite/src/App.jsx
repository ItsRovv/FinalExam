// src/App.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import AddProductForm from './components/AddProductForm';
import Cart from './pages/Cart';
import { initialProducts } from './data/products';
import './App.css';

// Chat widget import
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState('All');

  // Fetch products from backend on mount; fallback to initialProducts
  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error('no backend');
        return r.json();
      })
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch(() => {
        // backend not available — keep initialProducts
      });
    return () => { mounted = false; };
  }, []);

  // Derived values
  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0),
    [products]
  );

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Handlers (unchanged)
  const updateProductQuantity = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(0, (p.quantity || 0) + delta) } : p))
    );
  };

  const addToCart = (id, qty = 1) => {
    if (qty <= 0) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + qty }));
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleCheckout = () => {
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    if (entries.length === 0) {
      return { success: false, message: 'Cart is empty.' };
    }

    for (const [id, qty] of entries) {
      const product = products.find((p) => p.id === id);
      if (!product) {
        return { success: false, message: `Product ${id} not found.` };
      }
      if ((product.quantity || 0) < qty) {
        return { success: false, message: `Not enough stock for ${product.name}. Available: ${product.quantity}` };
      }
    }

    setProducts((prev) =>
      prev.map((p) => {
        const qtyInCart = cart[p.id] || 0;
        if (qtyInCart > 0) {
          return { ...p, quantity: Math.max(0, (p.quantity || 0) - qtyInCart) };
        }
        return p;
      })
    );

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

      <main className="container" style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
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
                  <div className="totals-bar" style={{ marginTop: 12 }}>
                    <strong>Total value:</strong>{' '}
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalValue)}
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
        </div>

        {/* Sidebar for chat widget - pass products and handlers */}
        <aside style={{ width: 360 }}>
          <ChatWidget
            products={products}
            cart={cart}
            onAddToCart={addToCart}
            onOpenProduct={(id) => {
              console.log('open product', id);
            }}
          />
        </aside>
      </main>
    </BrowserRouter>
  );
}
