/**
 * Configuración visual de cada categoría.
 *
 * Para agregar una imagen de fondo en el futuro:
 *   1. Copiá el archivo a client/public/backgrounds/fuego.jpg  (u otro formato)
 *   2. Cambiá `image: null` por `image: '/backgrounds/fuego.jpg'`
 *   El componente ya está listo para usarla automáticamente.
 */

export const CATEGORIES = {
  FUEGO: {
    label:       'Fuego',
    icon:        '🔥',
    headerColor: '#c0392b',
    gradient:    'linear-gradient(170deg, #ffb347 0%, #e74c3c 50%, #7b241c 100%)',
    image:       '/backgrounds/Fuego.jpg',
    bgSize: 'cover', 
    bgPosition: 'center',
  },
  AIRE: {
    label:       'Aire',
    icon:        '🌪️',
    headerColor: '#00838f',
    gradient:    'linear-gradient(170deg, #e0f7fa 0%, #00bcd4 50%, #006064 100%)',
    image:       null,
    bgSize: 'cover', 
    bgPosition: 'center',
  },
  AGUA: {
    label:       'Agua',
    icon:        '🌊',
    headerColor: '#01579b',
    gradient:    'linear-gradient(170deg, #b3e5fc 0%, #0288d1 50%, #01579b 100%)',
    image:       '/backgrounds/Agua.png',
    bgSize: 'cover', 
    bgPosition: 'center',
  },
  TIERRA: {
    label:       'Tierra',
    icon:        '🌿',
    headerColor: '#5d4037',
    gradient:    'linear-gradient(170deg, #c8e6c9 0%, #4caf50 40%, #5d4037 100%)',
    image:       '/backgrounds/Tierra.png',
    bgSize: 'cover', 
    bgPosition: 'center',
  },
  BONUS: {
    label:       'Bonus',
    icon:        '⭐',
    headerColor: '#6a1b9a',
    gradient:    'linear-gradient(135deg, #ffe082 0%, #ff8f00 40%, #6a1b9a 100%)',
    image:       null,
    bgSize: 'cover', 
    bgPosition: 'center',
  },
};

export const DEFAULT_THEME = {
  label:       'Trivia',
  icon:        '🎮',
  headerColor: '#1abc9c',
  gradient:    'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  image:       null,
};

export function getTheme(categoryKey) {
  return CATEGORIES[categoryKey] ?? DEFAULT_THEME;
}
