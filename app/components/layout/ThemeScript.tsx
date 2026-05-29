/**
 * ThemeScript — inline script untuk set theme class secepat mungkin di <html>
 * sebelum hydration (mencegah FOUC). Dipasang di app/layout.tsx atau (app)/layout.
 *
 * Default theme: DARK (brand dark-first) saat user BELUM pernah memilih.
 * Pilihan user ('light' | 'dark') dihormati & tidak ditimpa. Nilai 'system'
 * (dipilih eksplisit lewat toggle) berarti mengikuti OS (prefers-color-scheme).
 */
export function ThemeScript() {
  const code = `
(function() {
  try {
    var stored = localStorage.getItem('nubuat-theme');
    var theme;
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (stored === 'system') {
      // User memilih 'system' secara eksplisit → ikuti OS.
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      // Belum ada pilihan tersimpan → default brand: dark.
      theme = 'dark';
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
