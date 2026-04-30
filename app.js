(function () {
  'use strict';

  function detectWebView() {
    var ua = navigator.userAgent || '';
    var uaData = navigator.userAgentData || null;
    var brands = '';
    var platform = '';

    if (uaData && Array.isArray(uaData.brands)) {
      brands = uaData.brands.map(function (b) {
        return b.brand + ' ' + b.version;
      }).join(' | ');
    }

    if (uaData && typeof uaData.platform === 'string') {
      platform = uaData.platform;
    }

    var isAndroid = /Android/i.test(ua) || /Android/i.test(platform);
    var hasChromeUA = /Chrome\/\d|Chromium\/\d/i.test(ua);
    var hasSamsungBrowser = /SamsungBrowser\/\d/i.test(ua);
    var inAppBrowserPattern = /(FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|TikTok|Snapchat|Twitter|TwitterAndroid|LinkedInApp|Discord|Slack|WeChat|Weibo|Pinterest|GSA|KAKAOTALK|NAVER)/i;

    var signals = {
      isAndroid: isAndroid,
      hasWvFlag: /\bwv\b/.test(ua),
      hasJavaBridge: typeof window.Android !== 'undefined' ||
        typeof window.ReactNativeWebView !== 'undefined' ||
        typeof window.flutter_inappwebview !== 'undefined' ||
        typeof window.FlutterInAppWebView !== 'undefined',
      hasAndroidWebViewBrand: /Android WebView/i.test(brands),
      hasWebViewVersion: isAndroid && /Version\/\d+\./.test(ua) && hasChromeUA,
      hasInAppBrowserToken: inAppBrowserPattern.test(ua),
      missingChromeRuntime: isAndroid && hasChromeUA && !hasSamsungBrowser && !(window.chrome && window.chrome.runtime),
      noSafariInUA: isAndroid && hasChromeUA && !/Safari/.test(ua)
    };

    var strongScore = 0;
    var weakScore = 0;

    if (signals.hasJavaBridge) strongScore += 1;
    if (signals.hasAndroidWebViewBrand) strongScore += 1;
    if (signals.hasWvFlag) strongScore += 1;
    if (signals.hasWebViewVersion) strongScore += 1;

    if (signals.missingChromeRuntime) weakScore += 1;
    if (signals.noSafariInUA) weakScore += 1;
    if (signals.hasInAppBrowserToken) weakScore += 1;

    var score = strongScore * 2 + weakScore;
    var isWebView = isAndroid && (strongScore >= 1 || weakScore >= 2);

    return {
      isWebView: isWebView,
      score: score,
      signals: signals,
      userAgent: ua,
      userAgentBrands: brands,
      userAgentPlatform: platform
    };
  }

  function addRow(container, label, value) {
    var row = document.createElement('div');
    row.className = 'wv-diag-row';

    var labelSpan = document.createElement('span');
    labelSpan.className = 'wv-diag-label';
    labelSpan.textContent = label;

    var statusSpan = document.createElement('span');
    statusSpan.className = 'wv-diag-status ' + (value ? 'ok' : 'miss');
    statusSpan.textContent = value ? 'met' : 'not met';

    row.appendChild(labelSpan);
    row.appendChild(statusSpan);
    container.appendChild(row);
  }

  function addStickyRow(container, label, value) {
    var row = document.createElement('div');
    row.className = 'ua-sticky-row';

    var labelSpan = document.createElement('span');
    labelSpan.className = 'ua-sticky-label';
    labelSpan.textContent = label;

    var valueSpan = document.createElement('span');
    valueSpan.className = 'ua-sticky-value';
    valueSpan.textContent = value || 'n/a';

    row.appendChild(labelSpan);
    row.appendChild(valueSpan);
    container.appendChild(row);
  }

  function renderDiagnostics(container, data) {
    container.textContent = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'wv-diag';

    var header = document.createElement('div');
    header.className = 'wv-diag-header';

    var pill = document.createElement('span');
    pill.className = 'wv-diag-pill ' + (data.isWebView ? 'is-blocked' : 'is-safe');
    pill.textContent = data.isWebView ? 'webview detected' : 'browser ok';

    var score = document.createElement('span');
    score.className = 'wv-diag-score';
    score.textContent = 'score ' + data.score;

    header.appendChild(pill);
    header.appendChild(score);

    var title = document.createElement('div');
    title.className = 'wv-diag-title';
    title.textContent = 'Detection details';

    var list = document.createElement('div');
    list.className = 'wv-diag-list';

    addRow(list, 'Android platform', data.signals.isAndroid);
    addRow(list, 'WebView UA flag (wv)', data.signals.hasWvFlag);
    addRow(list, 'Java bridge (Android/ReactNative/Flutter)', data.signals.hasJavaBridge);
    addRow(list, 'UA-CH Android WebView brand', data.signals.hasAndroidWebViewBrand);
    addRow(list, 'WebView Version/4.x + Chrome', data.signals.hasWebViewVersion);
    addRow(list, 'In-app browser token', data.signals.hasInAppBrowserToken);
    addRow(list, 'Missing window.chrome.runtime', data.signals.missingChromeRuntime);
    addRow(list, 'Safari token missing in UA', data.signals.noSafariInUA);

    wrapper.appendChild(header);
    wrapper.appendChild(title);
    wrapper.appendChild(list);

    container.appendChild(wrapper);
  }

  function renderStickyUA(data) {
    var existing = document.getElementById('ua-sticky');
    var bar = existing || document.createElement('div');

    bar.id = 'ua-sticky';
    bar.className = 'ua-sticky';

    var inner = document.createElement('div');
    inner.className = 'ua-sticky-inner';

    addStickyRow(inner, 'User agent', data.userAgent);
    addStickyRow(inner, 'UA brands', data.userAgentBrands);
    addStickyRow(inner, 'UA platform', data.userAgentPlatform);

    bar.textContent = '';
    bar.appendChild(inner);

    if (!existing) {
      document.body.insertBefore(bar, document.body.firstChild);
    }

    requestAnimationFrame(function () {
      document.body.style.setProperty('--ua-sticky-offset', bar.offsetHeight + 'px');
    });
  }

  function getPageUrl() {
    var params = new URLSearchParams(window.location.search);
    var from = params.get('from');

    if (from) {
      if (/^https?:\/\//i.test(from)) {
        return from;
      }
      return window.location.origin + from;
    }

    return window.location.origin;
  }

  function init() {
    var data = detectWebView();
    var page = document.documentElement.getAttribute('data-page') || '';

    if (page === 'home' && data.isWebView) {
      var from = window.location.pathname + window.location.search + window.location.hash;
      window.location.replace('blocked.html?from=' + encodeURIComponent(from));
      return;
    }

    renderStickyUA(data);

    var diagnostics = document.getElementById('diagnostics');
    if (diagnostics) {
      renderDiagnostics(diagnostics, data);
    }

    if (page === 'blocked') {
      var chromeLink = document.getElementById('open-chrome');
      var pageUrl = getPageUrl();

      if (chromeLink) {
        var cleanUrl = pageUrl.replace(/^https?:\/\//i, '');
        var intent = cleanUrl
          ? 'intent://' + cleanUrl + '#Intent;scheme=https;package=com.android.chrome;end'
          : 'https://www.google.com/chrome/';

        chromeLink.setAttribute('href', intent);
        chromeLink.style.display = 'inline-flex';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
