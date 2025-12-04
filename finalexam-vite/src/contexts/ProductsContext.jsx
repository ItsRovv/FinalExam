import React, { createContext, useContext, useState } from 'react';
import initialProducts from '../data/products';

const ProductsContext = createContext();

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);

  const updateProductQuantity = (productId, delta) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, quantity: Math.max(0, (p.quantity || 0) + delta) } : p))
    );
  };

  const replaceProducts = (newList) => {
    setProducts(newList);
  };

  return (
    <ProductsContext.Provider value={{ products, updateProductQuantity, replaceProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}