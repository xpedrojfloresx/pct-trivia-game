import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, getTheme } from '../config/categories';
import { useLanguage } from '../context/LanguageContext';
import LangSwitcher from '../components/LangSwitcher';
import { translateQuestion } from '../services/translator';

const socket = io(`http://${window.location.hostname}:3001`);

export default function GuidePage() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const [screen, setScreen]                     = useState('setup');
  const [guideName, setGuideName]               = useState('');
  const [roomCode, setRoomCode]                 = useState('');
  const [players, setPlayers]                   = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [scores, setScores]                     = useState([]);
  const [answeredIds, setAnsweredIds]           = useState(new Set());
  const [currentQuestion, setCurrentQuestion]   = useState(null); // cruda (español)
  const [displayQuestion, setDisplayQuestion]   = useState(null); // traducida
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
    if (!guideName.trim()) return alert(t.alertName);
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
    if (selectedCategories.size === 0) return alert(t.alertCategory);
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

  // Muestra la pregunta inmediatamente y traduce en segundo plano
  useEffect(() => {
    if (!currentQuestion) { setDisplayQuestion(null); return; }

    // Transición instantánea: muestra el texto original sin esperar la API
    setDisplayQuestion(currentQuestion);

    if (lang === 'es') return;

    // Traducción en fondo: actualiza el texto cuando llega (sin bloquear)
    let cancelled = false;
    translateQuestion(currentQuestion, lang).then(translated => {
      if (!cancelled) setDisplayQuestion(translated);
    });
    return () => { cancelled = true; };
  }, [currentQuestion, lang]);

  // En el scoreboard el tema refleja la categoría de la pregunta actual
  const theme = getTheme(currentQuestion?.category);

  // ── SETUP ───────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="container home">
        <nav className="page-nav">
          <button className="page-nav-btn" onClick={() => navigate('/')}>
            <div className="page-nav-icon">
              <div className="nav-shapes">
                <span style={{ color: '#e74c3c' }}>▲</span>
                <span style={{ color: '#2980b9' }}>◆</span>
                <span style={{ color: '#f39c12' }}>●</span>
                <span style={{ color: '#27ae60' }}>■</span>
              </div>
            </div>
            <span className="page-nav-label">{t.navJoin}</span>
          </button>
          <button className="page-nav-btn active">
            <div className="page-nav-icon">
              <span className="nav-pencil">✏️</span>
            </div>
            <span className="page-nav-label">{t.navCreate}</span>
          </button>
        </nav>
        <img src="/logo-pct.png" alt="Trivia Game" className="logo" />
        <LangSwitcher />
        <div className="home-form">
          <input className="input" placeholder={t.namePlaceholder} value={guideName}
            onChange={e => setGuideName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          <button className="btn btn-primary" onClick={handleCreate}>{t.createRoomBtn}</button>
        </div>
      </div>
    );
  }

  // ── WAITING ROOM ─────────────────────────────────────────
  if (screen === 'waitingRoom') {
    return (
      <div className="container">
        <h2>{t.roomCreated}</h2>
        <div className="code-box">{roomCode}</div>
        <p className="hint-text" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {t.shareCode}
        </p>

        {/* Selector de categorías (multi) */}
        <p style={{ fontSize: 13, color: '#666', marginBottom: '0.75rem', fontWeight: 600 }}>
          {t.chooseCategories}
          {selectedCategories.size > 0 && (
            <span style={{ color: '#007AFF', marginLeft: 8 }}>
              {t.categoriesSelected(selectedCategories.size)}
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
          <p>{t.connectedPlayers(players.length)}</p>
          {players.length === 0 && (
            <p style={{ color: '#aaa', fontSize: 14, padding: '8px 0' }}>
              {t.waitingPlayers}
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
            ? t.startBtnNoCategories
            : players.length === 0
              ? t.startBtnNoPlayers
              : t.startBtn(
                  [...selectedCategories].map(k => CATEGORIES[k].icon).join(' '),
                  players.length
                )}
        </button>
      </div>
    );
  }

  // ── SCOREBOARD EN TIEMPO REAL ────────────────────────────
  if (screen === 'scoreboard') {
    const sorted        = [...scores].sort((a, b) => b.score - a.score);
    const answeredCount = answeredIds.size;
    const total         = scores.length;

    return (
      <div className="guide-scoreboard">
        <div className="scoreboard-header">
          <span className="q-counter" style={{ color: theme.headerColor }}>
            {t.questionCounter(theme.icon, theme.label, questionIdx + 1, totalQuestions)}
          </span>
          <span className={`answered-pill ${answeredCount === total && total > 0 ? 'full' : ''}`}
            style={answeredCount === total && total > 0 ? { background: theme.headerColor } : {}}>
            {t.answeredLabel(answeredCount, total)}
          </span>
        </div>

        {displayQuestion && (
          <div className="current-question-box" style={{ background: theme.headerColor }}>
            {displayQuestion.question}
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
          {theme.icon} {t.finalResultsTitle} — {theme.label}
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
          {t.newGame}
        </button>
      </div>
    );
  }

  return null;
}
