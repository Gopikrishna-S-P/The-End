import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './RouteProgressBar.css';

export default function RouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);
  const timers = useRef<number[]>([]);
  const first  = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }

    timers.current.forEach(clearTimeout);
    timers.current = [];

    setVisible(true);
    setProgress(18);

    timers.current.push(window.setTimeout(() => setProgress(48), 90));
    timers.current.push(window.setTimeout(() => setProgress(74), 240));
    timers.current.push(window.setTimeout(() => setProgress(92), 500));
    timers.current.push(window.setTimeout(() => setProgress(100), 720));
    timers.current.push(window.setTimeout(() => setVisible(false), 920));
    timers.current.push(window.setTimeout(() => setProgress(0), 1180));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [location.pathname]);

  return (
    <div
      className={`app-route-progress${visible ? ' is-visible' : ''}`}
      role="progressbar"
      aria-hidden={!visible}
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
    >
      <div
        className="app-route-progress-bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
