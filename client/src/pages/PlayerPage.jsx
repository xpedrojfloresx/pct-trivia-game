import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { getTheme } from '../config/categories';
import { useLanguage } from '../context/LanguageContext';
import LangSwitcher from '../components/LangSwitcher';
import { translateQuestion } from '../services/translator';
import LogoBanner from '../components/LogoBanner';

const socket = io(`http://${window.location.hostname}:3001`);

const TOTAL_TICKS = 200; // 20 segundos en décimas

const MC_COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];
const MC_SHAPES = ['▲', '◆', '●', '■'];

export default function PlayerPage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  const [screen, setScreen]                   = useState('home');
  const [playerName, setPlayerName]           = useState('');
  const [roomCode, setRoomCode]               = useState('');
  const [joinedCode, setJoinedCode]           = useState('');
  const [players, setPlayers]                 = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);  // pregunta cruda (español)
  const [displayQuestion, setDisplayQuestion] = useState(null);  // pregunta traducida
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
  const [email, setEmail]                   = useState('');
  const [emailSent, setEmailSent]           = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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

  // Emite timeout al llegar a 0, una sola vez por pregunta
  useEffect(() => {
    if (timeLeft === 0 && screen === 'gameplay' && !answered && !timeoutSentRef.current) {
      timeoutSentRef.current = true;
      socket.emit('question-timeout', {});
    }
  }, [timeLeft, screen, answered]);

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return alert(t.alertNameRoom);
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
      <>
        <LogoBanner />
        <div className="container home">
          <nav className="page-nav">
            <button className="page-nav-btn active">
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
            <button className="page-nav-btn" onClick={() => navigate('/guide')}>
              <div className="page-nav-icon">
                <span className="nav-pencil">✏️</span>
              </div>
              <span className="page-nav-label">{t.navCreate}</span>
            </button>
          </nav>
          <img src="/logo-pct.png" alt="Trivia Game" className="logo" />
          <LangSwitcher />
          <div className="home-form">
            <input
              className="input"
              placeholder={t.namePlaceholder}
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onBlur={() => window.scrollTo(0, 0)}
            />
            <input
              className="input code-input"
              placeholder={t.roomCodePlaceholder}
              value={roomCode}
              maxLength={8}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              onBlur={() => window.scrollTo(0, 0)}
            />
            <button className="btn btn-success" onClick={handleJoin}>{t.joinBtn}</button>
          </div>
        </div>
      </>
    );
  }

  // ── WAITING ROOM ─────────────────────────────────────────
  if (screen === 'waitingRoom') {
    return (
      <>
        <LogoBanner />
        <div className="container">
          <h2>{t.waitingRoomTitle(joinedCode)}</h2>
          <div className="players-list">
            <p>{t.playersInRoom(players.length)}</p>
            {players.map(p => (
              <div key={p.id} className="player-item">
                <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
          <p style={{ color: '#999', fontSize: 14, textAlign: 'center' }}>
            {t.waitingForGuide}
          </p>
        </div>
      </>
    );
  }

  // ── GAMEPLAY ─────────────────────────────────────────────
  if (screen === 'gameplay') {
    if (!displayQuestion) return null;

    const theme      = getTheme(displayQuestion.category);
    const isTF       = displayQuestion.options.length === 2;
    const secDisplay = (timeLeft / 10).toFixed(1);
    const pct        = (timeLeft / TOTAL_TICKS) * 100;
    const isUrgent   = timeLeft <= 50;

    const bgStyle = theme.image
      ? { backgroundImage: `url(${theme.image})`, backgroundSize: theme.bgSize ?? 'cover', backgroundPosition: theme.bgPosition ?? 'center', backgroundRepeat: 'no-repeat' }
      : { background: theme.gradient };

    const q = displayQuestion;

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
            <span className="gh-label">{t.categoryLabel}</span>
            <span className="gh-value">{theme.icon} {theme.label}</span>
          </div>
          <div className="gh-timer">
            <span className="gh-label">{t.timeLabel}</span>
            <span className={`gh-time ${isUrgent ? 'urgent' : ''}`}>
              {secDisplay} <span className="gh-unit">{t.secUnit}</span>
            </span>
          </div>
          <div className="game-header-side right">
            <span className="gh-label">{t.questionLabel}</span>
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
          <div className="question-bubble">{q.question}</div>

          {/* Opciones */}
          {isTF ? (
            // ── Verdadero / Falso ──
            <div className="options-tf">
              {q.options.map((opt, idx) => {
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
              {q.options.map((opt, idx) => {
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
            <p className="waiting-msg">{t.waitingOthers}</p>
          )}
          {lastResult && (
            <p className={`result-msg ${lastResult.wasCorrect ? 'ok' : 'fail'}`}>
              {lastResult.wasCorrect ? t.correct(myScore) : t.incorrect}
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
      <>
        <LogoBanner />
        <div className="container leaderboard">
          <h1>{t.results}</h1>
          {leaderboard.map((player, idx) => (
            <div key={player.id}
              className={`leaderboard-item rank-${idx}${player.id === socket.id ? ' is-me' : ''}`}>
              <span className="rank">{medals[idx] || `#${idx + 1}`}</span>
              <span className="name">
                {player.name}
                {player.id === socket.id && <span className="you-tag">{t.youTag}</span>}
              </span>
              <span className="score">{player.score} pts</span>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={() => {
            setEmailSent(false);
            setEmail('');
            setScreen('thankyou');
            setPrivacyChecked(false);
          }}>
            {t.continueBtn}
          </button>
        </div>
      </>
    );
  }

  // ── THANK YOU ──────────────────────────────────────────────
if (screen === 'thankyou') {
  const ty = {
    es: {
      title: '¡Gracias por participar!',
      subtitle: 'Esperamos que hayas disfrutado la visita al Museo Plaza Cielo Tierra.',
      emailPlaceholder: 'Tu correo electrónico (opcional)',
      checkboxPre: 'Acepto recibir notificaciones y la ',
      privacyLink: 'política de privacidad',
      checkboxPost: '.',
      sendBtn: 'Enviar',
      successMsg: '¡Gracias por suscribirte! Te enviaremos novedades del museo.',
      backHome: 'Volver al inicio',
      privacyTitle: 'Política de Privacidad',
      privacyBody: 'Tu correo electrónico será utilizado exclusivamente para informarte sobre futuros eventos organizados por el Museo Plaza Cielo Tierra. No compartiremos tus datos con terceros ni los usaremos para ningún otro fin. Podés darte de baja en cualquier momento.',
      close: 'Cerrar',
    },
    en: {
      title: 'Thank you for participating!',
      subtitle: 'We hope you enjoyed your visit to the Plaza Cielo Tierra Museum.',
      emailPlaceholder: 'Your email address (optional)',
      checkboxPre: 'I agree to receive notifications and the ',
      privacyLink: 'privacy policy',
      checkboxPost: '.',
      sendBtn: 'Send',
      successMsg: 'Thanks for subscribing! We\'ll keep you updated on museum news.',
      backHome: 'Back to home',
      privacyTitle: 'Privacy Policy',
      privacyBody: 'Your email address will be used exclusively to inform you about future events organized by the Plaza Cielo Tierra Museum. We will not share your data with third parties or use it for any other purpose. You can unsubscribe at any time.',
      close: 'Close',
    },
    pt: {
      title: 'Obrigado por participar!',
      subtitle: 'Esperamos que tenha aproveitado a visita ao Museu Plaza Cielo Tierra.',
      emailPlaceholder: 'Seu e-mail (opcional)',
      checkboxPre: 'Aceito receber notificações e a ',
      privacyLink: 'política de privacidade',
      checkboxPost: '.',
      sendBtn: 'Enviar',
      successMsg: 'Obrigado por se inscrever! Enviaremos novidades do museu.',
      backHome: 'Voltar ao início',
      privacyTitle: 'Política de Privacidade',
      privacyBody: 'O seu endereço de e-mail será utilizado exclusivamente para informá-lo sobre eventos futuros organizados pelo Museu Plaza Cielo Tierra. Não compartilharemos seus dados com terceiros nem os usaremos para nenhum outro fim. Você pode cancelar a inscrição a qualquer momento.',
      close: 'Fechar',
    },
  }[lang] ?? {};

  const handleSend = () => {
    if (!privacyChecked || emailSent) return;
    // Aquí podés conectar el envío real al backend
    console.log('Email a guardar:', email);
    setEmailSent(true);
  };

  return (
    <>
      <LogoBanner />
      <div className="container" style={{ justifyContent: 'center', gap: '1.25rem' }}>

        {/* Modal política de privacidad */}
        {showPrivacyModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: '1.5rem',
          }}>
            <div style={{
              background: 'white', borderRadius: '16px', padding: '1.5rem',
              maxWidth: '340px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '16px', fontWeight: 700 }}>
                {ty.privacyTitle}
              </h3>
              <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {ty.privacyBody}
              </p>
              <button className="btn btn-primary" onClick={() => setShowPrivacyModal(false)}>
                {ty.close}
              </button>
            </div>
          </div>
        )}

        {/* Contenido */}
        <img src="/logo-pct.png" alt="Plaza Cielo Tierra" className="logo"
          style={{ marginTop: 0 }} />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '22px', marginBottom: '0.5rem' }}>{ty.title}</h1>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5 }}>{ty.subtitle}</p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            className="input"
            type="email"
            placeholder={ty.emailPlaceholder}
            value={email}
            disabled={emailSent}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => window.scrollTo(0, 0)}
            style={{ opacity: emailSent ? 0.5 : 1 }}
          />

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            fontSize: '13px', color: '#444', lineHeight: 1.5, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={privacyChecked}
              disabled={emailSent}
              onChange={e => setPrivacyChecked(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0, width: '16px', height: '16px' }}
            />
            <span>
              {ty.checkboxPre}
              <button
                onClick={() => setShowPrivacyModal(true)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: '#007AFF', textDecoration: 'underline',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {ty.privacyLink}
              </button>
              {ty.checkboxPost}
            </span>
          </label>

          {emailSent ? (
            <div style={{
              background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb',
              borderRadius: '8px', padding: '12px', textAlign: 'center',
              fontSize: '14px', fontWeight: 500,
            }}>
              ✅ {ty.successMsg}
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={!privacyChecked}
            >
              {ty.sendBtn}
            </button>
          )}
        </div>

        <button className="btn btn-secondary" onClick={handleBackHome}>
          {ty.backHome}
        </button>

      </div>
    </>
  );
}

  return null;
}
