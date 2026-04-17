(function () {
  let deferredPrompt = null;

  function registerServiceWorker() {
    if (window.location.protocol === "file:") return;
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
        console.error("Registrazione service worker fallita:", error);
      });
    });
  }

  function setupInstallPrompt(installButton) {
    if (!installButton) return;

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredPrompt = event;
      installButton.classList.remove("hidden");
    });

    installButton.addEventListener("click", async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (error) {
        console.error("Prompt installazione non completato:", error);
      }
      deferredPrompt = null;
      installButton.classList.add("hidden");
    });

    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      installButton.classList.add("hidden");
    });
  }

  window.Taccuino = window.Taccuino || {};
  window.Taccuino.pwa = {
    registerServiceWorker,
    setupInstallPrompt
  };
})();
