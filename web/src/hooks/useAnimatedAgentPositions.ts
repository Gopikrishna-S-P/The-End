import { useEffect, useRef, useState } from 'react';
import type { AgentDot } from './useLiveTrackSocket';

const GLIDE_MS = 2000;

interface Segment { from: [number, number]; to: [number, number]; start: number }

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
// Ease-out cubic — same curve FieldOpsPage's useCountUp already uses elsewhere on this page.
function ease(t: number) { return 1 - Math.pow(1 - t, 3); }

/**
 * Tweens each agent's marker position toward its latest ping over GLIDE_MS
 * instead of snapping instantly, so movement between pings reads as
 * continuous on the map rather than a series of jumps.
 */
export function useAnimatedAgentPositions(agents: Map<string, AgentDot>): Map<string, [number, number]> {
  const segmentsRef = useRef<Map<string, Segment>>(new Map());
  const currentRef = useRef<Map<string, [number, number]>>(new Map());
  const rafRef = useRef<number | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const tickFrame = () => {
      const now = performance.now();
      let stillAnimating = false;
      segmentsRef.current.forEach((seg, id) => {
        const p = Math.min((now - seg.start) / GLIDE_MS, 1);
        const eased = ease(p);
        currentRef.current.set(id, [lerp(seg.from[0], seg.to[0], eased), lerp(seg.from[1], seg.to[1], eased)]);
        if (p < 1) stillAnimating = true;
      });
      forceTick(n => n + 1);
      rafRef.current = stillAnimating ? requestAnimationFrame(tickFrame) : null;
    };

    // Start a new glide segment for any agent whose real position moved;
    // agents seen for the first time appear immediately (nothing to glide from).
    agents.forEach((agent, id) => {
      const to: [number, number] = [agent.lat, agent.lng];
      const known = currentRef.current.get(id);
      if (known && known[0] === to[0] && known[1] === to[1]) return;
      segmentsRef.current.set(id, { from: known ?? to, to, start: performance.now() });
      if (!known) currentRef.current.set(id, to);
    });
    // Drop agents that are no longer on the map (offline/ended shift).
    for (const id of [...currentRef.current.keys()]) {
      if (!agents.has(id)) { currentRef.current.delete(id); segmentsRef.current.delete(id); }
    }

    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tickFrame);
  }, [agents]);

  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  return currentRef.current;
}
