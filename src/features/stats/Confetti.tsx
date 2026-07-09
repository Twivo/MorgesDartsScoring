import { useMemo } from 'react';

/** Lightweight DOM confetti — no dependencies. */
export function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const colors = ['#e10600', '#ffffff', '#f59e0b', '#16a34a', '#2563eb'];
        return {
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 2.5 + Math.random() * 2,
          color: colors[i % colors.length],
          size: 6 + Math.random() * 8,
          rotate: Math.random() * 360,
        };
      }),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
