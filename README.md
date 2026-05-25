# 🎮 Trivia Multijugador

Juego de trivia estilo Kahoot en tiempo real para usar en visitas guiadas al museo. Un **guía** crea la sala y controla el juego desde su pantalla; los **jugadores** participan desde sus celulares escaneando el código de sala.

---

## ⚙️ Requisitos previos

- **Node.js** v18 o superior → [nodejs.org](https://nodejs.org)
- **npm** (viene incluido con Node.js)

Para verificar que los tenés instalados:
```bash
node -v
npm -v
```

---

## 🚀 Cómo correrlo localmente

### 1. Clonar / descargar el proyecto

Asegurate de tener la carpeta `trivia-game` en tu máquina.

### 2. Instalar dependencias

Abrí una terminal en la raíz del proyecto (`trivia-game/`) y ejecutá:

```bash
# Dependencias raíz (concurrently para correr todo junto)
npm install

# Dependencias del servidor
cd server && npm install && cd ..

# Dependencias del cliente
cd client && npm install && cd ..
```

### 3. Levantar el proyecto

Desde la raíz del proyecto, un solo comando levanta **servidor y cliente al mismo tiempo**:

```bash
npm run dev
```

Esto inicia:
| Servicio | URL | Para qué |
|---|---|---|
| **Servidor** | `http://localhost:3001` | Backend + WebSockets |
| **Cliente** | `http://localhost:5173` | Interfaz web |

### 4. Acceder desde el celular (misma red Wi-Fi)

1. Averiguá la IP local de tu PC (ej: `192.168.1.50`):
   - Windows: `ipconfig` en la terminal → buscar "Dirección IPv4"
   - Mac/Linux: `ifconfig` o `ip a`
2. Entrá desde el celular a `http://192.168.1.50:5173`

> El juego usa `window.location.hostname` automáticamente, así que el celular se conecta al servidor correcto sin configuración extra.

---

## 🎯 Cómo se juega

### Guía (quien conduce el juego)
1. Abre `http://localhost:5173/guide` (o la IP local + `/guide`)
2. Ingresa su nombre y crea la sala → recibe un **código de sala**
3. Elige las **categorías** que quiere jugar (Fuego, Aire, Agua, Tierra, Bonus)
4. Espera a que los jugadores se unan y hace click en **Iniciar**
5. Ve el scoreboard en tiempo real: qué jugadores respondieron y cuántos puntos tienen
6. El juego avanza automáticamente a la siguiente pregunta tras 3 segundos de mostrar resultados

### Jugador
1. Abre `http://IP-del-guia:5173` en su celular
2. Ingresa su nombre y el **código de sala** que le pasó el guía
3. Responde las preguntas antes de que se acabe el tiempo (20 segundos por pregunta)
4. Gana más puntos cuanto más rápido responda correctamente

---

## 📁 Estructura del proyecto

```
trivia-game/
├── package.json          ← Scripts raíz (dev, build, start)
├── server/
│   ├── index.js          ← Servidor principal
│   ├── db.js             ← Capa de base de datos (SQLite)
│   └── package.json      ← Dependencias del servidor
└── client/
    ├── public/
    │   └── characters/   ← Imágenes PNG de los personajes animados
    │       ├── char1.png ... char5.png
    └── src/
        ├── main.jsx          ← Punto de entrada de React
        ├── App.jsx           ← Router principal (/ y /guide)
        ├── App.css           ← Todos los estilos del proyecto
        ├── config/
        │   └── categories.js ← Configuración visual de cada categoría
        └── pages/
            ├── PlayerPage.jsx ← Pantalla del jugador
            └── GuidePage.jsx  ← Panel del guía
```

---

## 📄 Descripción de cada archivo

### `server/index.js`
El corazón del backend. Hace tres cosas:
- **API REST** con Express (rutas `/api/health` y `/api/questions`)
- **WebSocket** con Socket.io: maneja las salas, jugadores, preguntas y puntajes en tiempo real
- **Banco de preguntas**: 56 preguntas hardcodeadas divididas en 5 categorías (AIRE, TIERRA, FUEGO, AGUA, BONUS), cada una con tipo `tf` (Verdadero/Falso) o `mc` (opción múltiple)

Flujo principal:
1. El guía emite `create-room` → el servidor crea la sala con un código aleatorio
2. Los jugadores emiten `join-room` → se agregan a la sala
3. El guía emite `start-game` con las categorías elegidas → el servidor filtra, mezcla y toma hasta 12 preguntas al azar
4. Por cada pregunta: recibe respuestas (`answer`) o timeout (`question-timeout`), calcula puntajes y emite `question-results`
5. Espera 3 segundos y pasa a la siguiente pregunta (`next-question`) o termina (`game-finished`)

El **puntaje** se calcula por tiempo restante: responder con 20 segundos = 20 puntos, con 1 segundo = 1 punto.

---

### `server/db.js`
Módulo de persistencia con **SQLite** (archivo `server/data/trivia.db`).

Crea 3 tablas al iniciar:
- `questions` – preguntas guardadas via API
- `rooms` – registro de salas creadas
- `players` – jugadores y puntajes por sala

> **Nota:** Las preguntas del juego en vivo están hardcodeadas en `index.js`, no en SQLite. La base de datos existe para una futura funcionalidad de agregar preguntas via API.

---

### `client/src/main.jsx`
Punto de entrada de React. Monta el componente `<App />` en el `div#root` del HTML.

---

### `client/src/App.jsx`
Define las dos rutas principales con React Router:
- `/` → `PlayerPage` (pantalla del jugador)
- `/guide` → `GuidePage` (panel del guía)

Usa `React.lazy()` para cargar cada página solo cuando se accede a ella, evitando que ambas páginas conecten sockets simultáneamente.

---

### `client/src/App.css`
Contiene **todos los estilos** del proyecto (no hay módulos CSS separados). Organizado en secciones:
- Estilos base y componentes reutilizables (`.container`, `.btn`, `.input`, `.avatar`)
- Pantalla de juego del jugador (`.game-screen`, `.game-header`, `.time-bar`, `.game-body`)
- Botones de respuesta opción múltiple (`.options-grid`, `.option-card`) y V/F (`.options-tf`, `.tf-btn`)
- Scoreboard del guía (`.guide-scoreboard`, `.scoreboard-row`)
- Selector de categorías del guía (`.cat-grid`, `.cat-btn`)
- Personajes animados (`.chars-layer`, `.char-1` … `.char-5`, keyframes)
- Soporte para **notch/safe-area** de iPhone con `env(safe-area-inset-*)`

---

### `client/src/config/categories.js`
Configuración visual de las 5 categorías del juego. Exporta:
- `CATEGORIES` – objeto con la config de cada categoría: `label`, `icon` (emoji), `headerColor`, `gradient` y `image` (null por ahora, listo para agregar fondos)
- `DEFAULT_THEME` – tema genérico para cuando no hay categoría
- `getTheme(categoryKey)` – devuelve el tema correspondiente o el default

Para agregar una imagen de fondo en el futuro: copiá el archivo a `client/public/backgrounds/` y cambiá `image: null` por `image: '/backgrounds/nombre.jpg'` en la categoría correspondiente.

---

### `client/src/pages/PlayerPage.jsx`
Interfaz completa del **jugador** con 4 pantallas:
1. **Home** – formulario de nombre + código de sala
2. **Waiting room** – espera a que el guía inicie
3. **Gameplay** – muestra la pregunta con temporizador de 20 segundos, botones de respuesta coloreados estilo Kahoot, personaje animado al fondo
4. **Leaderboard** – resultados finales ordenados por puntaje

Detalles técnicos:
- Timer en décimas de segundo (200 ticks → 20 segundos), actualizado cada 100ms
- Detecta automáticamente si la pregunta es V/F (2 opciones) o múltiple choice (4 opciones)
- Emite `question-timeout` si el tiempo llega a 0 sin responder
- El personaje animado cambia aleatoriamente con cada pregunta (sin repetir el anterior)

---

### `client/src/pages/GuidePage.jsx`
Panel del **guía** con 4 pantallas:
1. **Setup** – ingresa su nombre y crea la sala
2. **Waiting room** – muestra el código de sala, selector de categorías (multi-selección), lista de jugadores conectados y botón para iniciar
3. **Scoreboard en tiempo real** – durante el juego muestra la pregunta actual, quién respondió (✓/·) y el puntaje de cada jugador actualizado después de cada pregunta
4. **Leaderboard final** – resultados con medallas 🥇🥈🥉

El tema visual (colores, íconos) del scoreboard cambia con cada pregunta según su categoría.

---

## 🔌 Eventos Socket.io (referencia rápida)

| Evento | Dirección | Descripción |
|---|---|---|
| `create-room` | Cliente → Servidor | Guía crea sala |
| `room-created` | Servidor → Guía | Código de sala generado |
| `join-room` | Cliente → Servidor | Jugador se une |
| `joined-room` | Servidor → Jugador | Confirmación de unión |
| `room-updated` | Servidor → Sala | Lista de jugadores actualizada |
| `start-game` | Guía → Servidor | Inicia el juego con categorías |
| `game-started` | Servidor → Sala | Primera pregunta + total |
| `answer` | Jugador → Servidor | Respuesta con tiempo restante |
| `player-answered` | Servidor → Sala | Notifica que un jugador respondió |
| `question-timeout` | Jugador → Servidor | Se acabó el tiempo |
| `question-results` | Servidor → Sala | Respuesta correcta + puntajes |
| `next-question` | Servidor → Sala | Siguiente pregunta (tras 3s) |
| `game-finished` | Servidor → Sala | Leaderboard final |
| `room-closed` | Servidor → Sala | El guía se desconectó |

---

## 🛠️ Scripts disponibles

| Comando | Desde | Descripción |
|---|---|---|
| `npm run dev` | Raíz | Levanta servidor + cliente juntos |
| `npm run dev:server` | Raíz | Solo el servidor (con hot-reload) |
| `npm run dev:client` | Raíz | Solo el cliente (Vite) |
| `npm run build` | Raíz | Build de producción del cliente |
| `npm run dev` | `server/` | Servidor con `--watch` (auto-restart) |
| `npm run dev` | `client/` | Cliente con Vite HMR |
