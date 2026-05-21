// src/App.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import AddProductForm from './components/AddProductForm';
import Cart from './pages/Cart';
import { initialProducts } from './data/products';
import './App.css';
import ChatWidget from './components/ChatWidget';

function CartToast({ message, visible }) {
  if (!visible) return null;
  const isWarning = message.startsWith('⚠');
  return (
    <div
      className={`toast ${isWarning ? '' : 'toast-success'} toast-animate`}
      style={isWarning ? { borderColor: 'rgba(255,77,109,0.3)', color: 'var(--red)' } : {}}
      role="status" aria-live="polite"
    >
      {message}
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState('All');
  const [cartToast, setCartToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then((r) => { if (!r.ok) throw new Error('no backend'); return r.json(); })
      .then((data) => {
        if (mounted) {
          setProducts(Array.isArray(data) && data.length > 0 ? data : initialProducts);
          setProductsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setProducts(initialProducts);
          setProductsLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const showCartToast = useCallback((productName) => {
    setCartToast({ visible: true, message: `${productName} added to cart!` });
    setTimeout(() => setCartToast({ visible: false, message: '' }), 3200);
  }, []);

  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0),
    [products]
  );

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const updateProductQuantity = (id, delta) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, quantity: Math.max(0, (p.quantity || 0) + delta) } : p));
    fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_delta: delta }),
    }).catch(() => {});
  };

  const addToCart = useCallback((id, qty = 1) => {
    if (qty <= 0) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const currentInCart = cart[id] || 0;
    const available = Math.max(0, (product.quantity || 0) - currentInCart);
    if (available <= 0) {
      setCartToast({ visible: true, message: `⚠ ${product.name} is out of stock!` });
      setTimeout(() => setCartToast({ visible: false, message: '' }), 3200);
      return;
    }
    const actualQty = Math.min(qty, available);
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + actualQty }));
    if (actualQty < qty) {
      setCartToast({ visible: true, message: `⚠ Only ${actualQty} added — ${product.name} has ${product.quantity} in stock` });
      setTimeout(() => setCartToast({ visible: false, message: '' }), 3200);
    } else {
      showCartToast(product.name);
    }
  }, [products, cart, showCartToast]);

  const removeFromCart = (id) =>
    setCart((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });

  const handleCheckout = (pendingAdds = {}) => {
    // Merge current cart with any add actions the AI sent in the same message
    const checkoutCart = { ...cart };
    for (const [id, qty] of Object.entries(pendingAdds)) {
      const product = products.find((p) => p.id === id);
      if (product) {
        const already = checkoutCart[id] || 0;
        const available = Math.max(0, (product.quantity || 0) - already);
        const add = Math.min(qty, available);
        if (add > 0) checkoutCart[id] = already + add;
      }
    }
    const entries = Object.entries(checkoutCart).filter(([, qty]) => qty > 0);
    if (entries.length === 0) return { success: false, message: 'Cart is empty.' };
    for (const [id, qty] of entries) {
      const product = products.find((p) => p.id === id);
      if (!product) return { success: false, message: `Product ${id} not found.` };
      if ((product.quantity || 0) < qty) return { success: false, message: `Not enough stock for ${product.name}.` };
    }
    setProducts((prev) => prev.map((p) => {
      const qtyInCart = checkoutCart[p.id] || 0;
      return qtyInCart > 0 ? { ...p, quantity: Math.max(0, (p.quantity || 0) - qtyInCart) } : p;
    }));
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: checkoutCart }),
    })
      .then(() =>
        fetch('/api/products')
          .then((r) => r.json())
          .then((data) => { if (Array.isArray(data) && data.length > 0) setProducts(data); })
          .catch(() => {})
      )
      .catch(() => {});
    setCart({});
    return { success: true };
  };

  const onAddProduct = (newProduct) => {
    setProducts((prev) => [...prev, newProduct]);
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    }).catch(() => {});
  };
  const removeProduct = (id) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
    fetch(`/api/products/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <BrowserRouter>
      <CartToast visible={cartToast.visible} message={cartToast.message} />

      <header className="app-header">
        <Link to="/" className="logo">GROUP 1 SHOP</Link>
        <nav className="nav">
          <Link to="/">Products</Link>
          <Link to="/add">Add Product</Link>
          <Link to="/cart" className="view-cart">
            Cart{cartCount > 0 && (
              <span style={{
                background: 'rgba(0,212,255,0.25)', borderRadius: 20,
                padding: '1px 7px', fontSize: 11, marginLeft: 6, color: 'var(--cyan)',
              }}>{cartCount}</span>
            )}
          </Link>
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={
            <>
              <ProductList
                products={products} loading={productsLoading}
                category={category} categories={categories}
                setCategory={setCategory} cart={cart}
                onIncrement={(id) => updateProductQuantity(id, +1)}
                onDecrement={(id) => updateProductQuantity(id, -1)}
                onAddToCart={addToCart} onRemoveProduct={removeProduct}
              />
              <div className="totals-bar" style={{ marginTop: 16 }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>Total inventory value:</span>
                <strong>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalValue)}</strong>
              </div>
            </>
          } />
          <Route path="/product/:id" element={
            <ProductDetail products={products} onAddToCart={addToCart}
              onIncrement={(id) => updateProductQuantity(id, +1)}
              onDecrement={(id) => updateProductQuantity(id, -1)}
              onRemoveProduct={removeProduct} />
          } />
          <Route path="/add" element={<AddProductForm onAddProduct={onAddProduct} />} />
          <Route path="/cart" element={
            <Cart products={products} cart={cart} onRemoveFromCart={removeFromCart} onCheckout={handleCheckout} />
          } />
          <Route path="*" element={
            <div style={{ color: 'var(--text2)', padding: 40, textAlign: 'center' }}>Page not found</div>
          } />
        </Routes>
      </main>

      {/* Floating chat bubble — always visible */}
      <ChatWidget
         products={products} cart={cart}
         onAddToCart={addToCart}
         onRemoveFromCart={removeFromCart}
         onSetCategory={setCategory}
         onCheckout={handleCheckout}
        onOpenProduct={(id) => console.log('open product', id)}
      />
    </BrowserRouter>
  );
}
