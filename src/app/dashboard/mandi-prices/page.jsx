export default function MarketPrices() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="card-agri max-w-lg w-full p-8">
        <div className="text-5xl mb-4">🚜</div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
          Smart Advisory Dashboard
        </h1>
        <p className="text-lg font-semibold text-emerald-700 mb-4">
          Coming Soon
        </p>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          Your portal is successfully authenticated. Crop Advisory, Mandi Prices, and Disease Detection modules will render here once connected by your teammates.
        </p>
      </div>
    </div>
  );
}