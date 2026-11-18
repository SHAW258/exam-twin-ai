/**
 * CodeKnotIcon — Reusable animated SVG brand icon.
 *
 * Usage:
 *   <CodeKnotIcon className="w-9 h-9" />          // animated (default)
 *   <CodeKnotIcon className="w-5 h-5" static />    // static (no animation)
 */
import React from 'react'

interface CodeKnotIconProps {
  /** Tailwind / custom class for sizing. Defaults to "w-9 h-9". */
  className?: string
  /** Disable SVG animations (useful inside dense UIs). */
  static?: boolean
}

export const CodeKnotIcon: React.FC<CodeKnotIconProps> = ({
  className = 'w-9 h-9',
  static: isStatic = false,
}) => (
  <svg
    className={className}
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="CodeKnot logo"
    role="img"
  >
    <defs>
      {/* Gradients */}
      <linearGradient id="ck-blueTealGrad" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="#2563EB">
          {!isStatic && (
            <animate
              attributeName="stop-color"
              dur="6s"
              repeatCount="indefinite"
              values="#2563EB;#4338CA;#14B8A6;#2563EB"
            />
          )}
        </stop>
        <stop offset="50%" stopColor="#3B82F6">
          {!isStatic && (
            <animate
              attributeName="stop-color"
              dur="6s"
              repeatCount="indefinite"
              values="#3B82F6;#2563EB;#06B6D4;#3B82F6"
            />
          )}
        </stop>
        <stop offset="100%" stopColor="#14B8A6">
          {!isStatic && (
            <animate
              attributeName="stop-color"
              dur="6s"
              repeatCount="indefinite"
              values="#14B8A6;#06B6D4;#4338CA;#14B8A6"
            />
          )}
        </stop>
      </linearGradient>

      <linearGradient id="ck-tealCyanGrad" x1="0%" x2="100%" y1="100%" y2="0%">
        <stop offset="0%" stopColor="#14B8A6" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>

      <linearGradient id="ck-navyStemGrad" x1="0%" x2="0%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="#14213D" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </linearGradient>

      {/* Filters */}
      <filter id="ck-neonGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur result="blur1" stdDeviation="8" />
        <feGaussianBlur result="blur2" stdDeviation="16" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="ck-cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="16" floodColor="#14213D" floodOpacity="0.12" stdDeviation="20" />
      </filter>

      {/* Keyframe animations scoped via style tag */}
      {!isStatic && (
        <style>{`
          @keyframes ck-rotateSlow   { 0%{transform:rotate(0deg)}   100%{transform:rotate(360deg)} }
          @keyframes ck-pulseRing    { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(1.08);opacity:0.7} }
          @keyframes ck-knotDash     { 0%{stroke-dashoffset:800} 50%{stroke-dashoffset:0} 100%{stroke-dashoffset:-800} }
          @keyframes ck-nodeBlink    { 0%,100%{transform:scale(1);opacity:0.85} 50%{transform:scale(1.35);opacity:1;filter:drop-shadow(0 0 10px #14B8A6)} }

          .ck-orbit-ring-1   { transform-origin:256px 256px; animation:ck-rotateSlow 24s linear infinite }
          .ck-orbit-ring-rev { transform-origin:256px 256px; animation:ck-rotateSlow 18s linear infinite reverse }
          .ck-pulse-layer    { transform-origin:256px 256px; animation:ck-pulseRing  4s ease-in-out infinite }
          .ck-knot-path      { stroke-dasharray:400; animation:ck-knotDash 8s cubic-bezier(0.4,0,0.2,1) infinite }

          .ck-node-1 { transform-origin:240px 135px; animation:ck-nodeBlink 3s ease-in-out infinite }
          .ck-node-2 { transform-origin:365px 145px; animation:ck-nodeBlink 3s ease-in-out infinite 0.7s }
          .ck-node-3 { transform-origin:375px 365px; animation:ck-nodeBlink 3s ease-in-out infinite 1.4s }
          .ck-node-4 { transform-origin:240px 375px; animation:ck-nodeBlink 3s ease-in-out infinite 2.1s }
          .ck-core   { transform-origin:256px 256px; animation:ck-nodeBlink 2.5s ease-in-out infinite 1s }
        `}</style>
      )}
    </defs>

    {/* White rounded-square background */}
    <rect fill="#FFFFFF" height="512" rx="128" width="512" />
    <rect fill="none" height="512" rx="128" stroke="#E2E8F0" strokeWidth="2.5" width="512" />

    {/* Concentric pulse rings */}
    <g className={isStatic ? undefined : 'ck-pulse-layer'}>
      <circle cx="256" cy="256" fill="none" r="190" stroke="#2563EB" strokeDasharray="8 8" strokeOpacity="0.2" strokeWidth="1.5" />
      <circle cx="256" cy="256" fill="none" r="150" stroke="#14B8A6" strokeDasharray="14 10" strokeOpacity="0.3" strokeWidth="2" />
    </g>

    {/* Orbiting dot rings */}
    <g className={isStatic ? undefined : 'ck-orbit-ring-1'}>
      <circle cx="256" cy="76"  fill="#2563EB" opacity="0.75" r="5" />
      <circle cx="436" cy="256" fill="#14B8A6" opacity="0.6"  r="4" />
      <circle cx="256" cy="436" fill="#4338CA" opacity="0.7"  r="6" />
      <circle cx="76"  cy="256" fill="#06B6D4" opacity="0.8"  r="4.5" />
    </g>
    <g className={isStatic ? undefined : 'ck-orbit-ring-rev'}>
      <circle cx="360" cy="152" fill="#14B8A6" opacity="0.5" r="3.5" />
      <circle cx="152" cy="360" fill="#2563EB" opacity="0.5" r="4" />
    </g>

    {/* Central ambient glow */}
    <circle cx="256" cy="256" fill="#2563EB" filter="url(#ck-neonGlow)" opacity="0.06" r="120" />

    {/* Knot geometry */}
    <g filter="url(#ck-cardShadow)">
      {/* Ghost trace */}
      <path
        d="M 210 140 C 145 140, 110 185, 110 256 C 110 327, 150 372, 220 372 C 280 372, 310 330, 310 295 C 310 260, 275 235, 230 235 C 175 235, 155 285, 195 325"
        fill="none" opacity="0.15" stroke="#2563EB" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40"
      />
      {/* Animated C-loop */}
      <path
        className={isStatic ? undefined : 'ck-knot-path'}
        d="M 210 140 C 145 140, 110 185, 110 256 C 110 327, 150 372, 220 372 C 280 372, 310 330, 310 295 C 310 260, 275 235, 230 235 C 175 235, 155 285, 195 325"
        fill="none" stroke="url(#ck-blueTealGrad)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="36"
      />
      {/* K vertical stem */}
      <path d="M 240 135 L 240 375" fill="none" stroke="url(#ck-navyStemGrad)" strokeLinecap="round" strokeWidth="34" />
      {/* K upper diagonal */}
      <path
        d="M 240 256 L 365 145"
        fill="none" stroke="url(#ck-tealCyanGrad)" strokeDasharray="180" strokeDashoffset="0" strokeLinecap="round" strokeWidth="34"
      >
        {!isStatic && <animate attributeName="stroke-dashoffset" dur="4s" repeatCount="indefinite" values="360;0" />}
      </path>
      {/* K lower diagonal */}
      <path
        d="M 270 230 L 375 365"
        fill="none" stroke="url(#ck-blueTealGrad)" strokeDasharray="190" strokeDashoffset="0" strokeLinecap="round" strokeWidth="34"
      >
        {!isStatic && <animate attributeName="stroke-dashoffset" dur="5s" repeatCount="indefinite" values="0;380" />}
      </path>
      {/* Neural energy pulse on stem */}
      <line stroke="#38BDF8" strokeDasharray="30 70" strokeLinecap="round" strokeWidth="6" x1="240" x2="240" y1="140" y2="370">
        {!isStatic && <animate attributeName="stroke-dashoffset" dur="2.5s" repeatCount="indefinite" values="0;-200" />}
      </line>

      {/* Nodes */}
      <g className={isStatic ? undefined : 'ck-node-1'}>
        <circle cx="240" cy="135" fill="#2563EB" r="13" />
        <circle cx="240" cy="135" fill="#FFFFFF" r="6" />
      </g>
      <g className={isStatic ? undefined : 'ck-node-2'}>
        <circle cx="365" cy="145" fill="#14B8A6" r="14" />
        <circle cx="365" cy="145" fill="#FFFFFF" r="7" />
      </g>
      <g className={isStatic ? undefined : 'ck-node-3'}>
        <circle cx="375" cy="365" fill="#2563EB" r="13" />
        <circle cx="375" cy="365" fill="#93C5FD" r="6" />
      </g>
      <g className={isStatic ? undefined : 'ck-node-4'}>
        <circle cx="240" cy="375" fill="#14213D" r="13" />
        <circle cx="240" cy="375" fill="#38BDF8" r="6" />
      </g>

      {/* Living nexus core */}
      <g className={isStatic ? undefined : 'ck-core'}>
        <circle cx="256" cy="256" fill="#FFFFFF" filter="url(#ck-neonGlow)" r="24" />
        <circle cx="256" cy="256" fill="#FFFFFF" r="20" stroke="#2563EB" strokeWidth="7" />
        <circle cx="256" cy="256" fill="#14B8A6" r="9">
          {!isStatic && (
            <animate attributeName="fill" dur="3s" repeatCount="indefinite" values="#14B8A6;#2563EB;#38BDF8;#14B8A6" />
          )}
        </circle>
        <circle cx="256" cy="256" fill="#FFFFFF" r="4" />
      </g>
    </g>
  </svg>
)
