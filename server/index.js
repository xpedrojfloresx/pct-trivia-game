import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDB, addQuestion, getQuestions } from './db.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initDB();

const rooms = new Map();
const socketToRoom = new Map();

// type: 'tf' = Verdadero/Falso | 'mc' = opción múltiple
const QUESTIONS = [

  // ── AIRE ──────────────────────────────────────────────
  { id: 1,  category: 'AIRE', type: 'tf', question: 'El Péndulo de Foucault se utiliza para demostrar la rotación de la Tierra', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 2,  category: 'AIRE', type: 'mc', question: '¿De qué depende el funcionamiento del reloj de sol?', options: ['De la dirección del viento', 'De la posición del sol', 'De la temperatura del aire', 'De la humedad atmosférica'], correct: 1 },
  { id: 3,  category: 'AIRE', type: 'mc', question: '¿Cómo se mueve el péndulo de Foucault?', options: ['Su plano de oscilación gira por el movimiento de la Tierra', 'Siempre oscila en la misma dirección', 'Gira por la influencia del viento', 'Su velocidad aumenta con el tiempo'], correct: 0 },
  { id: 4,  category: 'AIRE', type: 'tf', question: 'Los 3 objetos al inicio del recorrido son: Reloj de sol, Calendario solar y Globo terráqueo', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 5,  category: 'AIRE', type: 'tf', question: 'En el solsticio de verano, el Sol parece estar "sobre nuestras cabezas"', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 6,  category: 'AIRE', type: 'mc', question: '¿Por dónde aparece el sol en el horizonte?', options: ['Oeste', 'Norte', 'Este', 'Sur'], correct: 2 },
  { id: 7,  category: 'AIRE', type: 'mc', question: '¿El calendario solar exterior indica?', options: ['La posición del sol en el cielo', 'La temperatura del día', 'Los días festivos del año', 'La velocidad del viento'], correct: 0 },
  { id: 8,  category: 'AIRE', type: 'mc', question: '¿Qué pasa si levantás y soltás 2, 3 o 4 bolas del péndulo de Newton?', options: ['Todas las bolas se mueven a la vez', 'Solo la primera bola se mueve', 'La misma cantidad de bolas se mueve en el lado opuesto', 'Las bolas quedan inmóviles'], correct: 2 },
  { id: 9,  category: 'AIRE', type: 'mc', question: '¿Qué define a un cuerpo pendulante?', options: ['Gira en torno a un eje fijo', 'Oscila por gravedad', 'Flota en el aire', 'Cae en línea recta'], correct: 1 },
  { id: 10, category: 'AIRE', type: 'tf', question: 'El péndulo de Foucault demuestra la rotación de la Tierra', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 11, category: 'AIRE', type: 'mc', question: 'El plano de oscilación del péndulo de Foucault:', options: ['Gira por el movimiento de la Tierra', 'Se mantiene fijo en el espacio', 'Cambia según el viento', 'Depende del peso del péndulo'], correct: 0 },
  { id: 12, category: 'AIRE', type: 'tf', question: 'Si no existiera atmósfera, el cielo sería azul las 24 horas', options: ['Verdadero', 'Falso'], correct: 1 },

  // ── TIERRA ────────────────────────────────────────────
  { id: 13, category: 'TIERRA', type: 'mc', question: '¿Qué dinosaurio está expuesto en el museo?', options: ['Tyranotitan Chubutensis', 'Tyrannosaurus Rex', 'Brachiosaurus', 'Velociraptor'], correct: 0 },
  { id: 14, category: 'TIERRA', type: 'mc', question: '¿Qué se forma cuando las placas tectónicas chocan entre sí?', options: ['Océanos', 'Desiertos', 'Montañas', 'Volcanes submarinos'], correct: 2 },
  { id: 15, category: 'TIERRA', type: 'mc', question: '¿En dónde habitó el Tyranotitan Chubutensis?', options: ['Norteamérica', 'Patagonia, Argentina', 'África del Sur', 'Siberia, Rusia'], correct: 1 },
  { id: 16, category: 'TIERRA', type: 'mc', question: '¿Qué pasa al levantar y soltar una esfera del péndulo de Newton?', options: ['Una esfera opuesta sube y las demás casi no se mueven', 'Todas las esferas se mueven a la vez', 'La esfera del medio sube más alto', 'Ninguna esfera se mueve'], correct: 0 },
  { id: 17, category: 'TIERRA', type: 'tf', question: 'La Luna es una parte de la Tierra desprendida de ella', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 18, category: 'TIERRA', type: 'tf', question: 'El dinosaurio expuesto en el museo es real', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 19, category: 'TIERRA', type: 'mc', question: '¿Qué porcentaje del volumen de la Tierra está contenido en el manto?', options: ['60%', '45%', '95%', '82%'], correct: 3 },
  { id: 20, category: 'TIERRA', type: 'mc', question: '¿Cuál es el espesor aproximado del manto terrestre?', options: ['6.400 km', '800 km', '2.900 km', '12.700 km'], correct: 2 },
  { id: 21, category: 'TIERRA', type: 'mc', question: '¿Qué tipo de margen tectónico genera la Cordillera de los Andes?', options: ['Divergente', 'Convergente', 'Transformante', 'Neutro'], correct: 1 },
  { id: 22, category: 'TIERRA', type: 'tf', question: 'Las placas tectónicas están formadas por la litosfera (corteza + manto superior)', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 23, category: 'TIERRA', type: 'tf', question: 'La falla de San Andrés es un ejemplo de margen divergente', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 24, category: 'TIERRA', type: 'tf', question: 'En Córdoba existen volcanes activos actualmente', options: ['Verdadero', 'Falso'], correct: 1 },

  // ── FUEGO ─────────────────────────────────────────────
  { id: 25, category: 'FUEGO', type: 'tf', question: 'El núcleo externo de la Tierra es sólido y el interno es líquido', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 26, category: 'FUEGO', type: 'mc', question: '¿Cómo es la Tierra por dentro?', options: ['Núcleo sólido, núcleo líquido, manto y corteza', 'Solo un núcleo sólido rodeado de magma', 'Corteza, manto y núcleo único', 'Hielo, roca, magma y gas'], correct: 0 },
  { id: 27, category: 'FUEGO', type: 'tf', question: 'El núcleo es el punto más caliente del planeta', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 28, category: 'FUEGO', type: 'mc', question: '¿Qué busca siempre la brújula?', options: ['El sur', 'El sol', 'El norte', 'El campo eléctrico'], correct: 2 },
  { id: 29, category: 'FUEGO', type: 'tf', question: 'El núcleo de la Tierra alcanza temperaturas similares a la superficie del Sol', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 30, category: 'FUEGO', type: 'tf', question: 'El núcleo terrestre está compuesto únicamente por hierro en estado sólido', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 31, category: 'FUEGO', type: 'tf', question: 'La presión en el núcleo es alrededor de un millón de veces mayor a la de la superficie terrestre', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 32, category: 'FUEGO', type: 'tf', question: 'El material fundido del núcleo puede salir a la superficie a través de los volcanes', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 33, category: 'FUEGO', type: 'mc', question: '¿Cuál es la principal composición del núcleo terrestre?', options: ['Silicio y oxígeno', 'Hierro y níquel', 'Carbono y azufre', 'Aluminio y magnesio'], correct: 1 },
  { id: 34, category: 'FUEGO', type: 'mc', question: '¿Qué capa del núcleo es líquida y presenta movimientos de convección?', options: ['Núcleo externo', 'Núcleo interno', 'Manto superior', 'Litosfera'], correct: 0 },
  { id: 35, category: 'FUEGO', type: 'mc', question: '¿Qué método utilizan los científicos para estudiar el interior de la Tierra?', options: ['Rayos X', 'Ultrasonido', 'Perforaciones directas', 'Ondas sísmicas'], correct: 3 },
  { id: 36, category: 'FUEGO', type: 'mc', question: '¿Qué fenómeno de luces aparece en el cielo cerca de los polos por el viento solar?', options: ['Relámpagos magnéticos', 'Fuegos fatuos', 'Auroras polares', 'Halos solares'], correct: 2 },

  // ── AGUA ──────────────────────────────────────────────
  { id: 37, category: 'AGUA', type: 'mc', question: '¿Cuál de estos NO es un estado del agua?', options: ['Sólido', 'Líquido', 'Gaseoso', 'Húmedo'], correct: 3 },
  { id: 38, category: 'AGUA', type: 'mc', question: '¿El ciclo del agua incluye?', options: ['Solo evaporación y precipitación', 'Solo condensación y escorrentía', 'Solo infiltración y transpiración', 'Todas las anteriores'], correct: 3 },
  { id: 39, category: 'AGUA', type: 'tf', question: '¿El agua que usamos hoy es la misma que existía en tiempos de los dinosaurios?', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 40, category: 'AGUA', type: 'tf', question: 'Hace más de 3 mil millones de años, la vida se originó en el agua', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 41, category: 'AGUA', type: 'mc', question: '¿Qué tipos de lluvia se han detectado en otros planetas?', options: ['Lluvias de agua salada', 'Lluvias de metano', 'Lluvias de hielo seco', 'Lluvias de arena'], correct: 1 },
  { id: 42, category: 'AGUA', type: 'tf', question: 'Los placodermos fueron de los primeros en desarrollar huesos y cráneo con mandíbulas', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 43, category: 'AGUA', type: 'mc', question: '¿Cuál de estos es un fósil de vertebrado marino con placas óseas?', options: ['Placodermo', 'Diplodocus', 'Pterodáctilo', 'Mamut'], correct: 0 },
  { id: 44, category: 'AGUA', type: 'mc', question: '¿Cuál de estos es un fósil de artrópodo marino del Paleozoico?', options: ['Triceratops', 'Braquiosaurio', 'Trilobite', 'Megalodón'], correct: 2 },
  { id: 45, category: 'AGUA', type: 'mc', question: '¿Cuál de estos es un fósil de cefalópodo con concha en espiral?', options: ['Mosasaurio', 'Ammonite', 'Estegosaurio', 'Plesiosaurio'], correct: 1 },
  { id: 46, category: 'AGUA', type: 'mc', question: '¿Qué tipos de organismos se ven en el fondo además de peces?', options: ['Moluscos y artrópodos', 'Solo mamíferos marinos', 'Reptiles y anfibios', 'Corales y algas únicamente'], correct: 0 },
  { id: 47, category: 'AGUA', type: 'tf', question: 'En otros planetas llueve agua igual que en la Tierra', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 48, category: 'AGUA', type: 'tf', question: 'Hay más seres humanos en el planeta que organismos vivos en un litro de agua de río', options: ['Verdadero', 'Falso'], correct: 1 },

  // ── BONUS ─────────────────────────────────────────────
  { id: 49, category: 'BONUS', type: 'mc', question: '¿Qué estrellas forman el cinturón de Orión?', options: ['Las Pléyades', 'La Cruz del Sur', 'Las Tres Marías', 'La Osa Mayor'], correct: 2 },
  { id: 50, category: 'BONUS', type: 'mc', question: '¿Cuál de estos planetas NO es visible a simple vista desde la Tierra?', options: ['Venus', 'Marte', 'Júpiter', 'Urano'], correct: 3 },
  { id: 51, category: 'BONUS', type: 'mc', question: '¿Cuál es el cuerpo celeste más cercano a nosotros?', options: ['La Luna', 'El Sol', 'Marte', 'Venus'], correct: 0 },
  { id: 52, category: 'BONUS', type: 'mc', question: '¿Cómo se llaman las órbitas cerradas que giran alrededor del Sol?', options: ['Círculos perfectos', 'Elipses', 'Parábolas', 'Espirales'], correct: 1 },
  { id: 53, category: 'BONUS', type: 'tf', question: 'El planeta Tierra se encuentra afuera de la Vía Láctea', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 54, category: 'BONUS', type: 'tf', question: 'Las Nubes de Magallanes son las galaxias más cercanas a nosotros', options: ['Verdadero', 'Falso'], correct: 0 },
  { id: 55, category: 'BONUS', type: 'tf', question: 'El cielo se puede apreciar de la misma manera en diferentes lugares del país', options: ['Verdadero', 'Falso'], correct: 1 },
  { id: 56, category: 'BONUS', type: 'tf', question: 'La Tierra tarda 1 año en dar un giro completo alrededor del Sol', options: ['Verdadero', 'Falso'], correct: 0 },
];

// REST API
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await getQuestions();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions', async (req, res) => {
  const { question, options, correct } = req.body;
  try {
    await addQuestion(question, JSON.stringify(options), correct);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('create-room', ({ playerName }) => {
    const roomCode = generateRoomCode();

    const room = {
      code: roomCode,
      guide: { id: socket.id, name: playerName },
      players: [],
      questions: [],
      gameState: 'waiting',
      currentQuestion: 0,
      answers: {},
      processingQuestion: false,
      createdAt: Date.now(),
    };

    rooms.set(roomCode, room);
    socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);

    socket.emit('room-created', { code: roomCode });
    io.to(roomCode).emit('room-updated', { players: room.players, code: roomCode });
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala no encontrada' });
      return;
    }
    if (room.gameState !== 'waiting') {
      socket.emit('error', { message: 'La partida ya comenzó' });
      return;
    }

    room.players.push({ id: socket.id, name: playerName, score: 0 });
    socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);

    socket.emit('joined-room', { code: roomCode });
    io.to(roomCode).emit('room-updated', { players: room.players, code: roomCode });
    console.log(`${playerName} joined ${roomCode}`);
  });

  socket.on('start-game', ({ categories } = {}) => {
    const roomCode = socketToRoom.get(socket.id);
    const room = rooms.get(roomCode);

    if (!room || room.guide.id !== socket.id || room.players.length === 0) return;

    const cats = Array.isArray(categories) && categories.length > 0 ? categories : null;
    const pool = cats ? QUESTIONS.filter(q => cats.includes(q.category)) : QUESTIONS;

    if (pool.length === 0) return;

    // Mezclar y tomar hasta 12 preguntas al azar
    const selected = shuffle(pool).slice(0, 12);

    room.questions = selected;
    room.gameState = 'playing';
    room.currentQuestion = 0;
    room.answers = {};

    io.to(roomCode).emit('game-started', {
      players: room.players,
      question: selected[0],
      totalQuestions: selected.length,
    });
  });

  socket.on('answer', ({ answer, timeLeft }) => {
    const roomCode = socketToRoom.get(socket.id);
    const room = rooms.get(roomCode);

    if (!room || room.processingQuestion) return;

    room.answers[socket.id] = { answer, timeLeft };
    io.to(roomCode).emit('player-answered', { playerId: socket.id });

    if (Object.keys(room.answers).length === room.players.length) {
      processQuestion(room, roomCode);
    }
  });

  socket.on('question-timeout', () => {
    const roomCode = socketToRoom.get(socket.id);
    const room = rooms.get(roomCode);

    if (!room || room.processingQuestion) return;
    processQuestion(room, roomCode);
  });

  socket.on('disconnect', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        if (room.guide.id === socket.id) {
          rooms.delete(roomCode);
          io.to(roomCode).emit('room-closed', { message: 'El guía se desconectó' });
        } else {
          room.players = room.players.filter(p => p.id !== socket.id);
          io.to(roomCode).emit('room-updated', { players: room.players, code: roomCode });
        }
      }
    }
    socketToRoom.delete(socket.id);
    console.log(`Disconnected: ${socket.id}`);
  });
});

function processQuestion(room, roomCode) {
  room.processingQuestion = true;

  const question = room.questions[room.currentQuestion];

  room.players.forEach(player => {
    const playerAnswer = room.answers[player.id];
    if (playerAnswer && playerAnswer.answer === question.correct) {
      player.score += Math.max(1, Math.round(playerAnswer.timeLeft));
    }
  });

  io.to(roomCode).emit('question-results', {
    question,
    answers: room.answers,
    scores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
  });

  room.currentQuestion++;
  room.answers = {};

  if (room.currentQuestion >= room.questions.length) {
    room.gameState = 'finished';
    room.processingQuestion = false;
    io.to(roomCode).emit('game-finished', {
      leaderboard: [...room.players].sort((a, b) => b.score - a.score),
    });
  } else {
    setTimeout(() => {
      room.processingQuestion = false;
      io.to(roomCode).emit('next-question', {
        questionIndex: room.currentQuestion,
        question: room.questions[room.currentQuestion],
      });
    }, 3000);
  }
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
