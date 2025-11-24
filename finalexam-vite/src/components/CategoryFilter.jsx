export default function CategoryFilter({ categories, value, onChange }) {
  return (
    <div className="filter">
      <label htmlFor="category">Filter by category:</label>
      <select
        id="category"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
