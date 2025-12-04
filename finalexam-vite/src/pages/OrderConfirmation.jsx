import React from 'react';
import { Link } from 'react-router-dom';

export default function OrderConfirmation() {
  return (
    <section>
      <h2>Order Confirmed</h2>
      <p className="muted">Thank you for your purchase. Your order has been placed successfully.</p>
      <div style={{ marginTop: 12 }}>
        <Link to="/" className="btn btn-secondary">Continue Shopping</Link>
      </div>
    </section>
  );
}