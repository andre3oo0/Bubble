import { useId, type CSSProperties } from 'react';
import type { SceneId } from './scenes';

// Full-bleed scenery drawn as one SVG. The viewBox is anchored to the bottom and
// cropped to fill ("slice"), so on a phone only the middle ~420 units show: keep
// something interesting near x=720. Movement comes from the scene-* classes in
// index.css, which calm visuals switches off. Night swaps sun for moon and dims it.

const W = 1440;
const H = 900;

// Deterministic jitter so the trees don't move between renders
const jitter = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// A seamless wave band: repeats every `period` units and is drawn wider than the
// view so it can slide left by one period and loop
function wave(y: number, amp: number, period: number) {
  let d = `M0 ${y}`;
  for (let x = 0; x < W + period * 2; x += period) {
    d += ` Q${x + period / 4} ${y - amp} ${x + period / 2} ${y} T${x + period} ${y}`;
  }
  return `${d} L${W + period * 2} ${H} L0 ${H} Z`;
}

// Rolling hills through a few control heights
function hills(base: number, heights: number[]) {
  const step = W / (heights.length - 1);
  let d = `M0 ${base - heights[0]}`;
  for (let i = 1; i < heights.length; i++) {
    const x0 = (i - 1) * step;
    const x1 = i * step;
    d += ` C${x0 + step / 2} ${base - heights[i - 1]} ${x1 - step / 2} ${base - heights[i]} ${x1} ${base - heights[i]}`;
  }
  return `${d} L${W} ${H} L0 ${H} Z`;
}

function pine(x: number, base: number, h: number) {
  const w = h * 0.42;
  const pts: [number, number][] = [
    [0, -h],
    [0.28, -0.68],
    [0.14, -0.68],
    [0.4, -0.38],
    [0.24, -0.38],
    [0.5, -0.04],
  ];
  const right = pts.map(([px, py], i) => (i === 0 ? `${x} ${base + py}` : `${x + px * w} ${base + py * h}`));
  const left = pts
    .slice(1)
    .reverse()
    .map(([px, py]) => `${x - px * w} ${base + py * h}`);
  return `M${right.join(' L')} L${left.join(' L')} Z`;
}

function pineRow(base: number, minH: number, maxH: number, gap: number, seed: number) {
  let d = '';
  for (let i = 0, x = -20; x < W + 40; i++, x += gap * (0.7 + jitter(i, seed) * 0.6)) {
    d += pine(x, base + jitter(i, seed + 1) * 14, minH + jitter(i, seed + 2) * (maxH - minH));
  }
  return d;
}

function Stars({ count, maxY }: { count: number; maxY: number }) {
  return (
    <g className="scene-night">
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          className={i % 3 === 0 ? 'scene-twinkle' : undefined}
          style={i % 3 === 0 ? { animationDelay: `${-jitter(i, 9) * 6}s` } : undefined}
          cx={jitter(i, 3) * W}
          cy={jitter(i, 4) * maxY}
          r={0.8 + jitter(i, 5) * 1.4}
          fill="#fff"
          opacity={0.5 + jitter(i, 6) * 0.4}
        />
      ))}
    </g>
  );
}

function Cloud({ x, y, scale, opacity, delay }: { x: number; y: number; scale: number; opacity: number; delay: number }) {
  return (
    <g className="scene-drift" style={{ animationDelay: `${delay}s` }}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#fff" opacity={opacity}>
        <ellipse cx="0" cy="0" rx="90" ry="26" />
        <ellipse cx="-40" cy="-14" rx="46" ry="30" />
        <ellipse cx="30" cy="-22" rx="56" ry="36" />
      </g>
    </g>
  );
}

function Bird({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g className="scene-bird" style={{ animationDelay: `${delay}s` }}>
      <path
        d={`M${x - 9} ${y - 3} Q${x - 4} ${y - 7} ${x} ${y} Q${x + 4} ${y - 7} ${x + 9} ${y - 3}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

// Slides left by exactly one period, so the loop has no seam
function Wave({ y, amp, period, seconds, fill }: { y: number; amp: number; period: number; seconds: number; fill: string }) {
  return (
    <path
      className="scene-wave"
      style={{ '--period': `${period}px`, animationDuration: `${seconds}s` } as CSSProperties}
      d={wave(y, amp, period)}
      fill={fill}
    />
  );
}

function Ocean({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#174f86" />
          <stop offset="0.45" stopColor="#1d62a0" />
          <stop offset="0.68" stopColor="#2a74b0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#ffe7b3" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffe7b3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <Stars count={60} maxY={520} />
      <g className="scene-day">
        <circle className="scene-glow" cx="1060" cy="590" r="230" fill={`url(#${id}-glow)`} />
        <circle cx="1060" cy="590" r="44" fill="#ffefc9" opacity="0.9" />
      </g>
      <g className="scene-night">
        <circle cx="1060" cy="190" r="90" fill={`url(#${id}-glow)`} opacity="0.6" />
        <circle cx="1060" cy="190" r="32" fill="#f3f1e6" opacity="0.92" />
      </g>
      <Cloud x={260} y={150} scale={1.1} opacity={0.12} delay={-20} />
      <Cloud x={820} y={95} scale={0.8} opacity={0.1} delay={-70} />
      <Cloud x={1250} y={230} scale={0.9} opacity={0.1} delay={-110} />
      <rect y="600" width={W} height="300" fill="#1a5d96" />
      <Wave y={615} amp={7} period={240} seconds={30} fill="#185790" />
      <Wave y={660} amp={12} period={360} seconds={24} fill="#124b7f" />
      <Wave y={725} amp={18} period={480} seconds={18} fill="#0d3f6d" />
      <Wave y={800} amp={22} period={720} seconds={22} fill="#09335a" />
    </>
  );
}

function Forest({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d4a45" />
          <stop offset="0.5" stopColor="#2e6a58" />
          <stop offset="0.75" stopColor="#3d7a62" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#f6f1c7" stopOpacity="0.22" />
          <stop offset="1" stopColor="#f6f1c7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <Stars count={50} maxY={460} />
      <g className="scene-day">
        <circle className="scene-glow" cx="1040" cy="220" r="220" fill={`url(#${id}-glow)`} />
      </g>
      <g className="scene-night">
        <circle cx="980" cy="200" r="30" fill="#f3f1e6" opacity="0.9" />
      </g>
      <g className="scene-day text-[#173f35]">
        <Bird x={560} y={260} delay={-8} />
        <Bird x={600} y={240} delay={-14} />
      </g>
      <path d={hills(640, [120, 170, 110, 190, 140, 210, 130])} fill="#2c6352" />
      <path d={pineRow(600, 60, 110, 46, 1)} fill="#245646" />
      <path d={hills(720, [90, 60, 120, 70, 110, 50, 95])} fill="#1d4a3c" />
      <g className="scene-sway">
        <path d={pineRow(700, 110, 190, 70, 2)} fill="#163d31" />
      </g>
      <path d={hills(820, [60, 90, 40, 80, 50, 100, 70])} fill="#102f26" />
      <g className="scene-sway scene-sway-slow">
        <path d={pine(90, 900, 520) + pine(250, 920, 380) + pine(1230, 910, 440) + pine(1370, 900, 560)} fill="#0b251e" />
      </g>
    </>
  );
}

function Sunset({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2f4f" />
          <stop offset="0.35" stopColor="#334866" />
          <stop offset="0.6" stopColor="#85565a" />
          <stop offset="0.75" stopColor="#a4594b" />
          <stop offset="0.9" stopColor="#bd6a3c" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#ffb86b" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffb86b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <Stars count={40} maxY={300} />
      <circle className="scene-glow" cx="720" cy="760" r="340" fill={`url(#${id}-glow)`} />
      <circle cx="720" cy="760" r="92" fill="#ffc97a" />
      {[
        [300, 330, 220, -30],
        [980, 280, 300, -90],
        [620, 420, 260, -150],
      ].map(([x, y, w, delay]) => (
        <g key={x} className="scene-drift scene-drift-slow" style={{ animationDelay: `${delay}s` }}>
          <rect x={x} y={y} width={w} height="10" rx="5" fill="#f2a08a" opacity="0.28" />
          <rect x={x + 40} y={y + 16} width={w * 0.6} height="7" rx="3.5" fill="#f2a08a" opacity="0.2" />
        </g>
      ))}
      <g className="text-[#2a1b1a]">
        <Bird x={480} y={480} delay={-5} />
        <Bird x={515} y={500} delay={-12} />
      </g>
      <path d={hills(760, [70, 120, 60, 40, 100, 150, 80])} fill="#5e3b33" />
      <path d={hills(830, [110, 60, 90, 30, 70, 50, 120])} fill="#432a27" />
      <path d={hills(900, [60, 90, 40, 20, 50, 80, 40])} fill="#2a1b1a" />
    </>
  );
}

function Cozy({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b1d1a" />
          <stop offset="0.7" stopColor="#4a3026" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#ff9a4a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-night`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141d38" />
          <stop offset="1" stopColor="#2a3a63" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-wall)`} />

      {/* Window with the night outside */}
      <g transform="translate(140 150)">
        <rect width="260" height="300" rx="10" fill={`url(#${id}-night)`} />
        <circle cx="190" cy="80" r="22" fill="#f3f1e6" opacity="0.9" />
        {[30, 70, 120, 210, 60, 150].map((x, i) => (
          <circle key={i} className="scene-twinkle" style={{ animationDelay: `${-i}s` }} cx={x} cy={40 + ((i * 53) % 180)} r="1.6" fill="#fff" />
        ))}
        <rect width="260" height="300" rx="10" fill="none" stroke="#1d130f" strokeWidth="14" />
        <rect x="123" width="14" height="300" fill="#1d130f" />
        <rect y="143" width="260" height="14" fill="#1d130f" />
        <rect x="-20" y="300" width="300" height="16" rx="4" fill="#1d130f" />
      </g>

      {/* Floor and rug */}
      <rect y="760" width={W} height="140" fill="#21160f" />
      <ellipse cx="760" cy="840" rx="380" ry="46" fill="#5a2a22" opacity="0.7" />

      {/* Fireplace */}
      <circle className="scene-glow" cx="720" cy="700" r="420" fill={`url(#${id}-glow)`} />
      <g transform="translate(570 520)">
        <rect x="-30" y="-24" width="360" height="26" rx="4" fill="#1d130f" />
        <rect width="300" height="240" fill="#2a1a12" />
        <path d="M60 240 V120 Q150 40 240 120 V240 Z" fill="#110a07" />
        <g transform="translate(150 236)">
          <path className="scene-flicker" d="M-50 0 Q-60 -50 -20 -90 Q-22 -50 0 -40 Q10 -100 40 -120 Q30 -60 55 -30 Q60 -10 50 0 Z" fill="#f2832f" />
          <path className="scene-flicker scene-flicker-alt" d="M-30 0 Q-36 -36 -8 -62 Q-4 -30 12 -28 Q18 -70 34 -80 Q30 -40 40 -14 Q40 -4 34 0 Z" fill="#ffc35c" />
          <rect x="-70" y="-6" width="140" height="12" rx="6" fill="#3b2418" />
        </g>
        {/* Candles on the mantel */}
        {[30, 70, 260].map((x, i) => (
          <g key={x} transform={`translate(${x} -24)`}>
            <rect x="-6" y={-(34 - i * 8)} width="12" height={34 - i * 8} rx="2" fill="#efe0c4" />
            <ellipse className="scene-flicker" style={{ animationDelay: `${-i * 0.4}s` }} cx="0" cy={-(42 - i * 8)} rx="4" ry="8" fill="#ffc35c" />
          </g>
        ))}
      </g>

      {/* A plant on the right; phones see the fire in the middle */}
      <g transform="translate(1150 760)" fill="#1a2a1c">
        <path d="M-40 0 h80 l-10 -70 h-60 Z" fill="#3b2418" />
        <g className="scene-sway scene-sway-slow">
          <path d="M0 -70 Q-70 -150 -110 -170 Q-60 -110 -10 -80 Z" />
          <path d="M0 -70 Q10 -190 40 -240 Q30 -150 8 -76 Z" />
          <path d="M0 -70 Q70 -140 120 -150 Q60 -100 10 -74 Z" />
        </g>
      </g>
    </>
  );
}

const DRAWINGS: Record<SceneId, (props: { id: string }) => JSX.Element> = {
  ocean: Ocean,
  forest: Forest,
  sunset: Sunset,
  bedroom: Cozy,
};

interface SceneBackdropProps {
  scene: SceneId;
  // Thumbnails stay still so the picker isn't four animations at once
  still?: boolean;
  className?: string;
}

export default function SceneBackdrop({ scene, still = false, className = '' }: SceneBackdropProps) {
  // Gradient ids must be unique: the picker shows every scene next to the live one
  const id = useId().replace(/:/g, '');
  const Drawing = DRAWINGS[scene];
  return (
    <svg
      className={`scene-art ${still ? 'scene-still' : ''} ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <Drawing id={id} />
    </svg>
  );
}
