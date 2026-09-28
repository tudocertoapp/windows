export const HERO_COLOR_KEYS = {
  nome: 'corFonteNome',
  titulo: 'corFonteTitulo',
  subtitulo: 'corFonteSubtitulo',
  slogan: 'corFonteSlogan',
};

export const HERO_FONT_KEYS = {
  nome: 'fonteNome',
  titulo: 'fonteTitulo',
  subtitulo: 'fonteSubtitulo',
  slogan: 'fonteSlogan',
};

export const CATALOGO_FONT_GROUPS = [
  { id: 'manuscrito', label: 'Manuscrito' },
  { id: 'estetica', label: 'Estética' },
  { id: 'seria', label: 'Sérias' },
];

export const CATALOGO_FONTES = [
  { id: 'system', label: 'Padrão do sistema', family: undefined, group: 'seria' },

  { id: 'dancing', label: 'Dancing Script', family: 'Dancing Script', google: 'Dancing+Script:wght@400;700', group: 'manuscrito' },
  { id: 'great-vibes', label: 'Great Vibes', family: 'Great Vibes', google: 'Great+Vibes', group: 'manuscrito' },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico', google: 'Pacifico', group: 'manuscrito' },
  { id: 'satisfy', label: 'Satisfy', family: 'Satisfy', google: 'Satisfy', group: 'manuscrito' },
  { id: 'allura', label: 'Allura', family: 'Allura', google: 'Allura', group: 'manuscrito' },
  { id: 'sacramento', label: 'Sacramento', family: 'Sacramento', google: 'Sacramento', group: 'manuscrito' },
  { id: 'alex-brush', label: 'Alex Brush', family: 'Alex Brush', google: 'Alex+Brush', group: 'manuscrito' },
  { id: 'caveat', label: 'Caveat', family: 'Caveat', google: 'Caveat:wght@400;700', group: 'manuscrito' },
  { id: 'homemade', label: 'Homemade Apple', family: 'Homemade Apple', google: 'Homemade+Apple', group: 'manuscrito' },
  { id: 'indie', label: 'Indie Flower', family: 'Indie Flower', google: 'Indie+Flower', group: 'manuscrito' },
  { id: 'shadows', label: 'Shadows Into Light', family: 'Shadows Into Light', google: 'Shadows+Into+Light', group: 'manuscrito' },
  { id: 'marck', label: 'Marck Script', family: 'Marck Script', google: 'Marck+Script', group: 'manuscrito' },
  { id: 'amatic', label: 'Amatic SC', family: 'Amatic SC', google: 'Amatic+SC:wght@400;700', group: 'manuscrito' },

  { id: 'playfair', label: 'Playfair Display', family: 'Playfair Display', google: 'Playfair+Display:wght@400;700', group: 'estetica' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: 'Cormorant Garamond', google: 'Cormorant+Garamond:wght@400;700', group: 'estetica' },
  { id: 'cinzel', label: 'Cinzel', family: 'Cinzel', google: 'Cinzel:wght@400;700', group: 'estetica' },
  { id: 'italiana', label: 'Italiana', family: 'Italiana', google: 'Italiana', group: 'estetica' },
  { id: 'poiret', label: 'Poiret One', family: 'Poiret One', google: 'Poiret+One', group: 'estetica' },
  { id: 'josefin', label: 'Josefin Sans', family: 'Josefin Sans', google: 'Josefin+Sans:wght@400;700', group: 'estetica' },
  { id: 'tenor', label: 'Tenor Sans', family: 'Tenor Sans', google: 'Tenor+Sans', group: 'estetica' },
  { id: 'yeseva', label: 'Yeseva One', family: 'Yeseva One', google: 'Yeseva+One', group: 'estetica' },
  { id: 'abril', label: 'Abril Fatface', family: 'Abril Fatface', google: 'Abril+Fatface', group: 'estetica' },
  { id: 'unna', label: 'Unna', family: 'Unna', google: 'Unna:wght@400;700', group: 'estetica' },
  { id: 'cardo', label: 'Cardo', family: 'Cardo', google: 'Cardo:wght@400;700', group: 'estetica' },
  { id: 'parisienne', label: 'Parisienne', family: 'Parisienne', google: 'Parisienne', group: 'estetica' },
  { id: 'philosopher', label: 'Philosopher', family: 'Philosopher', google: 'Philosopher:wght@400;700', group: 'estetica' },

  { id: 'inter', label: 'Inter', family: 'Inter', google: 'Inter:wght@400;700', group: 'seria' },
  { id: 'roboto', label: 'Roboto', family: 'Roboto', google: 'Roboto:wght@400;700', group: 'seria' },
  { id: 'open-sans', label: 'Open Sans', family: 'Open Sans', google: 'Open+Sans:wght@400;700', group: 'seria' },
  { id: 'lato', label: 'Lato', family: 'Lato', google: 'Lato:wght@400;700', group: 'seria' },
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', google: 'Montserrat:wght@400;700', group: 'seria' },
  { id: 'merriweather', label: 'Merriweather', family: 'Merriweather', google: 'Merriweather:wght@400;700', group: 'seria' },
  { id: 'libre', label: 'Libre Baskerville', family: 'Libre Baskerville', google: 'Libre+Baskerville:wght@400;700', group: 'seria' },
  { id: 'ibm-plex', label: 'IBM Plex Sans', family: 'IBM Plex Sans', google: 'IBM+Plex+Sans:wght@400;700', group: 'seria' },
  { id: 'work-sans', label: 'Work Sans', family: 'Work Sans', google: 'Work+Sans:wght@400;700', group: 'seria' },
  { id: 'nunito', label: 'Nunito', family: 'Nunito', google: 'Nunito:wght@400;700', group: 'seria' },
  { id: 'pt-serif', label: 'PT Serif', family: 'PT Serif', google: 'PT+Serif:wght@400;700', group: 'seria' },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', google: 'Oswald:wght@400;700', group: 'seria' },
  { id: 'raleway', label: 'Raleway', family: 'Raleway', google: 'Raleway:wght@400;700', group: 'seria' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', google: 'Poppins:wght@400;700', group: 'seria' },
];

export function getCatalogoFonte(id) {
  return CATALOGO_FONTES.find((f) => f.id === id) || CATALOGO_FONTES[0];
}

export function getHeroFontFamily(config, id) {
  const key = HERO_FONT_KEYS[id];
  if (!key) return undefined;
  return getCatalogoFonte(config?.[key]).family;
}

export function ensureCatalogoGoogleFonts() {
  if (typeof document === 'undefined') return;
  const families = CATALOGO_FONTES.filter((f) => f.google).map((f) => `family=${f.google}`).join('&');
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  let link = document.getElementById('catalogo-google-fonts');
  if (!link) {
    link = document.createElement('link');
    link.id = 'catalogo-google-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
}
