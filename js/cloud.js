(function () {
  const USER_NOTES_ENDPOINT = "/.netlify/functions/user-notes";

  async function fetchRemoteNotes(user) {
    const token = await getToken(user);
    const response = await fetch(USER_NOTES_ENDPOINT, {
      method: "GET",
      headers: buildHeaders(token)
    });

    if (!response.ok) {
      throw await createRequestError(response, "Impossibile caricare le note dall'account.");
    }

    const payload = await response.json();
    return window.Taccuino.notes.normalizeNotes((payload && payload.notes) || []);
  }

  async function pushNotes(user, notes) {
    const token = await getToken(user);
    const response = await fetch(USER_NOTES_ENDPOINT, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ notes })
    });

    if (!response.ok) {
      throw await createRequestError(response, "Impossibile salvare le note sul cloud.");
    }

    const payload = await response.json();
    return window.Taccuino.notes.normalizeNotes((payload && payload.notes) || notes);
  }

  async function syncNotes(user, localNotes) {
    const remoteNotes = await fetchRemoteNotes(user);
    const mergedNotes = window.Taccuino.notes.mergeCollections([remoteNotes, localNotes]);
    const savedNotes = await pushNotes(user, mergedNotes);
    return savedNotes;
  }

  async function getToken(user) {
    const authApi = window.Taccuino.auth;
    const token = await authApi.getAccessToken(user);
    if (!token) {
      throw new Error("Token utente non disponibile.");
    }
    return token;
  }

  function buildHeaders(token) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  }

  async function createRequestError(response, fallbackMessage) {
    let message = fallbackMessage;

    try {
      const payload = await response.json();
      if (payload && payload.error) {
        message = payload.error;
      }
    } catch (error) {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch (secondError) {
        console.error(secondError);
      }
    }

    return new Error(message);
  }

  window.Taccuino = window.Taccuino || {};
  window.Taccuino.cloud = {
    fetchRemoteNotes,
    pushNotes,
    syncNotes
  };
})();
