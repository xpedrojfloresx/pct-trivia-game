import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = ['FUEGO', 'AIRE', 'AGUA', 'TIERRA', 'BONUS'];
const TF_OPTIONS = ['Verdadero', 'Falso'];
const EMPTY_FORM = { category: 'FUEGO', type: 'mc', question: '', options: ['', '', '', ''], correct: 0 };

function apiBase() {
  const base = import.meta.env.VITE_SERVER_URL || window.location.origin;
  return `${base}/api/admin`;
}

export default function AdminPage() {
  const [secret, setSecret] = useState(() => localStorage.getItem('adminSecret') || '');
  const [authed, setAuthed] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Allow scroll on this page only
  useEffect(() => {
    document.body.style.overflowY = 'auto';
    return () => { document.body.style.overflowY = ''; };
  }, []);

  function headers() {
    return { 'Content-Type': 'application/json', 'x-admin-secret': secret };
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/questions`, { headers: headers() });
      if (res.status === 401) { setAuthed(false); return; }
      setQuestions(await res.json());
    } catch {
      setError('Error al cargar preguntas');
    }
  }, [secret]);

  async function login() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase()}/questions`, {
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      });
      if (res.ok) {
        localStorage.setItem('adminSecret', secret);
        setAuthed(true);
        setQuestions(await res.json());
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('No se pudo conectar al servidor');
    }
    setLoading(false);
  }

  useEffect(() => { if (authed) load(); }, [authed, load]);

  function openCreate() {
    setEditId(null);
    setError('');
    setForm({ ...EMPTY_FORM, options: ['', '', '', ''] });
  }

  function openEdit(q) {
    setEditId(q.id);
    setError('');
    const opts = q.type === 'tf'
      ? ['Verdadero', 'Falso', '', '']
      : [...q.options, '', '', '', ''].slice(0, 4);
    setForm({ category: q.category, type: q.type, question: q.question, options: opts, correct: q.correct });
  }

  function handleTypeChange(type) {
    setForm(f => ({
      ...f, type,
      options: type === 'tf' ? ['Verdadero', 'Falso', '', ''] : ['', '', '', ''],
      correct: 0,
    }));
  }

  async function handleSave() {
    setError('');
    const finalOptions = form.type === 'tf'
      ? TF_OPTIONS
      : form.options.slice(0, 4).filter(o => o.trim());
    if (!form.question.trim()) { setError('La pregunta es obligatoria'); return; }
    if (form.type === 'mc' && finalOptions.length < 2) { setError('Se necesitan al menos 2 opciones'); return; }
    if (form.correct >= finalOptions.length) { setError('Seleccioná la respuesta correcta'); return; }

    const body = { ...form, options: finalOptions };
    const url = editId ? `${apiBase()}/questions/${editId}` : `${apiBase()}/questions`;
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
      if (res.ok) { setForm(null); setEditId(null); load(); }
      else { const d = await res.json(); setError(d.error || 'Error al guardar'); }
    } catch { setError('Error de red'); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await fetch(`${apiBase()}/questions/${deleteTarget}`, { method: 'DELETE', headers: headers() });
      setDeleteTarget(null);
      load();
    } catch { setError('Error al eliminar'); }
  }

  // Client-side filtering — always load all, filter locally so counts are always accurate
  const displayed = filter ? questions.filter(q => q.category === filter) : questions;
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = questions.filter(q => q.category === c).length;
    return acc;
  }, {});

  if (!authed) {
    return (
      <div className="adm-login">
        <div className="adm-card adm-login-box">
          <h1 className="adm-login-title">Panel de Admin</h1>
          <p className="adm-login-sub">Trivia Museo · Gestión de preguntas</p>
          <input
            className="input adm-login-input"
            type="password"
            placeholder="Contraseña de administrador"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          <button className="btn btn-primary" onClick={login} disabled={loading}>
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
          {error && <p className="adm-error">{error}</p>}
          <p className="hint-text">Contraseña por defecto: <code>trivia-admin</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-page">
      <div className="adm-topbar adm-card-flat">
        <span className="adm-topbar-title">Panel de Admin <span className="adm-topbar-count">({questions.length} preguntas)</span></span>
        <div className="adm-topbar-right">
          <button className="btn btn-primary adm-btn-inline" onClick={openCreate}>+ Nueva</button>
          <button className="btn btn-secondary adm-btn-inline" onClick={() => { localStorage.removeItem('adminSecret'); setAuthed(false); }}>
            Salir
          </button>
        </div>
      </div>

      <div className="adm-body">
        <div className="adm-filters">
          <button
            className={`adm-filter-btn${filter === '' ? ' active' : ''}`}
            onClick={() => setFilter('')}
          >
            Todas ({questions.length})
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`adm-filter-btn adm-filter-${c.toLowerCase()}${filter === c ? ' active' : ''}`}
              onClick={() => setFilter(c)}
            >
              {c} ({counts[c]})
            </button>
          ))}
        </div>

        {error && <p className="adm-error adm-error-bar">{error}</p>}

        <div className="adm-card adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Pregunta</th>
                <th>Respuesta correcta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr><td colSpan={6} className="adm-empty">No hay preguntas</td></tr>
              )}
              {displayed.map(q => (
                <tr key={q.id}>
                  <td className="adm-td-id" data-label="ID">{q.id}</td>
                  <td data-label="Categoría"><span className={`adm-badge adm-badge-${q.category.toLowerCase()}`}>{q.category}</span></td>
                  <td className="adm-td-type" data-label="Tipo">{q.type.toUpperCase()}</td>
                  <td className="adm-td-question" data-label="Pregunta">{q.question}</td>
                  <td className="adm-td-correct" data-label="Respuesta">{q.options[q.correct]}</td>
                  <td className="adm-td-actions">
                    <button className="adm-action-btn" onClick={() => openEdit(q)} title="Editar">✏️</button>
                    <button className="adm-action-btn" onClick={() => setDeleteTarget(q.id)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div className="adm-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="adm-card adm-form">
            <h2>{editId ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
            {error && <p className="adm-error">{error}</p>}

            <label className="adm-label">Categoría</label>
            <select className="input adm-select" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label className="adm-label">Tipo</label>
            <div className="adm-type-toggle">
              {[{ v: 'mc', l: 'Múltiple choice' }, { v: 'tf', l: 'Verdadero / Falso' }].map(({ v, l }) => (
                <button key={v} className={`adm-type-btn${form.type === v ? ' active' : ''}`}
                  onClick={() => handleTypeChange(v)}>{l}</button>
              ))}
            </div>

            <label className="adm-label">Pregunta</label>
            <textarea className="adm-textarea" rows={3} value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="Escribí la pregunta aquí…" />

            <label className="adm-label">
              Opciones <span className="adm-label-hint">— marcá la correcta con el radio</span>
            </label>
            {Array.from({ length: form.type === 'tf' ? 2 : 4 }).map((_, i) => (
              <div key={i} className={`adm-option-row${form.correct === i ? ' is-correct' : ''}`}>
                <input type="radio" name="correct" checked={form.correct === i}
                  onChange={() => setForm(f => ({ ...f, correct: i }))} />
                <input className="input adm-option-input"
                  type="text"
                  disabled={form.type === 'tf'}
                  value={form.type === 'tf' ? TF_OPTIONS[i] : (form.options[i] || '')}
                  onChange={e => {
                    const opts = [...form.options];
                    opts[i] = e.target.value;
                    setForm(f => ({ ...f, options: opts }));
                  }}
                  placeholder={`Opción ${i + 1}`}
                />
                {form.correct === i && <span className="adm-correct-mark">✓ correcta</span>}
              </div>
            ))}

            <div className="adm-form-footer">
              <button className="btn btn-secondary adm-btn-half" onClick={() => { setForm(null); setError(''); }}>Cancelar</button>
              <button className="btn btn-primary adm-btn-half" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="adm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="adm-card adm-confirm" onClick={e => e.stopPropagation()}>
            <p>¿Eliminar esta pregunta?</p>
            <div className="adm-confirm-actions">
              <button className="btn btn-secondary adm-btn-half" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn adm-btn-danger adm-btn-half" onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
