import React, { useState } from 'react';

const emptyForm = {
  name: '',
  image: '',
  category: '',
  description: '',
  specs: '',
  rating: '',
  price: '',
  quantity: '',
};

function normalizeUrl(url) {
  return url ? url.trim() : '';
}

function preloadImage(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      img.src = '';
      reject(new Error('Image load timeout'));
    }, timeout);

    img.onload = () => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      if (timedOut) return;
      clearTimeout(timer);
      reject(new Error('Image failed to load'));
    };
    img.src = url;
  });
}

export default function AddProductForm({ onAddProduct = () => {} }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!form.name.trim()) {
      setError('Product name is required');
      setLoading(false);
      return;
    }
    if (!form.image.trim()) {
      setError('Image URL is required');
      setLoading(false);
      return;
    }
    if (!form.category.trim()) {
      setError('Category is required');
      setLoading(false);
      return;
    }
    if (!form.price.trim() || Number.isNaN(parseFloat(form.price))) {
      setError('Valid price is required');
      setLoading(false);
      return;
    }
    if (!form.quantity.trim() || Number.isNaN(parseInt(form.quantity, 10))) {
      setError('Valid quantity is required');
      setLoading(false);
      return;
    }

    let imageUrl = normalizeUrl(form.image);

    // Try to preload the provided URL
    try {
      await preloadImage(imageUrl);
    } catch (err) {
      // If direct load fails, try a secure proxy fallback
      try {
        const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl.replace(/^https?:\/\//, ''))}`;
        await preloadImage(proxied);
        imageUrl = proxied;
      } catch (err2) {
        setError('Image could not be loaded. Use a direct HTTPS image URL (ends with .jpg/.png/.webp) or host it publicly.');
        setLoading(false);
        return;
      }
    }

    const newProduct = {
      id: `p-${Date.now()}`,
      name: form.name.trim(),
      image: imageUrl,
      category: form.category.trim(),
      description: form.description.trim(),
      specs: form.specs.trim(),
      rating: parseFloat(form.rating) || 0,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity, 10),
    };

    onAddProduct(newProduct);

    // show toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    setForm(emptyForm);
    setError('');
    setLoading(false);
  };

  return (
    <section>
      <h2 style={{ color: 'white' }}>Add New Product</h2>

      {/* Toast notification */}
      {showToast && (
        <div className="toast toast-success" role="status" aria-live="polite">
          Product Added
        </div>
      )}

      {error && <p className="error" style={{ color: '#ffb4b4' }}>{error}</p>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="grid-form">
          <div>
            <label>Feature Image URL</label>
            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label>Product Name</label>
            <input name="name" value={form.name} onChange={handleChange} />
          </div>

          <div>
            <label>Product Category</label>
            <input name="category" value={form.category} onChange={handleChange} />
          </div>

          <div className="full">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} />
          </div>

          <div className="full">
            <label>Product Specification</label>
            <textarea name="specs" value={form.specs} onChange={handleChange} />
          </div>

          <div>
            <label>Rating</label>
            <input
              name="rating"
              value={form.rating}
              onChange={handleChange}
              type="number"
              step="0.1"
              min="0"
              max="5"
            />
          </div>

          <div>
            <label>Price</label>
            <input
              name="price"
              value={form.price}
              onChange={handleChange}
              type="number"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label>Quantity</label>
            <input
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              type="number"
              step="1"
              min="0"
            />
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-theme" disabled={loading}>
            {loading ? 'Adding…' : 'Add Product'}
          </button>
        </div>
      </form>
    </section>
  );
}
