export const createTodo = (noteId, text, deadline) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.todos.push({ text, deadline, completed: false });
        saveNotesToLocalStorage();
        renderNotes();
    }
};

export const updateTodoStatus = (noteId, todoIndex, completed) => {
    // ... 更新待办事项状态的逻辑
};

// ... 其他待办事项相关函数
