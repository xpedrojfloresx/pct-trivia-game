/**
 * Servicio de traducción automática usando MyMemory API (gratuita, sin API key).
 * Límite: ~5000 caracteres/día por IP (más que suficiente para una sesión de museo).
 * Los resultados se cachean en memoria para no repetir llamadas.
 */

const cache = new Map();

/**
 * Traduce un texto de español al idioma destino.
 * Si el idioma es 'es' o la traducción falla, devuelve el texto original.
 */
async function translateText(text, targetLang) {
  if (!text || targetLang === 'es') return text;

  const key = `${targetLang}|${text}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|${targetLang}`
    );
    const data = await res.json();
    if (data.responseStatus === 200) {
      const result = data.responseData.translatedText;
      cache.set(key, result);
      return result;
    }
  } catch {
    // Sin conexión o límite superado → devuelve original
  }

  return text;
}

/**
 * Traduce la pregunta completa (texto + todas las opciones) en paralelo.
 * Devuelve un nuevo objeto con los campos traducidos.
 */
export async function translateQuestion(question, targetLang) {
  if (targetLang === 'es' || !question) return question;

  const [translatedText, ...translatedOptions] = await Promise.all([
    translateText(question.question, targetLang),
    ...question.options.map(opt => translateText(opt, targetLang)),
  ]);

  return {
    ...question,
    question: translatedText,
    options: translatedOptions,
  };
}
