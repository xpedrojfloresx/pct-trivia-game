import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.NODE_ENV === 'production'
  ? '/home/data'
  : path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'trivia.db');

let db;

export function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) { console.error('Error opening DB:', err); reject(err); return; }
      console.log(`Connected to SQLite at ${dbPath}`);

      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL DEFAULT 'BONUS',
            type TEXT NOT NULL DEFAULT 'mc',
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            correct INTEGER NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Migration: add columns if DB existed with old schema (errors silently ignored)
        db.run(`ALTER TABLE questions ADD COLUMN category TEXT NOT NULL DEFAULT 'BONUS'`, () => {});
        db.run(`ALTER TABLE questions ADD COLUMN type TEXT NOT NULL DEFAULT 'mc'`, () => {});

        db.run(`
          CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            finishedAt DATETIME
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roomCode TEXT NOT NULL,
            name TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            FOREIGN KEY (roomCode) REFERENCES rooms(code)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
}

export function countQuestions() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM questions', (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

export function getDistinctCategoryCount() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(DISTINCT category) as count FROM questions', (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

export function clearQuestions() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM questions', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function seedQuestions(questions) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO questions (category, type, question, options, correct) VALUES (?, ?, ?, ?, ?)'
    );
    db.serialize(() => {
      questions.forEach(q => {
        stmt.run(q.category, q.type, q.question, JSON.stringify(q.options), q.correct);
      });
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export function getGameQuestions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM questions', (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []).map(row => ({ ...row, options: JSON.parse(row.options) })));
    });
  });
}

export function getAllAdminQuestions(category) {
  return new Promise((resolve, reject) => {
    const query = category
      ? 'SELECT * FROM questions WHERE category = ? ORDER BY category, id'
      : 'SELECT * FROM questions ORDER BY category, id';
    db.all(query, category ? [category] : [], (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []).map(row => ({ ...row, options: JSON.parse(row.options) })));
    });
  });
}

export function createAdminQuestion(category, type, question, options, correct) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO questions (category, type, question, options, correct) VALUES (?, ?, ?, ?, ?)',
      [category, type, question, JSON.stringify(options), correct],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

export function updateAdminQuestion(id, category, type, question, options, correct) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE questions SET category=?, type=?, question=?, options=?, correct=? WHERE id=?',
      [category, type, question, JSON.stringify(options), correct, id],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

export function deleteAdminQuestion(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM questions WHERE id=?', [id], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

export function addQuestion(question, options, correct) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO questions (question, options, correct) VALUES (?, ?, ?)',
      [question, options, correct],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

export function getQuestions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM questions', (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []).map(row => ({ ...row, options: JSON.parse(row.options) })));
    });
  });
}

export function createRoom(code) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO rooms (code) VALUES (?)', [code], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

export function getRoomPlayers(roomCode) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM players WHERE roomCode = ?', [roomCode], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function updatePlayerScore(roomCode, playerName, score) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE players SET score = ? WHERE roomCode = ? AND name = ?',
      [score, roomCode, playerName],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function finishRoom(code) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE rooms SET finishedAt = CURRENT_TIMESTAMP WHERE code = ?',
      [code],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
