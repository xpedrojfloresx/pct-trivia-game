import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'trivia.db');

let db;

export function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening DB:', err);
        reject(err);
      } else {
        console.log(`Connected to SQLite at ${dbPath}`);
        
        db.serialize(() => {
          db.run(`
            CREATE TABLE IF NOT EXISTS questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              question TEXT NOT NULL,
              options TEXT NOT NULL,
              correct INTEGER NOT NULL,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) console.error('Error creating questions table:', err);
          });

          db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              code TEXT UNIQUE NOT NULL,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              finishedAt DATETIME
            )
          `, (err) => {
            if (err) console.error('Error creating rooms table:', err);
          });

          db.run(`
            CREATE TABLE IF NOT EXISTS players (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              roomCode TEXT NOT NULL,
              name TEXT NOT NULL,
              score INTEGER DEFAULT 0,
              FOREIGN KEY (roomCode) REFERENCES rooms(code)
            )
          `, (err) => {
            if (err) console.error('Error creating players table:', err);
            resolve();
          });
        });
      }
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
      else resolve((rows || []).map(row => ({
        ...row,
        options: JSON.parse(row.options),
      })));
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