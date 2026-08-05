export function SectionHeader({ icon, title, sub, tone }: { icon: React.ReactNode; title: string; sub: string; tone?: 'danger' }) {
  return (
    <header className="ps-section-head">
      <div className={`ps-section-icon${tone === 'danger' ? ' is-danger' : ''}`}>
        {icon}
      </div>
      <div>
        <h2 className={`ps-section-title${tone === 'danger' ? ' is-danger' : ''}`}>{title}</h2>
        <span className="ps-section-sub">{sub}</span>
      </div>
    </header>
  );
}
