import { useState, useEffect } from 'react';

const MC_COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];
const MC_SHAPES = ['▲', '◆', '●', '■'];

const GO_TEXT    = { es: '¡YA!', en: 'GO!', pt: 'JÁ!' };
const READY_TEXT = { es: '¡Prepárate!', en: 'Get ready!', pt: 'Prepara-te!' };

export default function CountdownScreen({ lang = 'es', onComplete }) {
  const [count,    setCount]    = useState(5);
  const [animKey,  setAnimKey]  = useState(0);

  useEffect(() => {
    if (count < 0) { onComplete(); return; }
    const t = setTimeout(() => {
      setCount(c => c - 1);
      setAnimKey(k => k + 1);
    }, count === 0 ? 800 : 1000);
    return () => clearTimeout(t);
  }, [count]);

  const radius        = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset    = circumference * (1 - count / 5);
  const isGo          = count === 0;

  return (
    <div style={{
      position      : 'fixed',
      inset         : 0,
      background    : '#f5f5f5',
      display       : 'flex',
      flexDirection : 'column',
      alignItems    : 'center',
      justifyContent: 'center',
      zIndex        : 200,
      fontFamily    : 'Poppins, sans-serif',
      overflow      : 'hidden',
    }}>
      <style>{`
        @keyframes cdPop {
          0%   { transform: scale(1.5); opacity: 0; }
          20%  { transform: scale(1);   opacity: 1; }
          80%  { transform: scale(1);   opacity: 1; }
          100% { transform: scale(0.7); opacity: 0; }
        }
        @keyframes cdGo {
          0%   { transform: scale(0.5); opacity: 0; }
          30%  { transform: scale(1.1); opacity: 1; }
          70%  { transform: scale(1);   opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes cdFloat {
          0%,100% { transform: translateY(0px)   rotate(0deg);  }
          50%     { transform: translateY(-12px)  rotate(10deg); }
        }
      `}</style>

      {/* Shapes decorativas — las mismas del juego, flotando */}
      {MC_SHAPES.map((shape, i) => {
        const pos = [
          { top: '11%',  left:  '7%'  },
          { top: '9%',   right: '9%'  },
          { bottom: '17%', left: '5%' },
          { bottom: '15%', right: '7%'},
        ];
        return (
          <div key={i} style={{
            position : 'absolute',
            ...pos[i],
            fontSize : '52px',
            color    : MC_COLORS[i],
            opacity  : 0.18,
            animation: `cdFloat ${2.6 + i * 0.5}s ease-in-out infinite ${i * 0.35}s`,
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            {shape}
          </div>
        );
      })}

      {/* Logo PCT */}
      <img
        src="/logo-pct.png"
        alt="Plaza Cielo Tierra"
        style={{ height: '44px', objectFit: 'contain', marginBottom: '1.75rem', opacity: 0.65 }}
      />

      {/* Texto de preparación */}
      <p style={{
        fontSize     : '13px',
        fontWeight   : 600,
        color        : '#aaa',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        marginBottom : '1.75rem',
        opacity      : isGo ? 0 : 1,
        transition   : 'opacity 0.3s',
      }}>
        {READY_TEXT[lang] ?? '¡Prepárate!'}
      </p>

      {/* Anillo + número */}
      <div style={{
        position       : 'relative',
        width          : '200px',
        height         : '200px',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
      }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute' }}>
          {/* Fondo del anillo */}
          <circle cx="100" cy="100" r={radius}
            fill="none" stroke="#e4e4e4" strokeWidth="10" />
          {/* Progreso */}
          <circle cx="100" cy="100" r={radius}
            fill="none"
            stroke={isGo ? '#34C759' : '#007AFF'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 100 100)"
            style={{
              transition: 'stroke-dashoffset 0.85s cubic-bezier(.4,0,.2,1), stroke 0.3s ease',
            }}
          />
        </svg>

        {/* Número animado */}
        <div key={animKey} style={{
          fontSize     : isGo ? '54px' : '90px',
          fontWeight   : 900,
          color        : isGo ? '#34C759' : '#1a1a1a',
          lineHeight   : 1,
          letterSpacing: '-3px',
          animation    : isGo ? 'cdGo 0.8s ease forwards' : 'cdPop 1s ease forwards',
          userSelect   : 'none',
          position     : 'relative',
          zIndex       : 1,
          transition   : 'color 0.2s',
        }}>
          {isGo ? (GO_TEXT[lang] ?? '¡YA!') : count}
        </div>
      </div>

      {/* Indicadores de progreso */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '2rem' }}>
        {[5, 4, 3, 2, 1].map(n => (
          <div key={n} style={{
            width       : n === count ? '22px' : '8px',
            height      : '8px',
            borderRadius: '999px',
            background  : n === count ? '#007AFF' : '#ddd',
            transition  : 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}
