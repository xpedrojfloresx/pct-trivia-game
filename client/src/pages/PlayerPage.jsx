import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getTheme } from '../config/categories';

const socket = io(`http://${window.location.hostname}:3001`);

const TOTAL_TICKS = 200; // 20 segundos en décimas

const MC_COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];
const MC_SHAPES = ['▲', '◆', '●', '■'];

export default function PlayerPage() {
  const [screen, setScreen]                   = useState('home');
  const [playerName, setPlayerName]           = useState('');
  const [roomCode, setRoomCode]               = useState('');
  const [joinedCode, setJoinedCode]           = useState('');
  const [players, setPlayers]                 = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [totalQuestions, setTotalQuestions]   = useState(0);
  const [questionIdx, setQuestionIdx]         = useState(0);
  const [timeLeft, setTimeLeft]               = useState(TOTAL_TICKS);
  const [answered, setAnswered]               = useState(false);
  const [selectedAnswer, setSelectedAnswer]   = useState(null);
  const [lastResult, setLastResult]           = useState(null);
  const [myScore, setMyScore]                 = useState(0);
  const [leaderboard, setLeaderboard]         = useState([]);
  const [charIdx, setCharIdx]               = useState(() => Math.ceil(Math.random() * 5));
  const timerRef       = useRef(null);
  const timeoutSentRef = useRef(false);

  useEffect(() => {
    socket.on('joined-room', ({ code }) => {
      setJoinedCode(code);
      setScreen('waitingRoom');
    });

    socket.on('room-updated', ({ players: p }) => setPlayers(p || []));

    socket.on('game-started', ({ question, totalQuestions: total }) => {
      setCurrentQuestion(question);
      setTotalQuestions(total);
      setQuestionIdx(0);
      setTimeLeft(TOTAL_TICKS);
      setAnswered(false);
      setSelectedAnswer(null);
      setLastResult(null);
      setMyScore(0);
      timeoutSentRef.current = false;
      setScreen('gameplay');
    });

    socket.on('question-results', ({ question, answers, scores }) => {
      const myAnswer = answers[socket.id];
      setLastResult({
        wasCorrect:   myAnswer !== undefined && myAnswer.answer === question.correct,
        correctIndex: question.correct,
        myIndex:      myAnswer?.answer ?? null,
      });
      const me = scores.find(s => s.id === socket.id);
      if (me) setMyScore(me.score);
    });

    socket.on('next-question', ({ questionIndex, question }) => {
      timeoutSentRef.current = false;
      setQuestionIdx(questionIndex);
      setCurrentQuestion(question);
      setTimeLeft(TOTAL_TICKS);
      setAnswered(false);
      setSelectedAnswer(null);
      setLastResult(null);
    });

    socket.on('game-finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
      setScreen('leaderboard');
    });

    socket.on('room-closed', ({ message }) => { alert(message); handleBackHome(); });
    socket.on('error', ({ message }) => alert(message));

    return () => {
      socket.off('joined-room');
      socket.off('room-updated');
      socket.off('game-started');
      socket.off('question-results');
      socket.off('next-question');
      socket.off('game-finished');
      socket.off('room-closed');
      socket.off('error');
    };
  }, []);

  // Cuenta en décimas de segundo
  useEffect(() => {
    clearInterval(timerRef.current);
    if (screen !== 'gameplay' || answered || lastResult) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev <= 0 ? 0 : prev - 1));
    }, 100);

    return () => clearInterval(timerRef.current);
  }, [screen, answered, lastResult, questionIdx]);


  // Cambia el personaje al llegar una nueva pregunta (nunca el mismo dos veces seguidas)
  useEffect(() => {
    setCharIdx(prev => {
      let next;
      do { next = Math.floor(Math.random() * 5) + 1; } while (next === prev);
      return next;
    });
  }, [questionIdx]);

  // Emite timeout al llegar a 0, una sola vez por pregunta
  useEffect(() => {
    if (timeLeft === 0 && screen === 'gameplay' && !answered && !timeoutSentRef.current) {
      timeoutSentRef.current = true;
      socket.emit('question-timeout', {});
    }
  }, [timeLeft, screen, answered]);

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return alert('Ingresa nombre y código');
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName });
  };

  const handleAnswer = (idx) => {
    if (answered) return;
    setSelectedAnswer(idx);
    setAnswered(true);
    socket.emit('answer', { answer: idx, timeLeft: timeLeft / 10 });
  };

  const handleBackHome = () => {
    setScreen('home');
    setPlayerName('');
    setRoomCode('');
    setJoinedCode('');
    setPlayers([]);
    setCurrentQuestion(null);
    setAnswered(false);
    setSelectedAnswer(null);
    setLastResult(null);
    setMyScore(0);
    setLeaderboard([]);
  };

  // ── HOME ────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className="container home">
        <h1>🎮 Trivia</h1>
        <input className="input" placeholder="Tu nombre" value={playerName}
          onChange={e => setPlayerName(e.target.value)} />
        <input className="input code-input" placeholder="Código de sala"
          value={roomCode} maxLength={8}
          onChange={e => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()} />
        <button className="btn btn-success" onClick={handleJoin}>Unirse</button>
      </div>
    );
  }

  // ── WAITING ROOM ─────────────────────────────────────────
  if (screen === 'waitingRoom') {
    return (
      <div className="container">
        <h2>Sala {joinedCode}</h2>
        <div className="players-list">
          <p>Jugadores en sala ({players.length})</p>
          {players.map(p => (
            <div key={p.id} className="player-item">
              <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
        <p style={{ color: '#999', fontSize: 14, textAlign: 'center' }}>
          Esperando que el guía inicie el juego...
        </p>
      </div>
    );
  }

  // ── GAMEPLAY ─────────────────────────────────────────────
  if (screen === 'gameplay') {
    if (!currentQuestion) return null;

    const theme      = getTheme(currentQuestion.category);
    const isTF       = currentQuestion.options.length === 2;
    const secDisplay = (timeLeft / 10).toFixed(1);
    const pct        = (timeLeft / TOTAL_TICKS) * 100;
    const isUrgent   = timeLeft <= 50;

    const bgStyle = theme.image
      ? { backgroundImage: `url(${theme.image})`, backgroundSize: theme.bgSize ?? 'cover', backgroundPosition: theme.bgPosition ?? 'center', backgroundRepeat: 'no-repeat' }
      : { background: theme.gradient };

    return (
      <div className="game-screen" style={bgStyle}>

        {/* Rellena la zona del notch con el color del header actual */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 30,
          background: theme.headerColor,
          zIndex: 10,
        }} />

        {/* Personaje animado de fondo (uno por pregunta) */}
        <div className="chars-layer" aria-hidden="true">
          <img src={`/characters/char${charIdx}.png`} className={`char char-${charIdx}`} alt="" />
        </div>

        {/* Header */}
        <div className="game-header" style={{ background: theme.headerColor }}>
          <div className="game-header-side">
            <span className="gh-label">CATEGORÍA</span>
            <span className="gh-value">{theme.icon} {theme.label}</span>
          </div>
          <div className="gh-timer">
            <span className="gh-label">TIEMPO RESTANTE</span>
            <span className={`gh-time ${isUrgent ? 'urgent' : ''}`}>
              {secDisplay} <span className="gh-unit">SEG.</span>
            </span>
          </div>
          <div className="game-header-side right">
            <span className="gh-label">PREGUNTA</span>
            <span className="gh-value">{questionIdx + 1}/{totalQuestions}</span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="time-bar">
          <div className={`time-bar-fill ${isUrgent ? 'urgent' : ''}`}
            style={{ width: `${pct}%` }} />
        </div>

        {/* Cuerpo */}
        <div className="game-body">
          <div className="question-bubble">{currentQuestion.question}</div>

          {/* Opciones */}
          {isTF ? (
            // ── Verdadero / Falso ──
            <div className="options-tf">
              {currentQuestion.options.map((opt, idx) => {
                const tfColor = idx === 0 ? '#27ae60' : '#e74c3c';
                const tfIcon  = idx === 0 ? '✓' : '✗';
                let extra = '';
                if (lastResult) {
                  if (idx === lastResult.correctIndex)                       extra = 'opt-correct';
                  else if (idx === lastResult.myIndex && !lastResult.wasCorrect) extra = 'opt-wrong';
                  else                                                        extra = 'opt-dim';
                } else if (selectedAnswer === idx) {
                  extra = 'selected';
                }
                return (
                  <button key={idx}
                    className={`tf-btn ${extra}`}
                    style={{ background: tfColor }}
                    onClick={() => handleAnswer(idx)}
                    disabled={answered}>
                    <span className="tf-icon">{tfIcon}</span>
                    <span className="tf-label">{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            // ── Opción múltiple 2×2 ──
            <div className="options-grid">
              {currentQuestion.options.map((opt, idx) => {
                let extra = '';
                if (lastResult) {
                  if (idx === lastResult.correctIndex)                       extra = 'opt-correct';
                  else if (idx === lastResult.myIndex && !lastResult.wasCorrect) extra = 'opt-wrong';
                  else                                                        extra = 'opt-dim';
                } else if (selectedAnswer === idx) {
                  extra = 'selected';
                }
                return (
                  <button key={idx}
                    className={`option-card result ${extra}`}
                    style={{ background: MC_COLORS[idx] }}
                    onClick={() => handleAnswer(idx)}
                    disabled={answered}>
                    <span className="opt-shape">{MC_SHAPES[idx]}</span>
                    <span className="opt-text">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {answered && !lastResult && (
            <p className="waiting-msg">Esperando al resto de jugadores...</p>
          )}
          {lastResult && (
            <p className={`result-msg ${lastResult.wasCorrect ? 'ok' : 'fail'}`}>
              {lastResult.wasCorrect ? `✓ ¡Correcto!  ${myScore} pts` : '✗ Incorrecto'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ──────────────────────────────────────────
  if (screen === 'leaderboard') {
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <div className="container leaderboard">
        <h1>Resultados</h1>
        {leaderboard.map((player, idx) => (
          <div key={player.id}
            className={`leaderboard-item rank-${idx}${player.id === socket.id ? ' is-me' : ''}`}>
            <span className="rank">{medals[idx] || `#${idx + 1}`}</span>
            <span className="name">
              {player.name}
              {player.id === socket.id && <span className="you-tag"> (vos)</span>}
            </span>
            <span className="score">{player.score} pts</span>
          </div>
        ))}
        <button className="btn btn-secondary" onClick={handleBackHome}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return null;
}
