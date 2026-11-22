import fontCss from '@fontsource-variable/noto-serif-sc/wght.css?inline';

// Use the requested public family name with the existing complete variable font.
// The CSS and WOFF2 shards are loaded only as the footer approaches the viewport.
export async function loadFooterSerif() {
  if (!document.getElementById('reverian-footer-serif')) {
    const style = document.createElement('style');
    style.id = 'reverian-footer-serif';
    style.textContent = fontCss.replaceAll('Noto Serif SC Variable', 'Noto Serif SC');
    document.head.append(style);
  }
  const targets = document.querySelectorAll<HTMLElement>('.about-excerpt,.about-lead,.about-btn,.social-name,.social-handle,.social-section h2,.social-section h3');
  await Promise.all([...targets].map(element => {
    const style = getComputedStyle(element);
    return document.fonts.load(`${style.fontWeight} ${style.fontSize} "Noto Serif SC"`, element.textContent || '');
  }));
  await document.fonts.ready;
}
