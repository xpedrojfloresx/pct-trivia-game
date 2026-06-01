# Changelog

---

## [2026-06-01] — Sesión de desarrollo

### Panel de Admin de Preguntas (`/admin`)

Se armó un panel completo para gestionar las preguntas del juego sin tener que tocar el código. Antes las 56 preguntas estaban hardcodeadas en `server/index.js` y si querías cambiar algo tenías que meterte al código. Ahora están en SQLite y se manejan desde la UI.

**Qué se puede hacer:**
- Ver todas las preguntas con filtro por categoría (FUEGO, AIRE, AGUA, TIERRA, BONUS)
- Crear preguntas nuevas — múltiple choice (4 opciones) o Verdadero/Falso
- Editar cualquier pregunta existente
- Eliminar con confirmación

**Cómo entrar:** ir a `/admin` en el navegador. La contraseña por defecto es `trivia-admin` (se cambia en `server/.env`).

**Detalle técnico:** al arrancar el servidor por primera vez con la base de datos vacía, seedea automáticamente las 56 preguntas originales. Si la base ya existe pero está mal migrada (todas con categoría BONUS por default), detecta el problema y re-seedea solo.

---

### Código QR Automático

Cuando el guía crea una sala, ahora aparece un QR abajo del código. El visitante lo escanea con el celu y entra directo a la pantalla de unirse con el código pre-cargado — sin tener que tipear nada. El QR usa `window.location.origin` así que funciona tanto en la red local del museo como en producción con dominio propio, sin configuración extra.

---

### Límite de Jugadores por Sala

En la pantalla de setup del guía hay un stepper para configurar el máximo de jugadores (por defecto 30, rango 2–100). Si la sala está llena y alguien más intenta entrar, le aparece un mensaje indicando que no hay lugar. El guía ve un badge "X / Y" que se pone rojo cuando la sala está completa.

---

### Logo Banner en Pantalla del Guía

El banner rotatorio con los logos del Gobierno de Córdoba, Ministerio de Educación y UNC que ya estaba en la pantalla del jugador ahora también aparece en todas las pantallas del guía. Además, en iPhones con Dynamic Island o notch, un div fijo de 8px del mismo color negro tapa esa zona para que no se vea el fondo gris del sistema.

---

### Reconexión Automática de Jugadores

Si a un jugador se le cae el WiFi durante el juego, cuando reconecta socket.io dispara automáticamente un evento `reconnect-room` con los datos de la sesión guardados en sessionStorage. El servidor lo devuelve a la partida con su nombre y puntaje intactos. Ya no pierde todo si se le va la señal un momento.

---

### Salas Vacías Durante el Juego

Si todos los jugadores se desconectan mientras el juego está corriendo, el servidor ya no queda colgado esperando respuestas. Detecta la situación y avanza la pregunta solo.

---

### Sonidos y Vibración

En mobile:
- Al tocar una opción: vibración corta (20ms) + beep suave
- Respuesta correcta: dos tonos ascendentes + vibración doble
- Respuesta incorrecta: tono grave descendente + vibración triple

Todo usando la Web Audio API y la Vibration API del navegador, sin archivos de audio externos.

---

### Modo Kiosk

Para que el juego se sienta más como una app nativa en el museo:
- Deshabilitado el zoom por pinch (`user-scalable=no`)
- Sin menú contextual al mantener presionado (`-webkit-touch-callout: none`)
- Sin el highlight azul al tocar elementos (`-webkit-tap-highlight-color: transparent`)
- Doble-tap zoom bloqueado en botones (`touch-action: manipulation`)

---

### Limpieza de Salas Inactivas

El servidor ahora tiene un intervalo que corre cada 30 minutos y elimina de memoria las salas con más de 2 horas de antigüedad. Antes, si el guía cerraba la pestaña sin que el juego termine, la sala quedaba en memoria del servidor para siempre.

---

### Scroll en Pantallas del Guía

La sala de espera, el scoreboard y el leaderboard final del guía ahora permiten scroll vertical. Era necesario especialmente en la sala de espera donde ahora hay más contenido (QR + categorías + lista de jugadores).

---

### Otros ajustes menores

- El guía ya no necesita ingresar su nombre para crear la sala — no se usaba en ningún lado
- El QR usa `window.location.origin` para funcionar en cualquier entorno sin configuración
- Cleanup del `.gitignore` para excluir carpetas de herramientas de IA (`.claude/`, `.claude-flow/`)
