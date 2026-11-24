/**
 * TapWap Stealth & Cloaking Engine
 * Handles Tab Cloaking, Panic Key, and about:blank launch
 */
(function () {
  'use strict';

  // 1. Tab Cloaking Implementation
  function applyCloak() {
    try {
      const cloakTitle = localStorage.getItem('tapwap_cloak_title');
      const cloakIcon = localStorage.getItem('tapwap_cloak_icon');

      if (cloakTitle && cloakTitle.trim() !== '') {
        document.title = cloakTitle;
      }

      if (cloakIcon && cloakIcon.trim() !== '') {
        // Remove existing favicon links to prevent caching collisions
        const existingLinks = document.querySelectorAll("link[rel*='icon']");
        existingLinks.forEach(function (el) {
          el.remove();
        });

        // Add new cloaked favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        if (cloakIcon.endsWith('.svg') || cloakIcon.includes('image/svg+xml')) {
          link.type = 'image/svg+xml';
        } else {
          link.type = 'image/x-icon';
        }
        link.href = cloakIcon;
        document.head.appendChild(link);
      }
    } catch (e) {
      console.warn('Stealth: unable to access localStorage', e);
    }
  }

  // Run immediately in <head>
  applyCloak();

  // Re-run on DOM ready and Astro view transitions
  document.addEventListener('DOMContentLoaded', applyCloak);
  document.addEventListener('astro:page-load', applyCloak);

  // Monitor title changes (prevents Astro or page scripts from overwriting cloaked title)
  try {
    const titleObserver = new MutationObserver(function () {
      const cloakTitle = localStorage.getItem('tapwap_cloak_title');
      if (cloakTitle && document.title !== cloakTitle) {
        document.title = cloakTitle;
      }
    });

    const titleEl = document.querySelector('title');
    if (titleEl) {
      titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  } catch (e) {}


  // 3. Global about:blank Launcher Helper
  window.openInAboutBlank = function (targetUrl, overrideTitle, overrideIcon) {
    const url = targetUrl || window.location.href;
    const win = window.open('about:blank', '_blank');
    if (!win) {
      alert('Pop-up was blocked! Please allow pop-ups for this site in your browser.');
      return false;
    }

    try {
      const defaultChromeGlobeIcon = window.location.origin + '/assets/images/chrome-globe.svg';
      const cloakTitle = overrideTitle || localStorage.getItem('tapwap_cloak_title') || 'about:blank';
      const cloakIcon = overrideIcon || localStorage.getItem('tapwap_cloak_icon') || defaultChromeGlobeIcon;
      const isSvg = cloakIcon.endsWith('.svg') || cloakIcon.includes('image/svg+xml');

      win.document.open();
      win.document.write('<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <title>' + cloakTitle + '</title>' +
'  <link rel="icon" type="' + (isSvg ? 'image/svg+xml' : 'image/x-icon') + '" href="' + cloakIcon + '">' +
'  <style>' +
'    * { box-sizing: border-box; }' +
'    html, body {' +
'      margin: 0;' +
'      padding: 0;' +
'      width: 100%;' +
'      height: 100%;' +
'      overflow: hidden;' +
'      background: #0b0f19;' +
'    }' +
'    iframe {' +
'      border: none;' +
'      width: 100%;' +
'      height: 100%;' +
'      margin: 0;' +
'      padding: 0;' +
'      display: block;' +
'    }' +
'  </style>' +
'</head>' +
'<body>' +
'  <iframe src="' + url + '"></iframe>' +
'</body>' +
'</html>');
      win.document.close();
      return true;
    } catch (e) {
      console.error('Failed to inject stealth iframe into about:blank window', e);
      try {
        win.location.href = url;
      } catch (err) {}
      return true;
    }
  };

  // 3. Global PokiSDK & CommercialBreak Fallbacks (Universal Safety Net)
  function createSafeBreak(name) {
    return function(fn) {
      console.log('[Stealth SafeHook] ' + name + ' called');
      if (typeof fn === 'function') {
        try { fn(true); } catch(e) {}
      }
      return Promise.resolve(true);
    };
  }
  var safeComm = createSafeBreak('commercialBreak');
  var safeRew = createSafeBreak('rewardedBreak');

  if (typeof window.commercialBreak !== 'function') window.commercialBreak = safeComm;
  if (typeof window.rewardedBreak !== 'function') window.rewardedBreak = safeRew;

  window.PokiSDK = window.PokiSDK || {};
  if (!window.PokiSDK.commercialBreak) window.PokiSDK.commercialBreak = safeComm;
  if (!window.PokiSDK.rewardedBreak) window.PokiSDK.rewardedBreak = safeRew;
  if (!window.PokiSDK.init) window.PokiSDK.init = function() { return Promise.resolve(); };
  if (!window.PokiSDK.gameplayStart) window.PokiSDK.gameplayStart = function() {};
  if (!window.PokiSDK.gameplayStop) window.PokiSDK.gameplayStop = function() {};
  if (!window.PokiSDK.gameLoadingStart) window.PokiSDK.gameLoadingStart = function() {};
  if (!window.PokiSDK.gameLoadingFinished) window.PokiSDK.gameLoadingFinished = function() {};
  if (!window.PokiSDK.displayAd) window.PokiSDK.displayAd = function() { return Promise.resolve(); };
  if (!window.PokiSDK.destroyAd) window.PokiSDK.destroyAd = function() {};
})();
