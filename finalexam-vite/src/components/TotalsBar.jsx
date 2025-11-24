export default function TotalsBar({ totalValue }) {
  return (
    <div className="totals">
      <strong>Total value of all products:</strong> ${totalValue.toFixed(2)}
    </div>
  );
}
