(function () {
  const DEFAULT_CATEGORY_COLORS = {
    lavoro: "#c1121f",
    privato: "#3b82f6",
    idee: "#f59e0b",
    urgente: "#ef4444",
    altro: "#8b5cf6"
  };

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `note_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeChecklist(checklist) {
    if (!Array.isArray(checklist)) return [];

    return checklist
      .map((item) => ({
        id: item && item.id ? item.id : createId(),
        text: String((item && item.text) || "").trim(),
        done: Boolean(item && item.done)
      }))
      .filter((item) => item.text.length > 0);
  }

  function createEmptyNote() {
    return {
      id: createId(),
      title: "",
      text: "",
      checklist: [],
      category: "lavoro",
      color: DEFAULT_CATEGORY_COLORS.lavoro,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function normalizeNote(rawNote) {
    const safeCategory = (rawNote && rawNote.category) || "altro";
    return {
      id: (rawNote && rawNote.id) || createId(),
      title: String((rawNote && rawNote.title) || "").trim(),
      text: String((rawNote && rawNote.text) || "").trim(),
      checklist: normalizeChecklist(rawNote && rawNote.checklist),
      category: safeCategory,
      color: (rawNote && rawNote.color) || DEFAULT_CATEGORY_COLORS[safeCategory] || DEFAULT_CATEGORY_COLORS.altro,
      pinned: Boolean(rawNote && rawNote.pinned),
      archived: Boolean(rawNote && rawNote.archived),
      trashed: Boolean(rawNote && rawNote.trashed),
      createdAt: Number(rawNote && rawNote.createdAt) || Date.now(),
      updatedAt: Number(rawNote && rawNote.updatedAt) || Date.now()
    };
  }

  function normalizeNotes(notes) {
    if (!Array.isArray(notes)) return [];
    return notes.map(normalizeNote);
  }

  function mergeCollections(collections) {
    const allCollections = Array.isArray(collections) ? collections : [];
    const map = new Map();

    allCollections.forEach((notes) => {
      normalizeNotes(notes).forEach((note) => {
        const existing = map.get(note.id);
        if (!existing) {
          map.set(note.id, note);
          return;
        }

        if ((note.updatedAt || 0) >= (existing.updatedAt || 0)) {
          map.set(note.id, note);
        }
      });
    });

    return Array.from(map.values());
  }

  function upsertNote(notes, incomingNote) {
    const note = normalizeNote(Object.assign({}, incomingNote, { updatedAt: Date.now() }));
    const existingIndex = notes.findIndex((item) => item.id === note.id);

    if (existingIndex === -1) {
      return [note].concat(notes);
    }

    const nextNotes = notes.slice();
    nextNotes[existingIndex] = Object.assign({}, nextNotes[existingIndex], note, {
      createdAt: nextNotes[existingIndex].createdAt || note.createdAt
    });
    return nextNotes;
  }

  function getNoteById(notes, noteId) {
    return notes.find((note) => note.id === noteId) || null;
  }

  function updateNoteState(notes, noteId, partialState) {
    return notes.map((note) => {
      if (note.id !== noteId) return note;
      return normalizeNote(Object.assign({}, note, partialState, { updatedAt: Date.now() }));
    });
  }

  function togglePinned(notes, noteId) {
    const note = getNoteById(notes, noteId);
    if (!note) return notes;
    return updateNoteState(notes, noteId, { pinned: !note.pinned });
  }

  function toggleArchived(notes, noteId) {
    const note = getNoteById(notes, noteId);
    if (!note) return notes;
    return updateNoteState(notes, noteId, { archived: !note.archived, trashed: false });
  }

  function moveToTrash(notes, noteId) {
    return updateNoteState(notes, noteId, { trashed: true, pinned: false });
  }

  function restoreNote(notes, noteId) {
    return updateNoteState(notes, noteId, { trashed: false });
  }

  function permanentlyDeleteNote(notes, noteId) {
    return notes.filter((note) => note.id !== noteId);
  }

  function getCounts(notes) {
    return notes.reduce(
      (acc, note) => {
        if (note.trashed) acc.trash += 1;
        else if (note.archived) acc.archived += 1;
        else acc.active += 1;
        acc.pendingChecklist += (note.checklist || []).filter((item) => !item.done).length;
        return acc;
      },
      { active: 0, archived: 0, trash: 0, pendingChecklist: 0 }
    );
  }

  function sortNotes(notes, sortBy, currentView) {
    const sorted = notes.slice();

    sorted.sort((a, b) => {
      if (currentView === "active" && a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      switch (sortBy) {
        case "created-desc":
          return b.createdAt - a.createdAt;
        case "title-asc": {
          const titleA = a.title || "";
          const titleB = b.title || "";
          return titleA.localeCompare(titleB, "it", { sensitivity: "base" });
        }
        case "category-asc": {
          const categoryCompare = a.category.localeCompare(b.category, "it", { sensitivity: "base" });
          if (categoryCompare !== 0) return categoryCompare;
          return (a.title || "").localeCompare(b.title || "", "it", { sensitivity: "base" });
        }
        case "updated-desc":
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return sorted;
  }

  function filterNotes(notes, options) {
    const searchTerm = String((options && options.searchTerm) || "").trim().toLowerCase();
    const category = String((options && options.categoryFilter) || "all");
    const currentView = String((options && options.currentView) || "active");

    return notes.filter((note) => {
      const matchesView = currentView === "trash"
        ? note.trashed
        : currentView === "archived"
          ? note.archived && !note.trashed
          : !note.archived && !note.trashed;

      if (!matchesView) return false;

      const matchesCategory = category === "all" || note.category === category;
      if (!matchesCategory) return false;

      if (!searchTerm) return true;

      const checklistText = (note.checklist || []).map((item) => item.text).join(" ");
      const haystack = [note.title, note.text, checklistText].join(" ").toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  function getVisibleNotes(notes, options) {
    return sortNotes(filterNotes(notes, options), options && options.sortBy, options && options.currentView);
  }

  function getDefaultColorForCategory(category) {
    return DEFAULT_CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLORS.altro;
  }

  window.Taccuino = window.Taccuino || {};
  window.Taccuino.notes = {
    DEFAULT_CATEGORY_COLORS,
    createId,
    createEmptyNote,
    normalizeNote,
    normalizeNotes,
    mergeCollections,
    upsertNote,
    getNoteById,
    togglePinned,
    toggleArchived,
    moveToTrash,
    restoreNote,
    permanentlyDeleteNote,
    getCounts,
    getVisibleNotes,
    getDefaultColorForCategory
  };
})();
