(function () {
  let didInit = false;
  let callbacksRef = null;

  function isAvailable() {
    return typeof window !== "undefined" && typeof window.netlifyIdentity !== "undefined";
  }

  function init(callbacks) {
    callbacksRef = callbacks || {};

    if (!isAvailable()) {
      if (callbacksRef.onReady) callbacksRef.onReady(null);
      return;
    }

    if (didInit) {
      if (callbacksRef.onReady) callbacksRef.onReady(getCurrentUser());
      return;
    }

    didInit = true;

    window.netlifyIdentity.on("init", function (user) {
      if (callbacksRef && callbacksRef.onReady) callbacksRef.onReady(user || null);
    });

    window.netlifyIdentity.on("login", function (user) {
      window.netlifyIdentity.close();
      if (callbacksRef && callbacksRef.onChange) callbacksRef.onChange(user || null, "login");
    });

    window.netlifyIdentity.on("logout", function () {
      if (callbacksRef && callbacksRef.onChange) callbacksRef.onChange(null, "logout");
    });

    window.netlifyIdentity.on("error", function (error) {
      if (callbacksRef && callbacksRef.onError) callbacksRef.onError(error);
    });

    window.netlifyIdentity.init();
  }

  function open() {
    if (!isAvailable()) {
      throw new Error("Netlify Identity non disponibile su questa pagina.");
    }

    window.netlifyIdentity.open();
  }

  async function logout() {
    const user = getCurrentUser();
    if (!user) return;

    if (typeof user.logout === "function") {
      await user.logout();
      return;
    }

    if (typeof window.netlifyIdentity.logout === "function") {
      await window.netlifyIdentity.logout();
    }
  }

  function getCurrentUser() {
    if (!isAvailable() || typeof window.netlifyIdentity.currentUser !== "function") return null;
    return window.netlifyIdentity.currentUser();
  }

  async function getAccessToken(user) {
    const currentUser = user || getCurrentUser();
    if (!currentUser || typeof currentUser.jwt !== "function") return null;
    return currentUser.jwt();
  }
function getDisplayName(user) {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return "Ospite";

  const userMetadata = currentUser.user_metadata || {};
  const appMetadata = currentUser.app_metadata || {};

  const candidates = [
    userMetadata.full_name,
    userMetadata.fullName,
    userMetadata.name,
    userMetadata.display_name,
    userMetadata.displayName,
    [userMetadata.first_name, userMetadata.last_name].filter(Boolean).join(" ").trim(),
    appMetadata.full_name,
    appMetadata.name,
    currentUser.full_name,
    currentUser.fullName,
    currentUser.name,
    currentUser.display_name,
    currentUser.displayName
  ];

  const explicitName = candidates.find(function (value) {
    return typeof value === "string" && value.trim().length > 0;
  });

  if (explicitName) return explicitName.trim();

  if (typeof currentUser.email === "string" && currentUser.email.includes("@")) {
    return currentUser.email.split("@")[0];
  }

  return "Utente";
}


  window.Taccuino = window.Taccuino || {};
  window.Taccuino.auth = {
    init,
    isAvailable,
    open,
    logout,
    getCurrentUser,
    getAccessToken,
    getDisplayName
  };
})();
