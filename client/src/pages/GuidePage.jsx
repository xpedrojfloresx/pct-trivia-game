import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { CATEGORIES, getTheme } from '../config/categories';

const socket = io(`http://${window.location.hostname}:3001`);

export default function GuidePage() {
  const [screen, setScreen]                     = useState('setup');
  const [guideName, setGuideName]               = useState('');
  const [roomCode, setRoomCode]                 = useState('');
  const [players, setPlayers]                   = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [scores, setScores]                     = useState([]);
  const [answeredIds, setAnsweredIds]           = useState(new Set());
  const [currentQuestion, setCurrentQuestion]   = useState(null);
  const [questionIdx, setQuestionIdx]           = useState(0);
  const [totalQuestions, setTotalQuestions]     = useState(0);
  const [leaderboard, setLeaderboard]           = useState([]);

  useEffect(() => {
    socket.on('room-created', ({ code }) => {
      setRoomCode(code);
      setScreen('waitingRoom');
    });

    socket.on('room-updated', ({ players: p }) => setPlayers(p || []));

    socket.on('game-started', ({ players: p, question, totalQuestions: total }) => {
      setScores(p.map(pl => ({ id: pl.id, name: pl.name, score: 0 })));
      setCurrentQuestion(question);
      setTotalQuestions(total);
      setQuestionIdx(0);
      setAnsweredIds(new Set());
      setScreen('scoreboard');
    });

    socket.on('player-answered', ({ playerId }) => {
      setAnsweredIds(prev => new Set([...prev, playerId]));
    });

    socket.on('question-results', ({ scores: s }) => setScores(s));

    socket.on('next-question', ({ questionIndex, question }) => {
      setQuestionIdx(questionIndex);
      setCurrentQuestion(question);
      setAnsweredIds(new Set());
    });

    socket.on('game-finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
      setScreen('finalLeaderboard');
    });

    socket.on('error', ({ message }) => alert(message));

    return () => {
      socket.off('room-created');
      socket.off('room-updated');
      socket.off('game-started');
      socket.off('player-answered');
      socket.off('question-results');
      socket.off('next-question');
      socket.off('game-finished');
      socket.off('error');
    };
  }, []);

  const handleCreate = () => {
    if (!guideName.trim()) return alert('Ingresa tu nombre');
    socket.emit('create-room', { playerName: guideName });
  };

  const toggleCategory = (key) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleStart = () => {
    if (selectedCategories.size === 0) return alert('Elegí al menos una categoría');
    socket.emit('start-game', { categories: [...selectedCategories] });
  };

  const handleReset = () => {
    setScreen('setup');
    setGuideName('');
    setRoomCode('');
    setPlayers([]);
    setSelectedCategories(new Set());
    setScores([]);
    setAnsweredIds(new Set());
    setCurrentQuestion(null);
    setLeaderboard([]);
  };

  // En el scoreboard el tema refleja la categoría de la pregunta actual
  const theme = getTheme(currentQuestion?.category);

  // ── SETUP ───────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="container home">
        <h1>🎙️ Panel del Guía</h1>
        <input className="input" placeholder="Tu nombre" value={guideName}
          onChange={e => setGuideName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        <button className="btn btn-primary" onClick={handleCreate}>Crear sala</button>
      </div>
    );
  }

  // ── WAITING ROOM ─────────────────────────────────────────
  if (screen === 'waitingRoom') {
    return (
      <div className="container">
        <h2>Sala creada</h2>
        <div className="code-box">{roomCode}</div>
        <p className="hint-text" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          Compartí este código con los jugadores
        </p>

        {/* Selector de categorías (multi) */}
        <p style={{ fontSize: 13, color: '#666', marginBottom: '0.75rem', fontWeight: 600 }}>
          ELEGÍ LAS CATEGORÍAS
          {selectedCategories.size > 0 && (
            <span style={{ color: '#007AFF', marginLeft: 8 }}>
              ({selectedCategories.size} sel. · hasta 12 preguntas)
            </span>
          )}
        </p>
        <div className="cat-grid">
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              className={`cat-btn ${selectedCategories.has(key) ? 'selected' : ''}`}
              style={{ background: cat.headerColor }}
              onClick={() => toggleCategory(key)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-label">{cat.label}</span>
              {selectedCategories.has(key) && (
                <span className="cat-check">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Jugadores */}
        <div className="players-list" style={{ marginTop: '1.5rem' }}>
          <p>Jugadores conectados ({players.length})</p>
          {players.length === 0 && (
            <p style={{ color: '#aaa', fontSize: 14, padding: '8px 0' }}>
              Esperando jugadores...
            </p>
          )}
          {players.map(p => (
            <div key={p.id} className="player-item">
              <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>

        <button
          className="btn btn-success"
          onClick={handleStart}
          disabled={players.length === 0 || selectedCategories.size === 0}
        >
          {selectedCategories.size === 0
            ? 'Elegí al menos una categoría...'
            : players.length === 0
              ? 'Esperando jugadores...'
              : `Iniciar — ${[...selectedCategories].map(k => CATEGORIES[k].icon).join(' ')} (${players.length} jugadores)`}
        </button>
      </div>
    );
  }

  // ── SCOREBOARD EN TIEMPO REAL ────────────────────────────
  if (screen === 'scoreboard') {
    const sorted       = [...scores].sort((a, b) => b.score - a.score);
    const answeredCount = answeredIds.size;
    const total         = scores.length;

    return (
      <div className="guide-scoreboard">
        <div className="scoreboard-header">
          <span className="q-counter" style={{ color: theme.headerColor }}>
            {theme.icon} {theme.label} — Pregunta {questionIdx + 1}/{totalQuestions}
          </span>
          <span className={`answered-pill ${answeredCount === total && total > 0 ? 'full' : ''}`}
            style={answeredCount === total && total > 0 ? { background: theme.headerColor } : {}}>
            {answeredCount}/{total} respondieron
          </span>
        </div>

        {currentQuestion && (
          <div className="current-question-box" style={{ background: theme.headerColor }}>
            {currentQuestion.question}
          </div>
        )}

        <div className="scoreboard-list">
          {sorted.map((player, idx) => (
            <div key={player.id || player.name}
              className={`scoreboard-row${idx === 0 ? ' top' : ''}`}>
              <span className="sb-rank">#{idx + 1}</span>
              <span className="sb-name">{player.name}</span>
              <span className={`sb-check ${answeredIds.has(player.id) ? 'yes' : 'no'}`}>
                {answeredIds.has(player.id) ? '✓' : '·'}
              </span>
              <span className="sb-score" style={{ color: theme.headerColor }}>
                {player.score} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── LEADERBOARD FINAL ────────────────────────────────────
  if (screen === 'finalLeaderboard') {
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <div className="guide-scoreboard">
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {theme.icon} Resultados Finales — {theme.label}
        </h1>
        <div className="scoreboard-list">
          {leaderboard.map((player, idx) => (
            <div key={player.id} className={`scoreboard-row${idx === 0 ? ' top' : ''}`}>
              <span className="sb-rank">{medals[idx] || `#${idx + 1}`}</span>
              <span className="sb-name">{player.name}</span>
              <span className="sb-score" style={{ color: theme.headerColor }}>
                {player.score} pts
              </span>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={handleReset}
          style={{ marginTop: '2rem' }}>
          Nueva partida
        </button>
      </div>
    );
  }

  return null;
}
