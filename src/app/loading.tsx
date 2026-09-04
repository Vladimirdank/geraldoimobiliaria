export default function Loading() {
  return (
    <main id="main" className="inner-page container" aria-label="Carregando">
      <div className="skeleton skeleton-title" />
      <div className="property-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </main>
  );
}
