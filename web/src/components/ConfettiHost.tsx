import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useConfettiBursts, type ConfettiBurst } from '../utils/confetti';
import './ConfettiHost.css';

export default function ConfettiHost() {
  const bursts = useConfettiBursts();

  if (bursts.length === 0) return null;

  return createPortal(
    <div className="app-confetti-host" aria-hidden="true">
      {bursts.map(b => <Burst key={b.id} burst={b} />)}
    </div>,
    document.body,
  );
}

function Burst({ burst }: { burst: ConfettiBurst }) {
  const { origin, count, spread, durationMs, colors } = burst.options;

  const particles = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angleDeg = -90 + (Math.random() * 2 - 1) * spread;
      const angleRad = (angleDeg * Math.PI) / 180;
      const distance = 70 + Math.random() * 130;
      const dx = Math.cos(angleRad) * distance;
      const dy = Math.sin(angleRad) * distance;
      const gravity = 70 + Math.random() * 80;
      const tilt   = (Math.random() * 2 - 1) * 540;
      const size   = 5 + Math.random() * 5;
      const delay  = Math.random() * 60;
      const dur    = durationMs * (0.7 + Math.random() * 0.3);
      const color  = colors[i % colors.length];
      const shape  = Math.random() > 0.4 ? 'rect' : 'circle';
      list.push({ angleDeg, dx, dy, gravity, tilt, size, delay, dur, color, shape });
    }
    return list;
  }, [count, spread, durationMs, colors]);

  const wrapperStyle: React.CSSProperties = {
    left: origin.x,
    top:  origin.y,
  };

  return (
    <div className="app-confetti-burst" style={wrapperStyle}>
      {particles.map((p, i) => (
        <span
          key={i}
          className={`app-confetti-particle is-${p.shape}`}
          style={{
            background:        p.color,
            width:             `${p.size}px`,
            height:            `${p.shape === 'rect' ? p.size * 1.4 : p.size}px`,
            animationDelay:    `${p.delay}ms`,
            animationDuration: `${p.dur}ms`,
            ['--dx' as never]: `${p.dx}px`,
            ['--dy' as never]: `${p.dy}px`,
            ['--gravity' as never]: `${p.gravity}px`,
            ['--tilt' as never]: `${p.tilt}deg`,
          }}
        />
      ))}
    </div>
  );
}
