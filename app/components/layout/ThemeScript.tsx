/**
 * ThemeScript — inline script untuk set theme class secepat mungkin di <html>
 * sebelum hydration (mencegah FOUC). Dipasang di app/layout.tsx atau (app)/layout.
 *
 * Default theme: dark (per spec MVP). User dapat override via localStorage.
 */
export function ThemeScript() {
  const code = `
(function() {
  try {
    var stored = localStorage.getItem('nubuat-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />;
}
