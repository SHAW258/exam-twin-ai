import React, { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ─── GLSL Shaders ─────────────────────────────────────────────────────────────

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec3 bgDeep   = vec3(0.04, 0.07, 0.14);
    vec3 bgCenter = vec3(0.07, 0.12, 0.24);
    float centerR = length(p);
    vec3 col = mix(bgCenter, bgDeep, smoothstep(0.0, 1.6, centerR));

    vec2 mPos = (u_mouse.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float mDist = length(p - mPos);
    p += normalize(p - mPos + 0.001) * exp(-mDist * 3.0) * 0.05;

    float n1 = noise(p * 2.0 + vec2(u_time * 0.08, -u_time * 0.05));
    float n2 = noise(p * 3.5 - vec2(-u_time * 0.06, u_time * 0.1));
    float flow = smoothstep(0.3, 0.75, n1 * n2);

    vec3 royalBlue = vec3(0.145, 0.388, 0.921);
    vec3 teal      = vec3(0.078, 0.721, 0.651);
    vec3 indigo    = vec3(0.263, 0.220, 0.792);

    col += mix(royalBlue, teal, n2) * flow * 0.35;

    vec2 gridP = p * 4.0;
    vec2 fGrid = abs(fract(gridP) - 0.5);
    float gridLine = smoothstep(0.485, 0.498, max(fGrid.x, fGrid.y));
    col += indigo * gridLine * 0.12 * (1.0 - smoothstep(0.2, 1.8, centerR));

    for (int i = 0; i < 32; i++) {
        float fi   = float(i);
        float seed = fi * 19.371;
        float speed = 0.08 + 0.12 * fract(seed * 2.13);
        float t = u_time * speed + seed;
        vec2 partPos = vec2(
            sin(t * 0.7 + seed) * 1.7 + cos(t * 0.25) * 0.3,
            cos(t * 0.5 + seed * 1.5) * 1.1 + sin(t * 0.3) * 0.2
        );
        float d = length(p - partPos);
        float pGlow = 0.0022 / (d + 0.0015);
        pGlow = clamp(pGlow, 0.0, 1.2);
        vec3 pColor = (mod(fi, 2.0) == 0.0) ? teal : royalBlue;
        if (mod(fi, 3.0) == 0.0) pColor = indigo;
        col += pColor * pow(pGlow, 1.3) * 0.65;

        float dToKnot = length(partPos);
        if (dToKnot < 0.8 && mod(fi, 4.0) == 0.0) {
            vec2 pa = p;
            vec2 ba = partPos;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            float lineD = length(pa - ba * h);
            float lineIntensity = (1.0 - dToKnot / 0.8) * 0.0006 / (lineD + 0.002);
            col += mix(teal, royalBlue, 0.5) * clamp(lineIntensity, 0.0, 0.45);
        }
    }

    float coreGlow = exp(-centerR * 2.2);
    col += royalBlue * coreGlow * 0.45;
    col += teal * exp(-centerR * 3.8) * 0.35;

    float vig = smoothstep(1.9, 0.6, length(p));
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}`

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebGLState {
  gl: WebGLRenderingContext
  prog: WebGLProgram
  buf: WebGLBuffer
  uTime: WebGLUniformLocation | null
  uRes: WebGLUniformLocation | null
  uMouse: WebGLUniformLocation | null
  rafId: number
  resizeObserver: ResizeObserver | null
  mousemoveHandler: (e: MouseEvent) => void
  mouse: { x: number; y: number }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<WebGLState | null>(null)

  // ── WebGL setup ─────────────────────────────────────────────────────────────
  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const syncSize = () => {
      const w = canvas.clientWidth || 1280
      const h = canvas.clientHeight || 720
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const gl = (canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return

    const compileShader = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, VERTEX_SHADER))
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )
    const posLoc = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime  = gl.getUniformLocation(prog, 'u_time')
    const uRes   = gl.getUniformLocation(prog, 'u_resolution')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')

    const mouse = {
      x: canvas.width / 2,
      y: canvas.height / 2,
    }

    const mousemoveHandler = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width
        const ny = 1.0 - (event.clientY - rect.top) / rect.height
        mouse.x = nx * canvas.width
        mouse.y = ny * canvas.height
      }
    }
    window.addEventListener('mousemove', mousemoveHandler)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize)
      resizeObserver.observe(canvas)
    }
    syncSize()

    let rafId = 0
    const render = (t: number) => {
      if (typeof ResizeObserver === 'undefined') syncSize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (uTime)  gl.uniform1f(uTime, t * 0.001)
      if (uRes)   gl.uniform2f(uRes, canvas.width, canvas.height)
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      rafId = requestAnimationFrame(render)
    }
    rafId = requestAnimationFrame(render)

    stateRef.current = {
      gl,
      prog,
      buf,
      uTime,
      uRes,
      uMouse,
      rafId,
      resizeObserver,
      mousemoveHandler,
      mouse,
    }
  }, [])

  useEffect(() => {
    initWebGL()
    return () => {
      const s = stateRef.current
      if (!s) return
      cancelAnimationFrame(s.rafId)
      window.removeEventListener('mousemove', s.mousemoveHandler)
      s.resizeObserver?.disconnect()
      s.gl.deleteBuffer(s.buf)
      s.gl.deleteProgram(s.prog)
      stateRef.current = null
    }
  }, [initWebGL])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleEnterWorkspace = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login')
  }

  const handleExploreDocs = () => {
    navigate('/help')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen bg-[#070b16] text-slate-100 antialiased overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Layer 0 – WebGL background canvas */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
          width={1280}
          height={1024}
        />
      </div>

      {/* Layer 1 – ambient radial vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(7,11,22,0.30) 60%, rgba(7,11,22,0.80) 100%)',
        }}
      />

      {/* Layer 2 – page content */}
      <main className="relative z-10 w-full min-h-screen flex flex-col justify-between items-center px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">

        {/* ── Center Stage ── */}
        <div className="w-full max-w-3xl flex flex-col items-center justify-center my-auto py-6 sm:py-8">

          {/* Animated Brand Knot Emblem */}
          <div className="relative w-full flex items-center justify-center mb-2">
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto" style={{ filter: 'drop-shadow(0 12px 36px rgba(37,99,235,0.4))' }}>
              <svg height="100%" viewBox="0 0 600 600" width="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="knotGrad1" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8">
                      <animate attributeName="stop-color" dur="7s" repeatCount="indefinite" values="#38BDF8;#14B8A6;#6366F1;#38BDF8" />
                    </stop>
                    <stop offset="50%" stopColor="#2563EB">
                      <animate attributeName="stop-color" dur="7s" repeatCount="indefinite" values="#2563EB;#38BDF8;#14B8A6;#2563EB" />
                    </stop>
                    <stop offset="100%" stopColor="#14B8A6">
                      <animate attributeName="stop-color" dur="7s" repeatCount="indefinite" values="#14B8A6;#6366F1;#2563EB;#14B8A6" />
                    </stop>
                  </linearGradient>
                  <linearGradient id="tealCyanFlow" x1="0%" x2="100%" y1="100%" y2="0%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#14B8A6" />
                  </linearGradient>
                  <linearGradient id="navyCoreGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#1E293B" />
                    <stop offset="100%" stopColor="#0F172A" />
                  </linearGradient>
                  <filter height="200%" id="intenseNeonGlow" width="200%" x="-50%" y="-50%">
                    <feGaussianBlur result="blur1" stdDeviation="6" />
                    <feGaussianBlur result="blur2" stdDeviation="18" />
                    <feGaussianBlur result="blur3" stdDeviation="36" />
                    <feMerge>
                      <feMergeNode in="blur3" />
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter height="160%" id="subtleFloatShadow" width="160%" x="-30%" y="-30%">
                    <feDropShadow dx="0" dy="20" floodColor="#000000" floodOpacity="0.55" stdDeviation="24" />
                  </filter>
                  <style>{`
                    @keyframes orbitClockwise { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                    @keyframes orbitCounter   { 0%{transform:rotate(360deg)} 100%{transform:rotate(0deg)} }
                    @keyframes pathElectricFlow { 0%{stroke-dashoffset:1200} 100%{stroke-dashoffset:0} }
                    @keyframes pulseNode {
                      0%,100%{transform:scale(1); filter:drop-shadow(0 0 6px #38BDF8)}
                      50%    {transform:scale(1.35); filter:drop-shadow(0 0 16px #14B8A6)}
                    }
                    @keyframes radarWave {
                      0%  { r:110px; opacity:0.8; stroke-width:3px }
                      100%{ r:270px; opacity:0;   stroke-width:0.5px }
                    }
                    @keyframes knotFloat {
                      0%,100%{transform:translateY(0px) rotate(0deg)}
                      50%    {transform:translateY(-8px) rotate(1deg)}
                    }
                    .orbit-ring-outer  { transform-origin:300px 300px; animation:orbitClockwise 32s linear infinite }
                    .orbit-ring-middle { transform-origin:300px 300px; animation:orbitCounter   22s linear infinite }
                    .orbit-ring-inner  { transform-origin:300px 300px; animation:orbitClockwise 14s linear infinite }
                    .radar-pulse-1 { animation:radarWave 4.5s cubic-bezier(0.1,0.4,0.2,1) infinite }
                    .radar-pulse-2 { animation:radarWave 4.5s cubic-bezier(0.1,0.4,0.2,1) infinite 1.5s }
                    .radar-pulse-3 { animation:radarWave 4.5s cubic-bezier(0.1,0.4,0.2,1) infinite 3.0s }
                    .floating-knot-body { transform-origin:300px 300px; animation:knotFloat 6s ease-in-out infinite }
                    .flowing-loop { stroke-dasharray:600; animation:pathElectricFlow 9s cubic-bezier(0.4,0,0.2,1) infinite }
                    .node-p1 { transform-origin:275px 165px; animation:pulseNode 3s ease-in-out infinite }
                    .node-p2 { transform-origin:415px 175px; animation:pulseNode 3s ease-in-out infinite 0.75s }
                    .node-p3 { transform-origin:425px 425px; animation:pulseNode 3s ease-in-out infinite 1.5s }
                    .node-p4 { transform-origin:275px 435px; animation:pulseNode 3s ease-in-out infinite 2.25s }
                    .center-nexus { transform-origin:300px 300px; animation:pulseNode 2.5s ease-in-out infinite 1s }
                  `}</style>
                </defs>

                {/* Radar pulses */}
                <g fill="none" stroke="#2563EB">
                  <circle className="radar-pulse-1" cx="300" cy="300" stroke="#38BDF8" />
                  <circle className="radar-pulse-2" cx="300" cy="300" stroke="#14B8A6" />
                  <circle className="radar-pulse-3" cx="300" cy="300" stroke="#6366F1" />
                </g>

                {/* Orbital rings */}
                <g fill="none">
                  <g className="orbit-ring-outer">
                    <circle cx="300" cy="300" r="255" stroke="#38BDF8" strokeDasharray="6 14" strokeOpacity="0.22" strokeWidth="1.5" />
                    <circle cx="300" cy="45"  fill="#38BDF8" filter="url(#intenseNeonGlow)" r="5" />
                    <circle cx="555" cy="300" fill="#14B8A6" r="4" />
                    <circle cx="300" cy="555" fill="#6366F1" r="5" />
                    <circle cx="45"  cy="300" fill="#38BDF8" r="4" />
                  </g>
                  <g className="orbit-ring-middle">
                    <circle cx="300" cy="300" r="215" stroke="#14B8A6" strokeDasharray="16 20 4 20" strokeOpacity="0.3" strokeWidth="2" />
                    <polygon fill="#14B8A6" points="300,85 304,95 296,95" />
                    <polygon fill="#38BDF8" points="515,300 505,304 505,296" />
                    <polygon fill="#14B8A6" points="300,515 296,505 304,505" />
                    <polygon fill="#6366F1" points="85,300 95,296 95,304" />
                  </g>
                  <g className="orbit-ring-inner">
                    <circle cx="300" cy="300" r="170" stroke="#60A5FA" strokeDasharray="2 10" strokeOpacity="0.35" strokeWidth="1.5" />
                    <circle cx="420" cy="180" fill="#38BDF8" r="4.5" />
                    <circle cx="180" cy="420" fill="#14B8A6" r="4.5" />
                  </g>
                </g>

                {/* Core ambient glow */}
                <circle cx="300" cy="300" fill="#2563EB" filter="url(#intenseNeonGlow)" opacity="0.16" r="130" />

                {/* Knot geometry */}
                <g className="floating-knot-body" filter="url(#subtleFloatShadow)">
                  {/* Ghost trace */}
                  <path d="M 245 170 C 170 170, 130 220, 130 300 C 130 380, 175 430, 255 430 C 325 430, 360 380, 360 345 C 360 305, 320 275, 270 275 C 205 275, 180 335, 225 380"
                    fill="none" stroke="#0F172A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="46" />
                  {/* Loop 1 */}
                  <path className="flowing-loop"
                    d="M 245 170 C 170 170, 130 220, 130 300 C 130 380, 175 430, 255 430 C 325 430, 360 380, 360 345 C 360 305, 320 275, 270 275 C 205 275, 180 335, 225 380"
                    fill="none" filter="url(#intenseNeonGlow)" stroke="url(#knotGrad1)"
                    strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
                  {/* Stem */}
                  <path d="M 275 165 L 275 435" fill="none" stroke="url(#navyCoreGrad)" strokeLinecap="round" strokeWidth="40" />
                  {/* Electric stem core */}
                  <line stroke="#38BDF8" strokeDasharray="40 90" strokeLinecap="round" strokeWidth="7" x1="275" x2="275" y1="175" y2="425">
                    <animate attributeName="stroke-dashoffset" dur="2.4s" repeatCount="indefinite" values="0;-390" />
                  </line>
                  {/* Upper diagonal */}
                  <path d="M 275 300 L 415 175" fill="none" stroke="url(#tealCyanFlow)"
                    strokeDasharray="210" strokeDashoffset="0" strokeLinecap="round" strokeWidth="38">
                    <animate attributeName="stroke-dashoffset" dur="4.2s" repeatCount="indefinite" values="420;0" />
                  </path>
                  {/* Lower diagonal */}
                  <path d="M 310 270 L 425 425" fill="none" stroke="url(#knotGrad1)"
                    strokeDasharray="220" strokeDashoffset="0" strokeLinecap="round" strokeWidth="38">
                    <animate attributeName="stroke-dashoffset" dur="5s" repeatCount="indefinite" values="0;440" />
                  </path>
                  {/* Nodes */}
                  <g className="node-p1">
                    <circle cx="275" cy="165" fill="#2563EB" filter="url(#intenseNeonGlow)" r="16" />
                    <circle cx="275" cy="165" fill="#1D4ED8" r="14" />
                    <circle cx="275" cy="165" fill="#FFFFFF" r="6" />
                  </g>
                  <g className="node-p2">
                    <circle cx="415" cy="175" fill="#14B8A6" filter="url(#intenseNeonGlow)" r="17" />
                    <circle cx="415" cy="175" fill="#0D9488" r="15" />
                    <circle cx="415" cy="175" fill="#F0FDFA" r="6" />
                  </g>
                  <g className="node-p3">
                    <circle cx="425" cy="425" fill="#3B82F6" filter="url(#intenseNeonGlow)" r="16" />
                    <circle cx="425" cy="425" fill="#2563EB" r="14" />
                    <circle cx="425" cy="425" fill="#DBEAFE" r="6" />
                  </g>
                  <g className="node-p4">
                    <circle cx="275" cy="435" fill="#0F172A" r="16" stroke="#38BDF8" strokeWidth="3" />
                    <circle cx="275" cy="435" fill="#38BDF8" r="6" />
                  </g>
                  {/* Nexus core */}
                  <g className="center-nexus">
                    <circle cx="300" cy="300" fill="#FFFFFF" filter="url(#intenseNeonGlow)" opacity="0.9" r="28" />
                    <circle cx="300" cy="300" fill="#0F172A" r="22" stroke="#38BDF8" strokeWidth="5" />
                    <circle cx="300" cy="300" fill="#14B8A6" r="10">
                      <animate attributeName="fill" dur="3s" repeatCount="indefinite" values="#14B8A6;#38BDF8;#6366F1;#14B8A6" />
                    </circle>
                    <circle cx="300" cy="300" fill="#FFFFFF" r="4" />
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* Hero Typography */}
          <div className="text-center space-y-2.5 px-2 mb-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              <span className="text-white">Code</span>
              <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-teal-300 bg-clip-text text-transparent">
                Knot
              </span>
            </h1>
            <p className="text-slate-200 text-base sm:text-lg md:text-xl font-medium tracking-tight">
              AI-Powered Examination &amp; Performance Intelligence
            </p>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              Personalized syllabus grounding, cognitive error diagnosis, and adaptive retrieval
              acceleration.{' '}
              <span className="text-slate-500 font-normal">Formerly ExamTwin.</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6">
            <button
              onClick={handleEnterWorkspace}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 group ring-2 ring-blue-400/40 hover:ring-teal-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 cursor-pointer"
              style={{ boxShadow: '0 0 24px rgba(37,99,235,0.5)' }}
              aria-label="Enter Workspace"
            >
              <span>Enter Workspace</span>
              <span
                className="text-lg transition-transform duration-200 group-hover:translate-x-1 select-none"
                aria-hidden="true"
              >
                →
              </span>
            </button>

            <button
              onClick={handleExploreDocs}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/70 text-slate-300 hover:text-white font-medium text-sm sm:text-base border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer"
              aria-label="Explore System Architecture and Docs"
            >
              <span className="text-lg text-slate-400 select-none" aria-hidden="true">⌥</span>
              <span>Explore System Architecture &amp; Docs</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full flex flex-col sm:flex-row items-center text-xs text-slate-400 gap-2.5 pt-4 border-t border-white/5 justify-center">
          <div className="text-center">
            © 2025 CodeKnot Systems Inc. All rights reserved.{' '}
            <span className="text-slate-500">Formerly ExamTwin.</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
