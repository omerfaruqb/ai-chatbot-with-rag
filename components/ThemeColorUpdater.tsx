"use client";

import { useEffect } from 'react';

export default function ThemeColorUpdater() {
  useEffect(() => {
    const html = document.documentElement;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }

    const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
    const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';

    function updateThemeColor() {
      const isDark = html.classList.contains('dark');
      (meta as HTMLMetaElement).setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }

    const observer = new MutationObserver(updateThemeColor);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    updateThemeColor();

    return () => observer.disconnect();
  }, []);

  return null;
}
