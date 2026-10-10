// Applies the saved theme before the first paint, so screens shown before the app unlocks
// match it. Loaded as a blocking classic script (an inline one would break the CSP); keep the
// key and colors in sync with src/utils/theme.js.
(function () {
  var dark = false;
  try {
    dark = localStorage.getItem('themePreference') === 'dark';
  } catch (error) {
    // Storage can be unavailable (e.g. blocked site data); fall back to light.
  }
  var root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.backgroundColor = dark ? '#10101e' : '#ffffff';
})();
