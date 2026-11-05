/**
 * Keeps --app-w / --app-h on <html> equal to the area actually visible to the player:
 * the smaller of the document's client size and the visual viewport (which shrinks when a
 * phone's address bar or navigation bar is showing). 100vh would include those bars.
 */
export function installViewportVars(): void {
  const root = document.documentElement;
  const update = () => {
    const vv = window.visualViewport;
    const w = Math.min(root.clientWidth, vv ? vv.width : Infinity);
    const h = Math.min(root.clientHeight, vv ? vv.height : Infinity, window.innerHeight);
    root.style.setProperty('--app-w', `${Math.floor(w)}px`);
    root.style.setProperty('--app-h', `${Math.floor(h)}px`);
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
}
