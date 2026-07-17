import { Loader2, ArrowDown } from 'lucide-react';
import './PullToRefreshIndicator.css';

interface PullToRefreshIndicatorProps {
  pull: number;
  refreshing: boolean;
}

export default function PullToRefreshIndicator({ pull, refreshing }: PullToRefreshIndicatorProps) {
  const visible = pull > 0 || refreshing;
  if (!visible) return null;

  const triggered = pull >= 1 || refreshing;
  const opacity = Math.min(pull, 1);
  const translateY = Math.min(pull * 50, 56);
  const rotate = pull * 360;

  return (
    <div
      className={`app-ptr${refreshing ? ' is-refreshing' : ''}${triggered ? ' is-triggered' : ''}`}
      style={{
        opacity,
        transform: `translate(-50%, ${translateY}px)`,
      }}
      aria-hidden="true"
    >
      <span className="app-ptr-disc">
        {refreshing
          ? <Loader2 size={14} className="app-ptr-spin" />
          : <ArrowDown size={14} style={{ transform: `rotate(${rotate}deg)` }} className="app-ptr-arrow" />
        }
      </span>
    </div>
  );
}
