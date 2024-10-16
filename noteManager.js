export const createNote = (title, todos) => {
    const newNote = { id: Date.now(), title, todos };
    notes.push(newNote);
    saveNotesToLocalStorage();
    renderNotes();
};

export const deleteNote = (id) => {
    notes = notes.filter(note => note.id !== id);
    saveNotesToLocalStorage();
    renderNotes();
    updateAllTodosList();
};

// ... 其他笔记相关函数
