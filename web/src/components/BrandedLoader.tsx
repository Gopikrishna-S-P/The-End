import { Logo } from './Logo';
import './BrandedLoader.css';

export interface BrandedLoaderProps {
  /** Short status line under the spinner. Defaults to "Loading". */
  label?: string;
  /** Layout mode. Default is "inline". */
  variant?: 'fullbleed' | 'inline';
  /** Override the inline-variant height (CSS length). Default 320px. */
  minHeight?: number | string;
}

export default function BrandedLoader({
  label = 'Loading',
  variant = 'inline',
  minHeight = 320,
}: BrandedLoaderProps) {
  const cls = `branded-loader branded-loader-${variant}`;
  const style =
    variant === 'inline'
      ? { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }
      : undefined;

  return (
    <div className={cls} role="status" aria-live="polite" aria-label={label} style={style}>
      <div className="branded-loader-glow" aria-hidden="true" />
      <div className="branded-loader-grid" aria-hidden="true" />
      <div className="branded-loader-content">
        <div className="branded-loader-logo">
          <Logo height={44} />
        </div>
        <div className="branded-loader-spinner" aria-hidden="true">
          <span className="branded-loader-spinner-track" />
          <span className="branded-loader-spinner-sweep" />
        </div>
        <p className="branded-loader-text">{label}</p>
      </div>
    </div>
  );
}
