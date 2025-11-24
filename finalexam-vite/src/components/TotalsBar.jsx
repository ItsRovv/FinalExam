import React from 'react';

const formatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export default function TotalsBar({ totalValue = 0 }) {
  return (
    <div className="totals" style={{ marginTop: 20 }}>
      <strong>Total value of all products:</strong> {formatter.format(Number(totalValue) || 0)}
    </div>
  );
}
