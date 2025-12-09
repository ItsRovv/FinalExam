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
  const [previewUrl, setPreviewUrl] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));

    if (name === 'image') {
      const raw = normalizeUrl(value);
      const isValid = /\.(jpg|jpeg|png|webp|gif)$/i.test(raw);
      if (isValid) {
        const proxied = raw.startsWith('https://')
          ? raw
          : `https://images.weserv.nl/?url=${encodeURIComponent(raw.replace(/^https?:\/\//, ''))}`;
        setPreviewUrl(proxied);
      } else {
        setPreviewUrl('');
      }
    }
  };

  // Drag and drop handler
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setForm((f) => ({ ...f, image: localUrl }));
    } else {
      setError('Only image files are supported');
    }
  };

  // Clipboard paste handler
  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        setForm((f) => ({ ...f, image: localUrl }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!form.name.trim()) {
      setError('Product name is required');
      setLoading(false);
      return;
    }
    if (!form.image.trim()) {
      setError('Image URL or file is required');
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

    // Only preload if it's a remote URL (not a blob from file/clipboard)
    if (!imageUrl.startsWith('blob:')) {
      try {
        await preloadImage(imageUrl);
      } catch (err) {
        try {
          const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl.replace(/^https?:\/\//, ''))}`;
          await preloadImage(proxied);
          imageUrl = proxied;
        } catch (err2) {
          setError('Image could not be loaded. Use a direct HTTPS image URL or drop/paste a file.');
          setLoading(false);
          return;
        }
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

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    setForm(emptyForm);
    setPreviewUrl('');
    setError('');
    setLoading(false);
  };

  return (
    <section>
      <h2 style={{ color: 'white' }}>Add New Product</h2>

      {showToast && (
        <div className="toast toast-success" role="status" aria-live="polite">
          Product Added
        </div>
      )}

      {error && <p className="error" style={{ color: '#ffb4b4' }}>{error}</p>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="grid-form">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            style={{ border: '2px dashed #ccc', padding: 12, borderRadius: 6 }}
          >
            <label>Feature Image URL / File</label>
            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              onPaste={handlePaste}
              placeholder="Paste image URL, paste an image, or drop a file"
            />
            <small style={{ color: '#aaa', display: 'block', marginTop: 4 }}>
              Tip: Right‑click → “Copy Image Address”, paste an image from clipboard, or drag a file here.
            </small>
            {previewUrl && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: 160,
                    height: 'auto',
                    borderRadius: 6,
                    objectFit: 'cover',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                  onError={(e) => {
                    e.currentTarget.src = '/images/fallback.png'; // fallback image
                  }}
                />
              </div>
            )}
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
