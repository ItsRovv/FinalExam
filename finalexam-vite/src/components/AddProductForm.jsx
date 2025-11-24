import { useState } from 'react';

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

export default function AddProductForm({ onAddProduct }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    for (const key of Object.keys(emptyForm)) {
      if (!String(form[key]).trim()) {
        return `${key} is required`;
      }
    }
    if (Number.isNaN(parseFloat(form.price))) return 'price must be a number';
    if (Number.isNaN(parseInt(form.quantity))) return 'quantity must be an integer';
    if (Number.isNaN(parseFloat(form.rating))) return 'rating must be a number';
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const newProduct = {
      id: `p-${Date.now()}`,
      name: form.name,
      image: form.image,
      category: form.category,
      description: form.description,
      specs: form.specs,
      rating: parseFloat(form.rating),
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity, 10),
    };

    onAddProduct(newProduct);
    setForm(emptyForm);
    setError('');
  };

  return (
    <section>
      <h2>Add New Product</h2>
      {error && <p className="error">{error}</p>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="grid-form">
          <div>
            <label>Feature Image URL</label>
            <input name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
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
            <input name="rating" value={form.rating} onChange={handleChange} type="number" step="0.1" min="0" max="5" />
          </div>
          <div>
            <label>Price</label>
            <input name="price" value={form.price} onChange={handleChange} type="number" step="0.01" min="0" />
          </div>
          <div>
            <label>Quantity</label>
            <input name="quantity" value={form.quantity} onChange={handleChange} type="number" step="1" min="0" />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit">Add Product</button>
        </div>
      </form>
    </section>
  );
}
