import express from 'express';
import { getAllAdminQuestions, createAdminQuestion, updateAdminQuestion, deleteAdminQuestion } from './db.js';

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'trivia-admin';
const VALID_CATEGORIES = ['FUEGO', 'AIRE', 'AGUA', 'TIERRA', 'BONUS'];

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-secret'] ?? req.query.secret;
  if (token !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function validateQuestion(body) {
  const { category, type, question, options, correct } = body;
  if (!VALID_CATEGORIES.includes(category)) return 'Categoría inválida';
  if (type !== 'tf' && type !== 'mc') return 'Tipo debe ser tf o mc';
  if (!question?.trim()) return 'La pregunta es obligatoria';
  if (!Array.isArray(options) || options.length < 2) return 'Se necesitan al menos 2 opciones';
  if (type === 'tf' && options.length !== 2) return 'Tipo tf requiere exactamente 2 opciones';
  if (type === 'mc' && options.length !== 4) return 'Tipo mc requiere exactamente 4 opciones';
  if (typeof correct !== 'number' || correct < 0 || correct >= options.length) return 'Índice de respuesta inválido';
  return null;
}

router.get('/questions', requireAdmin, async (req, res) => {
  try {
    const questions = await getAllAdminQuestions(req.query.category || null);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/questions', requireAdmin, async (req, res) => {
  const err = validateQuestion(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const { category, type, question, options, correct } = req.body;
    const id = await createAdminQuestion(category, type, question, options, correct);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/questions/:id', requireAdmin, async (req, res) => {
  const err = validateQuestion(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const { category, type, question, options, correct } = req.body;
    const changes = await updateAdminQuestion(Number(req.params.id), category, type, question, options, correct);
    if (!changes) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/questions/:id', requireAdmin, async (req, res) => {
  try {
    const changes = await deleteAdminQuestion(Number(req.params.id));
    if (!changes) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
