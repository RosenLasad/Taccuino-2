(function () {
  const dateFormatter = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short"
  });

  function getDom() {
    return {
      newNoteBtn: document.getElementById("new-note-btn"),
      emptyNewNoteBtn: document.getElementById("empty-new-note-btn"),
      mobileNewNoteBtn: document.getElementById("mobile-new-note-btn"),
      searchInput: document.getElementById("search-input"),
      sortSelect: document.getElementById("sort-select"),
      viewSelect: document.getElementById("view-select"),
      categoryFilter: document.getElementById("category-filter"),
      activeNotesCount: document.getElementById("active-notes-count"),
      archivedNotesCount: document.getElementById("archived-notes-count"),
      trashNotesCount: document.getElementById("trash-notes-count"),
      openChecklistCount: document.getElementById("open-checklist-count"),
      emptyState: document.getElementById("empty-state"),
      emptyStateText: document.getElementById("empty-state-text"),
      notesGrid: document.getElementById("notes-grid"),
      modal: document.getElementById("note-modal"),
      modalTitle: document.getElementById("modal-title"),
      closeModalBtn: document.getElementById("close-modal-btn"),
      noteForm: document.getElementById("note-form"),
      noteId: document.getElementById("note-id"),
      cancelNoteBtn: document.getElementById("cancel-note-btn"),
      archiveNoteBtn: document.getElementById("archive-note-btn"),
      trashNoteBtn: document.getElementById("trash-note-btn"),
      deleteNoteBtn: document.getElementById("delete-note-btn"),
      noteTitle: document.getElementById("note-title"),
      noteText: document.getElementById("note-text"),
      noteCategory: document.getElementById("note-category"),
      noteColor: document.getElementById("note-color"),
      notePinned: document.getElementById("note-pinned"),
      checklistEditor: document.getElementById("checklist-editor"),
      addChecklistItemBtn: document.getElementById("add-checklist-item-btn"),
      noteCardTemplate: document.getElementById("note-card-template"),
      installAppBtn: document.getElementById("install-app-btn"),
      authBtn: document.getElementById("auth-btn"),
      authStatus: document.getElementById("auth-status"),
      syncStatus: document.getElementById("sync-status"),
      exportNotesBtn: document.getElementById("export-notes-btn"),
      importNotesBtn: document.getElementById("import-notes-btn"),
      importFileInput: document.getElementById("import-file-input"),
      colorPresetButtons: Array.prototype.slice.call(document.querySelectorAll(".color-chip")),
      toast: document.getElementById("toast")
    };
  }

  function renderNotes(dom, notes, currentView, handlers) {
    dom.notesGrid.innerHTML = "";

    if (!notes.length) {
      dom.emptyState.classList.remove("hidden");
      dom.notesGrid.classList.add("hidden");
      updateEmptyState(dom, currentView);
      return;
    }

    dom.emptyState.classList.add("hidden");
    dom.notesGrid.classList.remove("hidden");

    const fragment = document.createDocumentFragment();

    notes.forEach((note) => {
      const card = dom.noteCardTemplate.content.firstElementChild.cloneNode(true);
      const titleElement = card.querySelector(".note-card-title");
      const categoryElement = card.querySelector(".note-card-category");
      const dateElement = card.querySelector(".note-card-date");
      const badgesElement = card.querySelector(".note-card-badges");
      const textElement = card.querySelector(".note-card-text");
      const checklistElement = card.querySelector(".note-card-checklist");
      const pinButton = card.querySelector(".note-pin-btn");
      const archiveButton = card.querySelector(".note-archive-btn");
      const restoreButton = card.querySelector(".note-restore-btn");
      const deleteButton = card.querySelector(".note-delete-btn");

      titleElement.textContent = note.title || "Nota senza titolo";
      categoryElement.textContent = capitalize(note.category || "altro");
      dateElement.textContent = dateFormatter.format(note.updatedAt || Date.now());
      textElement.textContent = note.text || "";

      renderBadges(note, badgesElement);

      if (!note.text) {
        textElement.classList.add("hidden");
      }

      if (!note.checklist || note.checklist.length === 0) {
        checklistElement.classList.add("hidden");
      } else {
        note.checklist.slice(0, 2).forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item.text;
          if (item.done) li.classList.add("done");
          checklistElement.appendChild(li);
        });
      }

      card.style.borderLeftColor = note.color || "#c1121f";
      wireCardActions(card, note, currentView, {
        pinButton,
        archiveButton,
        restoreButton,
        deleteButton
      }, handlers);
      fragment.appendChild(card);
    });

    dom.notesGrid.appendChild(fragment);
  }

  function wireCardActions(card, note, currentView, buttons, handlers) {
    card.addEventListener("click", function () {
      handlers.onEdit(note.id);
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handlers.onEdit(note.id);
      }
    });

    buttons.pinButton.classList.toggle("hidden", currentView !== "active");
    setActionIcon(buttons.pinButton, note.pinned ? "unpin" : "pin", note.pinned ? "Sblocca nota" : "Fissa nota");
    buttons.pinButton.addEventListener("click", function (event) {
      event.stopPropagation();
      handlers.onTogglePin(note.id);
    });

    if (currentView === "trash") {
      buttons.archiveButton.classList.add("hidden");
      buttons.restoreButton.classList.remove("hidden");
      setActionIcon(buttons.restoreButton, "restore", "Ripristina nota");
      buttons.restoreButton.addEventListener("click", function (event) {
        event.stopPropagation();
        handlers.onRestore(note.id);
      });
      setActionIcon(buttons.deleteButton, "delete", "Elimina definitivamente");
      buttons.deleteButton.addEventListener("click", function (event) {
        event.stopPropagation();
        handlers.onPermanentDelete(note.id);
      });
    } else {
      buttons.restoreButton.classList.add("hidden");
      buttons.archiveButton.classList.remove("hidden");
      setActionIcon(buttons.archiveButton, currentView === "archived" ? "restore" : "archive", currentView === "archived" ? "Ripristina nota" : "Archivia nota");
      buttons.archiveButton.addEventListener("click", function (event) {
        event.stopPropagation();
        handlers.onToggleArchive(note.id);
      });
      setActionIcon(buttons.deleteButton, "trash", "Sposta nel cestino");
      buttons.deleteButton.addEventListener("click", function (event) {
        event.stopPropagation();
        handlers.onMoveToTrash(note.id);
      });
    }
  }

  function setActionIcon(button, icon, label) {
    button.classList.add("note-card-action-btn");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.innerHTML = getActionIconSvg(icon);
  }

  function getActionIconSvg(icon) {
    const icons = {
      pin: '<svg class="note-card-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"></path><path d="M8 3h8l-1 5 3 4v1H6v-1l3-4-1-5Z"></path></svg>',
      unpin: '<svg class="note-card-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"></path><path d="M8 3h8l-1 5 3 4v1H6v-1l3-4-1-5Z"></path><path d="M4 4l16 16"></path></svg>',
      archive: '<svg class="note-card-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18"></path><path d="M5 7l1 11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-11"></path><path d="M9 11h6"></path><path d="M12 11v4"></path></svg>',
      restore: '<svg class="note-card-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18"></path><path d="M5 7l1 11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-11"></path><path d="M8 14l4-4 4 4"></path></svg>',
      trash: '<svg class="note-card-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path></svg>',
      delete: '<svg class="note-card-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>'
    };

    return icons[icon] || icons.trash;
  }

  function renderBadges(note, container) {
    container.innerHTML = "";

    if (note.pinned) {
      container.appendChild(createBadge("Fissata", "pin"));
    }

    if (note.archived && !note.trashed) {
      container.appendChild(createBadge("Archivio", "archived"));
    }

    if (note.trashed) {
      container.appendChild(createBadge("Cestino", "trashed"));
    }
  }

  function createBadge(text, type) {
    const badge = document.createElement("span");
    badge.className = `badge ${type}`;
    badge.textContent = text;
    return badge;
  }

  function updateSummary(dom, counts) {
    dom.activeNotesCount.textContent = String(counts.active);
    dom.archivedNotesCount.textContent = String(counts.archived);
    dom.trashNotesCount.textContent = String(counts.trash);
    dom.openChecklistCount.textContent = String(counts.pendingChecklist);
  }

  function updateAuthArea(dom, payload) {
    const user = payload && payload.user ? payload.user : null;
    const syncStatus = payload && payload.syncStatus ? payload.syncStatus : "guest";

    dom.authStatus.textContent = getUserDisplayName(user);
    dom.authStatus.title = user && user.email ? user.email : dom.authStatus.textContent;
    dom.authBtn.textContent = user ? "Logout" : "Login";
    updateSyncStatus(dom, syncStatus);
  }

  function updateSyncStatus(dom, syncStatus) {
    const labelByStatus = {
      guest: "Locale",
      syncing: "Sync in corso",
      synced: "Sincronizzato",
      offline: "Offline",
      error: "Sync sospesa"
    };

    const normalized = labelByStatus[syncStatus] ? syncStatus : "guest";
    dom.syncStatus.className = `sync-status ${normalized}`;
    dom.syncStatus.textContent = "";
    dom.syncStatus.setAttribute("aria-label", labelByStatus[normalized]);
    dom.syncStatus.setAttribute("title", labelByStatus[normalized]);
  }

  function getUserDisplayName(user) {
    if (!user) return "Ospite";

    const authApi = window.Taccuino && window.Taccuino.auth;
    if (authApi && typeof authApi.getDisplayName === "function") {
      return authApi.getDisplayName(user);
    }

    if (typeof user.email === "string" && user.email.includes("@")) {
      return user.email.split("@")[0];
    }

    return "Utente";
  }

  function updateEmptyState(dom, currentView) {
    if (currentView === "trash") {
      dom.emptyStateText.textContent = "Qui finiscono le note spostate nel cestino. Puoi ancora ripristinarle o eliminarle definitivamente.";
      return;
    }

    if (currentView === "archived") {
      dom.emptyStateText.textContent = "L'archivio è vuoto. Archivia le note che vuoi tenere ma non vedere nella schermata principale.";
      return;
    }

    dom.emptyStateText.textContent = "Crea il tuo primo appunto, una lista rapida o una nota di lavoro.";
  }

  function openModal(dom, options) {
    dom.modal.classList.remove("hidden");
    dom.modalTitle.textContent = options && options.isEditing ? "Modifica nota" : "Nuova nota";
    document.body.style.overflow = "hidden";
  }

  function closeModal(dom) {
    dom.modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function fillForm(dom, note) {
    dom.noteId.value = note.id || "";
    dom.noteTitle.value = note.title || "";
    dom.noteText.value = note.text || "";
    dom.noteCategory.value = note.category || "lavoro";
    dom.noteColor.value = note.color || "#c1121f";
    dom.notePinned.checked = Boolean(note.pinned);
    renderChecklistEditor(dom, note.checklist || []);
    syncColorPresetState(dom, dom.noteColor.value);
  }

  function setEditorActions(dom, note) {
    const isEditing = Boolean(note && note.id);
    const isTrashed = Boolean(note && note.trashed);

    dom.archiveNoteBtn.classList.toggle("hidden", !isEditing || isTrashed);
    dom.trashNoteBtn.classList.toggle("hidden", !isEditing || isTrashed);
    dom.deleteNoteBtn.classList.toggle("hidden", !isEditing || !isTrashed);

    if (isEditing && !isTrashed) {
      dom.archiveNoteBtn.textContent = note.archived ? "Ripristina da archivio" : "Archivia";
    }
  }

  function renderChecklistEditor(dom, checklistItems) {
    dom.checklistEditor.innerHTML = "";

    if (!checklistItems.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "checklist-placeholder";
      placeholder.textContent = "Nessuna voce ancora. Aggiungine una per creare una checklist.";
      dom.checklistEditor.appendChild(placeholder);
      return;
    }

    const fragment = document.createDocumentFragment();

    checklistItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "checklist-row";
      row.dataset.id = item.id;

      const checkbox = document.createElement("input");
      checkbox.className = "check-toggle";
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(item.done);
      checkbox.setAttribute("aria-label", "Voce completata");

      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.value = item.text || "";
      textInput.placeholder = "Testo voce checklist";

      const removeButton = document.createElement("button");
      removeButton.className = "remove-checklist-item-btn";
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", "Rimuovi voce");
      removeButton.textContent = "×";

      row.appendChild(checkbox);
      row.appendChild(textInput);
      row.appendChild(removeButton);
      fragment.appendChild(row);
    });

    dom.checklistEditor.appendChild(fragment);
  }

  function getChecklistFromEditor(dom) {
    const rows = Array.prototype.slice.call(dom.checklistEditor.querySelectorAll(".checklist-row"));
    const createId = window.Taccuino.notes.createId;

    return rows
      .map((row) => {
        const checkbox = row.querySelector(".check-toggle");
        const textInput = row.querySelector('input[type="text"]');
        return {
          id: row.dataset.id || createId(),
          text: textInput ? textInput.value.trim() : "",
          done: Boolean(checkbox && checkbox.checked)
        };
      })
      .filter((item) => item.text.length > 0);
  }

  function createChecklistDraftItem() {
    return {
      id: window.Taccuino.notes.createId(),
      text: "",
      done: false
    };
  }

  function attachModalCloseListeners(dom, onClose) {
    dom.modal.addEventListener("click", (event) => {
      const target = event.target;
      if (target && target.dataset && target.dataset.closeModal === "true") {
        onClose();
      }
    });
  }

  function syncColorPresetState(dom, colorValue) {
    const normalized = String(colorValue || "").toLowerCase();
    dom.colorPresetButtons.forEach((button) => {
      const buttonColor = String(button.dataset.color || "").toLowerCase();
      button.classList.toggle("active", buttonColor === normalized);
    });
  }

  function showToast(dom, message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    window.clearTimeout(dom.toastTimer);
    dom.toastTimer = window.setTimeout(function () {
      dom.toast.classList.add("hidden");
    }, 2400);
  }

  function downloadTextFile(filename, content, type) {
    const blob = new Blob([content], { type: type || "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 500);
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  window.Taccuino = window.Taccuino || {};
  window.Taccuino.ui = {
    getDom,
    renderNotes,
    updateSummary,
    updateAuthArea,
    updateSyncStatus,
    updateEmptyState,
    openModal,
    closeModal,
    fillForm,
    setEditorActions,
    renderChecklistEditor,
    getChecklistFromEditor,
    createChecklistDraftItem,
    attachModalCloseListeners,
    syncColorPresetState,
    showToast,
    downloadTextFile
  };
})();
