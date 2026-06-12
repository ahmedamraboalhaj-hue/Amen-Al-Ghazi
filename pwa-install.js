(function () {
  const DISMISSED_KEY = 'alamin_pwa_install_dismissed';
  let deferredInstallPrompt = null;
  const buttons = [];
  const banners = [];
  const dismissButtons = [];

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isDismissed() {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  }

  function setInstallUiVisible(visible) {
    const shouldShow = visible && !isStandalone() && !isDismissed();

    buttons.forEach((button) => {
      button.style.display = shouldShow ? 'inline-flex' : 'none';
      button.disabled = false;
      button.classList.toggle('is-ready', shouldShow);
    });

    banners.forEach((banner) => {
      banner.classList.toggle('is-ready', shouldShow);
    });
  }

  async function installApp(button) {
    if (isStandalone()) {
      setInstallUiVisible(false);
      return;
    }

    if (!deferredInstallPrompt) {
      alert('\u0627\u0641\u062a\u062d \u0627\u0644\u0645\u0646\u0635\u0629 \u0645\u0646 Chrome \u0623\u0648 Edge\u060c \u0648\u0639\u0646\u062f\u0645\u0627 \u064a\u0643\u0648\u0646 \u0627\u0644\u062a\u062b\u0628\u064a\u062a \u0645\u062a\u0627\u062d\u0627 \u0633\u064a\u0638\u0647\u0631 \u0632\u0631 \u062a\u062b\u0628\u064a\u062a \u0627\u0644\u062a\u0637\u0628\u064a\u0642.');
      return;
    }

    button.disabled = true;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    setInstallUiVisible(false);
  }

  function dismissInstallUi() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setInstallUiVisible(false);
  }

  function bindInstallUi() {
    document.querySelectorAll('[data-pwa-install]').forEach((button) => {
      if (buttons.includes(button)) return;
      buttons.push(button);
      button.style.display = 'none';
      button.addEventListener('click', () => installApp(button));
    });

    document.querySelectorAll('[data-pwa-install-banner]').forEach((banner) => {
      if (banners.includes(banner)) return;
      banners.push(banner);
    });

    document.querySelectorAll('[data-pwa-dismiss]').forEach((button) => {
      if (dismissButtons.includes(button)) return;
      dismissButtons.push(button);
      button.addEventListener('click', dismissInstallUi);
    });

    if (deferredInstallPrompt) setInstallUiVisible(true);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    bindInstallUi();
    setInstallUiVisible(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    localStorage.setItem(DISMISSED_KEY, '1');
    setInstallUiVisible(false);
  });

  window.addEventListener('DOMContentLoaded', bindInstallUi);
  window.AlAminInstallApp = {
    bind: bindInstallUi,
    show: () => setInstallUiVisible(true),
    resetDismissed: () => {
      localStorage.removeItem(DISMISSED_KEY);
      setInstallUiVisible(Boolean(deferredInstallPrompt));
    }
  };
})();
