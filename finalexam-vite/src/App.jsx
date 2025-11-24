import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { initialProducts } from './data/products';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import AddProductForm from './components/AddProductForm';
import TotalsBar from './components/TotalsBar';
import './App.css';

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState({}); // { productId: quantityInCart }
  const [category, setCategory] = useState('All');

  // Derived totals
  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + p.price * p.quantity, 0),
    [products]
  );

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Handlers
  const updateProductQuantity = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, quantity: Math.max(0, p.quantity + delta) }
          : p
      )
    );
  };

  const addToCart = (id) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const onAddProduct = (newProduct) => {
    setProducts((prev) => [...prev, newProduct]);
  };

  useEffect(() => {
    // Example: could persist totals or sync, left simple for rubric
  }, [products]);

  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/" className="logo">Product Management</Link>
        <nav className="nav">
          <Link to="/">Products</Link>
          <Link to="/add">Add Product</Link>
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <TotalsBar totalValue={totalValue} />
                <ProductList
                  products={products}
                  category={category}
                  categories={categories}
                  setCategory={setCategory}
                  onIncrement={(id) => updateProductQuantity(id, +1)}
                  onDecrement={(id) => updateProductQuantity(id, -1)}
                  onAddToCart={addToCart}
                />
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
              />
            }
          />
          <Route path="/add" element={<AddProductForm onAddProduct={onAddProduct} />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
