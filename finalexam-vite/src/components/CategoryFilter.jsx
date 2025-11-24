import React from 'react';

export default function CategoryFilter({ categories = [], value = 'All', onChange = () => {} }) {
  // Ensure "All" is always present and categories are unique
  const opts = Array.isArray(categories) && categories.length
    ? ['All', ...Array.from(new Set(categories.filter(c => c && c !== 'All')))]
    : ['All'];

  return (
    <div className="filter">
      <label htmlFor="category" style={{ color: 'white' }}>Filter by category:</label>
      <select
        id="category"
        value={value ?? 'All'}
        onChange={(e) => onChange(e.target.value)}
      >
        {opts.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
