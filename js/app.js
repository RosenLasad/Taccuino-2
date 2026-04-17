(function () {
  function boot() {
    const notesApi = window.Taccuino.notes;
    const storageApi = window.Taccuino.storage;
    const uiApi = window.Taccuino.ui;
    const pwaApi = window.Taccuino.pwa;
    const authApi = window.Taccuino.auth;
    const cloudApi = window.Taccuino.cloud;

    const dom = uiApi.getDom();
    const state = {
      notes: storageApi.loadGuestNotes(),
      searchTerm: "",
      sortBy: "updated-desc",
      categoryFilter: "all",
      currentView: "active",
      editingNoteId: null,
      authUser: null,
      syncStatus: "guest",
      syncSequence: 0
    };

    pwaApi.registerServiceWorker();
    pwaApi.setupInstallPrompt(dom.installAppBtn);

    initialize();
    renderApp();
    uiApi.updateAuthArea(dom, { user: null, syncStatus: state.syncStatus });

    authApi.init({
      onReady: handleAuthReady,
      onChange: handleAuthChange,
      onError: handleAuthError
    });

    function initialize() {
      dom.newNoteBtn.addEventListener("click", startNewNote);
      dom.emptyNewNoteBtn.addEventListener("click", startNewNote);
      dom.mobileNewNoteBtn.addEventListener("click", startNewNote);

      dom.authBtn.addEventListener("click", async function () {
        if (!authApi.isAvailable()) {
          uiApi.showToast(dom, "Per Login e sync pubblica il progetto su Netlify o usa netlify dev.");
          return;
        }

        try {
          if (state.authUser) {
            await authApi.logout();
          } else {
            authApi.open();
          }
        } catch (error) {
          console.error(error);
          uiApi.showToast(dom, "Non sono riuscito ad aprire il login Netlify.");
        }
      });

      dom.searchInput.addEventListener("input", function (event) {
        state.searchTerm = event.target.value;
        renderApp();
      });

      dom.sortSelect.addEventListener("change", function (event) {
        state.sortBy = event.target.value;
        renderApp();
      });

      dom.viewSelect.addEventListener("change", function (event) {
        state.currentView = event.target.value;
        renderApp();
      });

      dom.categoryFilter.addEventListener("change", function (event) {
        state.categoryFilter = event.target.value;
        renderApp();
      });

      dom.noteCategory.addEventListener("change", function (event) {
        dom.noteColor.value = notesApi.getDefaultColorForCategory(event.target.value);
        uiApi.syncColorPresetState(dom, dom.noteColor.value);
      });

      dom.noteColor.addEventListener("input", function (event) {
        uiApi.syncColorPresetState(dom, event.target.value);
      });

      dom.colorPresetButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          const nextColor = button.dataset.color || "#c1121f";
          dom.noteColor.value = nextColor;
          uiApi.syncColorPresetState(dom, nextColor);
        });
      });

      dom.addChecklistItemBtn.addEventListener("click", function () {
        const currentChecklist = uiApi.getChecklistFromEditor(dom);
        currentChecklist.push(uiApi.createChecklistDraftItem());
        uiApi.renderChecklistEditor(dom, currentChecklist);
      });

      dom.checklistEditor.addEventListener("click", function (event) {
        const target = event.target;
        if (!target || !target.classList || !target.classList.contains("remove-checklist-item-btn")) return;

        const row = target.closest(".checklist-row");
        if (!row) return;

        const remainingItems = uiApi
          .getChecklistFromEditor(dom)
          .filter((item) => item.id !== row.dataset.id);

        uiApi.renderChecklistEditor(dom, remainingItems);
      });

      dom.noteForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleSaveNote();
      });

      dom.cancelNoteBtn.addEventListener("click", handleCloseModal);
      dom.closeModalBtn.addEventListener("click", handleCloseModal);

      dom.archiveNoteBtn.addEventListener("click", function () {
        if (!state.editingNoteId) return;
        state.notes = notesApi.toggleArchived(state.notes, state.editingNoteId);
        persistAndRender();
        reopenEditorIfPossible(state.editingNoteId);
      });

      dom.trashNoteBtn.addEventListener("click", function () {
        if (!state.editingNoteId) return;
        const confirmed = window.confirm("Spostare questa nota nel cestino?");
        if (!confirmed) return;
        state.notes = notesApi.moveToTrash(state.notes, state.editingNoteId);
        persistAndRender();
        handleCloseModal();
        uiApi.showToast(dom, "Nota spostata nel cestino");
      });

      dom.deleteNoteBtn.addEventListener("click", function () {
        if (!state.editingNoteId) return;
        const confirmed = window.confirm("Eliminare definitivamente questa nota?");
        if (!confirmed) return;
        state.notes = notesApi.permanentlyDeleteNote(state.notes, state.editingNoteId);
        persistAndRender();
        handleCloseModal();
        uiApi.showToast(dom, "Nota eliminata definitivamente");
      });

      dom.exportNotesBtn.addEventListener("click", handleExportNotes);
      dom.importNotesBtn.addEventListener("click", function () {
        dom.importFileInput.click();
      });

      dom.importFileInput.addEventListener("change", handleImportNotes);

      uiApi.attachModalCloseListeners(dom, handleCloseModal);

      window.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !dom.modal.classList.contains("hidden")) {
          handleCloseModal();
        }
      });

      window.addEventListener("online", function () {
        if (state.authUser && (state.syncStatus === "offline" || state.syncStatus === "error")) {
          syncAuthenticatedNotes({ silent: false });
        }
      });
    }

    function renderApp() {
      const visibleNotes = notesApi.getVisibleNotes(state.notes, {
        searchTerm: state.searchTerm,
        categoryFilter: state.categoryFilter,
        currentView: state.currentView,
        sortBy: state.sortBy
      });

      uiApi.renderNotes(dom, visibleNotes, state.currentView, {
        onEdit: handleEditNote,
        onTogglePin: handleTogglePin,
        onToggleArchive: handleToggleArchive,
        onMoveToTrash: handleMoveToTrash,
        onRestore: handleRestore,
        onPermanentDelete: handlePermanentDelete
      });

      uiApi.updateSummary(dom, notesApi.getCounts(state.notes));
      uiApi.updateAuthArea(dom, { user: state.authUser, syncStatus: state.syncStatus });
    }

    function setSyncStatus(nextStatus) {
      state.syncStatus = nextStatus;
      uiApi.updateAuthArea(dom, { user: state.authUser, syncStatus: state.syncStatus });
    }

    function startNewNote() {
      state.editingNoteId = null;
      const note = notesApi.createEmptyNote();
      uiApi.fillForm(dom, note);
      uiApi.setEditorActions(dom, null);
      uiApi.openModal(dom, { isEditing: false });
      dom.noteTitle.focus();
    }

    function handleEditNote(noteId) {
      const note = notesApi.getNoteById(state.notes, noteId);
      if (!note) return;

      state.editingNoteId = noteId;
      uiApi.fillForm(dom, note);
      uiApi.setEditorActions(dom, note);
      uiApi.openModal(dom, { isEditing: true });
      dom.noteTitle.focus();
    }

    function handleTogglePin(noteId) {
      state.notes = notesApi.togglePinned(state.notes, noteId);
      persistAndRender();
    }

    function handleToggleArchive(noteId) {
      state.notes = notesApi.toggleArchived(state.notes, noteId);
      persistAndRender();
    }

    function handleMoveToTrash(noteId) {
      const confirmed = window.confirm("Spostare questa nota nel cestino?");
      if (!confirmed) return;
      state.notes = notesApi.moveToTrash(state.notes, noteId);
      persistAndRender();
    }

    function handleRestore(noteId) {
      state.notes = notesApi.restoreNote(state.notes, noteId);
      persistAndRender();
    }

    function handlePermanentDelete(noteId) {
      const confirmed = window.confirm("Eliminare definitivamente questa nota?");
      if (!confirmed) return;
      state.notes = notesApi.permanentlyDeleteNote(state.notes, noteId);
      persistAndRender();
    }

    function handleSaveNote() {
      const title = dom.noteTitle.value.trim();
      const text = dom.noteText.value.trim();
      const checklist = uiApi.getChecklistFromEditor(dom);
      const category = dom.noteCategory.value;
      const color = dom.noteColor.value;
      const pinned = Boolean(dom.notePinned.checked);

      if (!title && !text && checklist.length === 0) {
        window.alert("Aggiungi almeno un titolo, del testo o una voce nella checklist.");
        return;
      }

      const existingNote = state.editingNoteId ? notesApi.getNoteById(state.notes, state.editingNoteId) : null;
      const notePayload = {
        id: state.editingNoteId || notesApi.createId(),
        title,
        text,
        checklist,
        category,
        color,
        pinned,
        archived: existingNote ? existingNote.archived : false,
        trashed: existingNote ? existingNote.trashed : false,
        createdAt: existingNote ? existingNote.createdAt : Date.now(),
        updatedAt: Date.now()
      };

      state.notes = notesApi.upsertNote(state.notes, notePayload);
      persistAndRender();
      handleCloseModal();
      uiApi.showToast(dom, existingNote ? "Nota aggiornata" : "Nota salvata");
    }

    function handleExportNotes() {
      const fileContent = storageApi.exportNotes(state.notes);
      const dateLabel = new Date().toISOString().slice(0, 10);
      uiApi.downloadTextFile(`taccuino-export-${dateLabel}.json`, fileContent, "application/json");
      uiApi.showToast(dom, "Esportazione completata");
    }

    async function handleImportNotes(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      try {
        const rawText = await file.text();
        const importedNotes = storageApi.importNotes(rawText);
        if (!importedNotes.length) {
          window.alert("Il file non contiene note valide.");
          return;
        }

        const confirmed = window.confirm(`Importare ${importedNotes.length} note? Le note con lo stesso ID verranno aggiornate.`);
        if (!confirmed) return;

        state.notes = notesApi.mergeCollections([state.notes, importedNotes]);
        persistAndRender();
        uiApi.showToast(dom, `${importedNotes.length} note importate`);
      } catch (error) {
        console.error(error);
        window.alert("Impossibile importare il file JSON.");
      } finally {
        event.target.value = "";
      }
    }

    function reopenEditorIfPossible(noteId) {
      const note = notesApi.getNoteById(state.notes, noteId);
      if (!note) {
        handleCloseModal();
        return;
      }
      state.editingNoteId = noteId;
      uiApi.fillForm(dom, note);
      uiApi.setEditorActions(dom, note);
    }

    function handleCloseModal() {
      uiApi.closeModal(dom);
      state.editingNoteId = null;
    }

    function persistLocalNotes() {
      if (state.authUser) {
        storageApi.saveUserNotes(state.authUser.id, state.notes);
      } else {
        storageApi.saveGuestNotes(state.notes);
      }
    }

    function persistAndRender() {
      persistLocalNotes();
      renderApp();
      if (state.authUser) {
        syncAuthenticatedNotes({ silent: true });
      }
    }

    async function handleAuthReady(user) {
      if (user) {
        await activateUserSession(user, "init");
      } else {
        handleGuestSession(false);
      }
    }

    async function handleAuthChange(user, reason) {
      if (user) {
        await activateUserSession(user, reason || "login");
      } else {
        handleGuestSession(true);
      }
    }

    function handleAuthError(error) {
      console.error(error);
      uiApi.showToast(dom, "Errore nel login Netlify Identity.");
      if (state.authUser) {
        setSyncStatus(navigator.onLine ? "error" : "offline");
      }
    }

    function handleGuestSession(showMessage) {
      state.authUser = null;
      state.notes = storageApi.loadGuestNotes();
      setSyncStatus("guest");
      renderApp();
      if (showMessage) {
        uiApi.showToast(dom, "Logout effettuato. Sei tornato alle note locali del dispositivo.");
      }
    }

    async function activateUserSession(user, reason) {
      const cachedUserNotes = storageApi.loadUserNotes(user.id);
      const guestNotes = storageApi.loadGuestNotes();

      state.authUser = user;
      state.notes = cachedUserNotes.length ? cachedUserNotes : guestNotes;
      setSyncStatus("syncing");
      renderApp();

      try {
        const remoteNotes = await cloudApi.fetchRemoteNotes(user);
        const mergedNotes = notesApi.mergeCollections([remoteNotes, cachedUserNotes, guestNotes]);
        state.notes = mergedNotes;
        storageApi.saveUserNotes(user.id, mergedNotes);

        const savedNotes = await cloudApi.pushNotes(user, mergedNotes);
        state.notes = savedNotes;
        storageApi.saveUserNotes(user.id, savedNotes);

        if (guestNotes.length) {
          storageApi.clearGuestNotes();
        }

        setSyncStatus("synced");
        renderApp();

        if (reason === "login") {
          uiApi.showToast(dom, guestNotes.length ? "Accesso effettuato. Le note locali sono state unite al tuo account." : "Accesso effettuato.");
        }
      } catch (error) {
        console.error(error);
        const fallbackNotes = notesApi.mergeCollections([cachedUserNotes, guestNotes]);
        state.notes = fallbackNotes;
        storageApi.saveUserNotes(user.id, fallbackNotes);
        setSyncStatus(navigator.onLine ? "error" : "offline");
        renderApp();
        uiApi.showToast(dom, "Login riuscito, ma la sync cloud non è partita. Le note restano salvate in cache sul dispositivo.");
      }
    }

    async function syncAuthenticatedNotes(options) {
      if (!state.authUser) return;

      if (!navigator.onLine) {
        setSyncStatus("offline");
        if (!(options && options.silent)) {
          uiApi.showToast(dom, "Sei offline. Le modifiche restano salvate e verranno sincronizzate dopo.");
        }
        return;
      }

      const syncTicket = Date.now();
      state.syncSequence = syncTicket;
      setSyncStatus("syncing");

      try {
        const mergedNotes = await cloudApi.syncNotes(state.authUser, state.notes);
        if (state.syncSequence !== syncTicket) return;

        state.notes = mergedNotes;
        storageApi.saveUserNotes(state.authUser.id, mergedNotes);
        setSyncStatus("synced");
        renderApp();

        if (!(options && options.silent)) {
          uiApi.showToast(dom, "Sincronizzazione completata.");
        }
      } catch (error) {
        if (state.syncSequence !== syncTicket) return;
        console.error(error);
        setSyncStatus(navigator.onLine ? "error" : "offline");
        if (!(options && options.silent)) {
          uiApi.showToast(dom, "Sync non riuscita. Le note restano salvate sul dispositivo.");
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
