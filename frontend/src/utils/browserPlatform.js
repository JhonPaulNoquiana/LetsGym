export function isAppleMobileBrowser(browser = {}) {
  return /iPhone|iPad|iPod/.test(browser.userAgent || '') ||
    (browser.platform === 'MacIntel' && browser.maxTouchPoints > 1);
}
