/**
 * ThemeScript — inline script untuk set theme class secepat mungkin di <html>
 * sebelum hydration (mencegah FOUC). Dipasang di app/layout.tsx atau (app)/layout.
 *
 * Default theme: mengikuti sistem (prefers-color-scheme) saat user BELUM
 * pernah memilih. Pilihan user ('light' | 'dark') dihormati & tidak ditimpa.
 * Nilai 'system' berarti eksplisit mengikuti OS.
 */
export function ThemeScript() {
  const code = `
(function() {
  try {
    var stored = localStorage.getItem('nubuat-theme');
    var theme;
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else {
      // Belum ada pilihan tersimpan (atau 'system') → ikuti sistem.
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />;
}
