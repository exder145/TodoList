const STORAGE_KEY = 'notes';
let notes = [];
let editingNoteId = null;

// DOM 元素
const addNoteBtn = document.getElementById('addNoteBtn');
const noteModal = document.getElementById('noteModal');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const noteTitleInput = document.getElementById('noteTitle');
const todoList = document.getElementById('todoList');
const noteContainer = document.getElementById('noteContainer');
const exportJson = document.getElementById('exportJson');
const exportMarkdown = document.getElementById('exportMarkdown');
const exportImage = document.getElementById('exportImage');
const addTodoBtn = document.getElementById('addTodoBtn');

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    loadNotesFromLocalStorage();
    console.log("Notes loaded:", notes);
    renderNotes();
    initializeTheme();
    initializeExportListeners();
});

function loadNotesFromLocalStorage() {
    const storedNotes = localStorage.getItem(STORAGE_KEY);
    console.log("Stored notes string:", storedNotes);
    if (storedNotes) {
        try {
            notes = JSON.parse(storedNotes);
        } catch (error) {
            console.error("Error parsing stored notes:", error);
            notes = [];
        }
    } else {
        notes = [];
    }
}

function renderNotes() {
    console.log("Rendering notes");
    const noteContainer = document.getElementById('noteContainer');
    if (!noteContainer) {
        console.error("Note container not found!");
        return;
    }
    noteContainer.innerHTML = '';
    if (notes.length === 0) {
        console.log("No notes to render");
        noteContainer.innerHTML = '<p>没有笔记，点击右上角的 "+" 按钮添加新笔记</p>';
    } else {
        notes.forEach(note => {
            console.log("Rendering note:", note);
            const noteElement = createNoteElement(note);
            noteContainer.appendChild(noteElement);
        });
    }

    // 添加这行
    updateAllCountdowns();

    updateAnnouncement();
    updateAllTodosList();
}

saveNoteBtn.addEventListener('click', () => {
    console.log("Save note button clicked");
    const title = noteTitleInput.value.trim();
    const todos = getTodosFromModal();
    console.log("New note title:", title);
    console.log("New note todos:", todos);

    if (title) {
        if (editingNoteId !== null) {
            const noteIndex = notes.findIndex(note => note.id === editingNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex] = { id: editingNoteId, title, todos };
            } else {
                console.error('Note not found for editing:', editingNoteId);
            }
        } else {
            const newNote = { id: Date.now(), title, todos };
            notes.push(newNote);
        }
        saveNotesToLocalStorage();
        renderNotes();
        closeModal();
        updateAllTodosList();
        editingNoteId = null; // 重置编辑状态
    } else {
        console.log("Note title is empty, not saving");
    }
});

function saveNotesToLocalStorage() {
    console.log("Saving notes to localStorage:", notes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

addNoteBtn.addEventListener('click', () => {
    console.log("Add note button clicked");
    editingNoteId = null;
    noteTitleInput.value = '';
    todoList.innerHTML = '';
    noteModal.style.display = 'block';
});

function createNoteElement(note) {
    console.log("Creating note element for:", note);
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note';
    noteDiv.dataset.id = note.id;
    noteDiv.draggable = true;
    noteDiv.innerHTML = `
        <div class="glass-container"></div>
        <h3>${note.title}</h3>
        <div class="note-content">
            <div class="todo-list active-todos"></div>
            <div class="todo-list completed-todos"></div>
        </div>
        <div class="note-buttons">
            <button class="edit-btn" data-id="${note.id}" aria-label="编辑笔记"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" data-id="${note.id}" aria-label="删除笔记"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;

    const activeTodoList = noteDiv.querySelector('.active-todos');
    const completedTodoList = noteDiv.querySelector('.completed-todos');

    if (note.todos && Array.isArray(note.todos)) {
        note.todos.forEach((todo, index) => {
            const todoItem = createTodoItem(todo, true);
            todoItem.dataset.index = index;
            if (todo.completed) {
                completedTodoList.appendChild(todoItem);
            } else {
                activeTodoList.appendChild(todoItem);
            }
        });
    }

    // 添加展开/收起功能
    noteDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-btn') && 
            !e.target.closest('.delete-btn') && 
            !e.target.closest('.todo-list') &&
            !e.target.closest('.note-content')) {
            const noteContent = noteDiv.querySelector('.note-content');
            noteContent.classList.toggle('expanded');
        }
    });

    // 添加事件监听器
    noteDiv.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        editNote(note.id);
    });

    noteDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(note.id);
    });

    return noteDiv;
}

function createTodoItem(todo, isReadOnly = false) {
    const todoItem = document.createElement('div');
    todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
    if (isReadOnly) {
        todoItem.innerHTML = `
            <div class="todo-item-left">
                <i class="fas fa-tasks"></i>
                <span class="todo-text">${todo.text}</span>
            </div>
            <div class="todo-item-right">
                <span class="todo-deadline">${formatDate(todo.deadline)}</span>
                <span class="countdown"></span>
            </div>
        `;
        
        todoItem.addEventListener('click', () => {
            todo.completed = !todo.completed;
            updateTodoStatus(todoItem, todo.completed);
        });
    } else {
        todoItem.innerHTML = `
            <input type="text" class="todo-text" value="${todo.text}" placeholder="待办事项">
            <input type="datetime-local" class="todo-deadline" value="${todo.deadline}">
            <button class="remove-todo"><i class="fas fa-trash"></i></button>
        `;

        todoItem.querySelector('.remove-todo').addEventListener('click', (e) => {
            e.stopPropagation();
            todoItem.remove();
        });

        todoItem.querySelector('.todo-text').addEventListener('input', () => updateCountdown(todoItem));
        todoItem.querySelector('.todo-deadline').addEventListener('input', () => updateCountdown(todoItem));
    }

    updateCountdown(todoItem);
    return todoItem;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function updateTodoStatus(todoItem, completed) {
    todoItem.classList.toggle('completed', completed);
    const todoText = todoItem.querySelector('.todo-text');
    if (todoText) {
        todoText.style.textDecoration = completed ? 'line-through' : 'none';
        todoText.style.opacity = completed ? '0.6' : '1';
    }
    
    const noteElement = todoItem.closest('.note');
    const activeTodoList = noteElement.querySelector('.active-todos');
    const completedTodoList = noteElement.querySelector('.completed-todos');
    
    if (completed) {
        // 添加过渡类
        todoItem.classList.add('moving');
        // 使用 setTimeout 来确保过渡效果生效
        setTimeout(() => {
            completedTodoList.appendChild(todoItem);
            // 移除过渡类
            setTimeout(() => {
                todoItem.classList.remove('moving');
            }, 300); // 与 CSS 过渡时间相匹配
        }, 10);
    } else {
        todoItem.classList.add('moving');
        setTimeout(() => {
            activeTodoList.appendChild(todoItem);
            smoothSort(activeTodoList);
            setTimeout(() => {
                todoItem.classList.remove('moving');
            }, 300);
        }, 10);
    }

    updateCountdown(todoItem);
    updateAnnouncement();
    updateAllTodosList();
    
    // 更新原始数据
    const noteId = noteElement.dataset.id;
    if (noteId) {
        const note = notes.find(n => n.id === parseInt(noteId));
        if (note) {
            note.todos = [...Array.from(activeTodoList.children), ...Array.from(completedTodoList.children)].map(todoElement => ({
                text: todoElement.querySelector('.todo-text').textContent,
                deadline: todoElement.querySelector('.todo-deadline').textContent,
                completed: todoElement.classList.contains('completed')
            }));
            saveNotesToLocalStorage();
        }
    }

    if (completed) {
        triggerConfetti();
    }
}

function updateCountdown(todoItem) {
    const deadlineElement = todoItem.querySelector('.todo-deadline');
    const countdownElement = todoItem.querySelector('.countdown');
    
    if (deadlineElement && countdownElement) {
        const deadline = new Date(deadlineElement.value || deadlineElement.textContent);
        const now = new Date();
        const diff = deadline - now;

        if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            countdownElement.textContent = `${days}天${hours}小时${minutes}分钟`;
            countdownElement.classList.remove('urgent');
            
            if (diff < 24 * 60 * 60 * 1000) { // 小于24小时
                countdownElement.classList.add('urgent');
            }
        } else {
            countdownElement.textContent = '已过期';
            countdownElement.classList.add('urgent');
        }
    }
}

function editNote(noteId) {
    console.log("Editing note:", noteId);
    const note = notes.find(n => n.id === noteId);
    if (note) {
        editingNoteId = noteId;
        noteTitleInput.value = note.title;
        todoList.innerHTML = '';
        if (note.todos && Array.isArray(note.todos)) {
            note.todos.forEach(todo => {
                const todoItem = createTodoItem(todo, false);
                todoList.appendChild(todoItem);
            });
        }
        noteModal.style.display = 'block';
    } else {
        console.error('Note not found:', noteId);
    }
}

function deleteNote(noteId) {
    if (confirm('确要删除这个笔记吗？此操作不可撤销。')) {
        notes = notes.filter(note => note.id !== noteId);
        saveNotesToLocalStorage();
        renderNotes();
        updateAllTodosList();
    }
}

function updateAnnouncement() {
    const urgentTodos = [];
    notes.forEach(note => {
        note.todos.forEach(todo => {
            if (!todo.completed) {
                const deadline = new Date(todo.deadline);
                const now = new Date();
                const diff = deadline - now;
                if (diff > 0 && diff < 2 * 24 * 60 * 60 * 1000) { // 小于两天
                    urgentTodos.push({ text: todo.text, noteTitle: note.title, deadline: todo.deadline });
                }
            }
        });
    });

    const announcementElement = document.getElementById('announcement');
    const announcementTitle = document.getElementById('announcementTitle');
    const urgentTodosContainer = document.getElementById('urgentTodos');

    if (urgentTodos.length > 0) {
        announcementElement.classList.remove('no-todos');
        announcementTitle.textContent = '都几点了还坐得住呢？';
        
        urgentTodosContainer.innerHTML = urgentTodos.map(todo => `
            <div class="urgent-todo" data-deadline="${todo.deadline}">
                <span class="urgent-todo-text">${todo.noteTitle}: ${todo.text}</span>
                <span class="urgent-todo-countdown"></span>
            </div>
        `).join('');

        updateAnnouncementCountdowns();
    } else {
        announcementElement.classList.add('no-todos');
        announcementTitle.innerHTML = '暂时没有催命ddl 玩去吧你小子 <i class="fas fa-thumbs-up"></i>';
        urgentTodosContainer.innerHTML = '';
    }
}

function updateAnnouncementCountdowns() {
    const urgentTodos = document.querySelectorAll('#urgentTodos .urgent-todo');
    urgentTodos.forEach(todo => {
        const deadlineStr = todo.dataset.deadline;
        const countdownElement = todo.querySelector('.urgent-todo-countdown');
        if (deadlineStr && countdownElement) {
            const deadline = new Date(deadlineStr);
            const now = new Date();
            const diff = deadline - now;

            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                countdownElement.textContent = `剩余时间：${days}天${hours}小时${minutes}分钟`;
            } else {
                countdownElement.textContent = '已过期';
            }
        }
    });
}

function getCountdown(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `剩余时间：${days}天 ${hours}小时 ${minutes}分钟`;
}

function updateAllTodosList() {
    const allTodos = [];
    notes.forEach(note => {
        note.todos.forEach(todo => {
            if (!todo.completed) {  // 只添加未完成的待办事项
                allTodos.push({
                    noteTitle: note.title,
                    ...todo
                });
            }
        });
    });

    // 按截止日期排序
    allTodos.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    // 更新 DOM
    const allTodosList = document.getElementById('allTodosList');
    allTodosList.innerHTML = allTodos.map(todo => `
        <div class="all-todo-item">
            <div class="note-title">${todo.noteTitle}</div>
            <div class="todo-text">${todo.text}</div>
            <div class="todo-deadline">${formatDate(todo.deadline)}</div>
        </div>
    `).join('');
}

function closeModal() {
    noteModal.style.display = 'none';
    noteTitleInput.value = '';
    todoList.innerHTML = '';
    editingNoteId = null; // 重置编辑状态
}

function getTodosFromModal() {
    return Array.from(todoList.querySelectorAll('.todo-item')).map(item => ({
        text: item.querySelector('.todo-text').value,
        deadline: item.querySelector('.todo-deadline').value,
        completed: false
    }));
}

// 关闭按钮的事件监听器
closeModalBtn.addEventListener('click', closeModal);

// 点击模态框外部关闭模态框
window.addEventListener('click', (event) => {
    if (event.target === noteModal) {
        closeModal();
    }
});

// 按下 Esc 键关闭模态
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && noteModal.style.display === 'block') {
        closeModal();
    }
});

function initializeTheme() {
    const BUTTON = document.querySelector(".toggle");

    const TOGGLE = () => {
        const IS_PRESSED = BUTTON.matches("[aria-pressed=true]");
        document.documentElement.setAttribute("data-theme", IS_PRESSED ? "light" : "dark");
        BUTTON.setAttribute("aria-pressed", IS_PRESSED ? "false" : "true");
        localStorage.setItem('theme', IS_PRESSED ? 'light' : 'dark');
    };

    BUTTON.addEventListener("click", TOGGLE);

    // 初始化主题
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
        BUTTON.setAttribute("aria-pressed", savedTheme === "dark");
    }
}

function initializeExportListeners() {
    exportJson.addEventListener('click', () => exportData('json'));
    exportMarkdown.addEventListener('click', () => exportData('markdown'));
    exportImage.addEventListener('click', () => exportAsImage());
}

function exportData(format) {
    switch (format) {
        case 'json':
            exportAsJson();
            break;
        case 'markdown':
            exportAsMarkdown();
            break;
    }
}

function exportAsJson() {
    const data = JSON.stringify(notes, null, 2);
    downloadFile(data, 'notes_export.json', 'application/json');
}

function exportAsMarkdown() {
    let markdown = "# 笔记导出\n\n";
    notes.forEach(note => {
        markdown += `## ${note.title}\n\n`;
        note.todos.forEach(todo => {
            const status = todo.completed ? "[x]" : "[ ]";
            markdown += `- ${status} ${todo.text} (截止日期: ${todo.deadline})\n`;
        });
        markdown += "\n";
    });
    downloadFile(markdown, 'notes_export.md', 'text/markdown');
}

function exportAsImage() {
    // 显示加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = '正在生成图片，请稍候...';
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.borderRadius = '10px';
    loadingIndicator.style.zIndex = '9999';
    document.body.appendChild(loadingIndicator);

    // 创建一个临时的 div 元素来容纳表格
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '40px';
    tempDiv.style.background = 'white';
    tempDiv.style.color = 'black';
    tempDiv.style.fontFamily = 'Arial, sans-serif';

    // 创建表格
    let tableHTML = `
        <h2 style="text-align: center; margin-bottom: 20px;">待办事项列表</h2>
        <table style="width:100%; border-collapse: separate; border-spacing: 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="border-bottom: 2px solid #ddd; padding: 12px; text-align: left;">笔记标题</th>
                    <th style="border-bottom: 2px solid #ddd; padding: 12px; text-align: left;">待办事项</th>
                    <th style="border-bottom: 2px solid #ddd; padding: 12px; text-align: left;">截止时间</th>
                </tr>
            </thead>
            <tbody>
    `;

    notes.forEach(note => {
        const uncompletedTodos = note.todos.filter(todo => !todo.completed);
        uncompletedTodos.forEach(todo => {
            tableHTML += `
                <tr>
                    <td style="border-bottom: 1px solid #ddd; padding: 12px;">${note.title}</td>
                    <td style="border-bottom: 1px solid #ddd; padding: 12px;">${todo.text}</td>
                    <td style="border-bottom: 1px solid #ddd; padding: 12px;">${formatDate(todo.deadline)}</td>
                </tr>
            `;
        });
    });

    tableHTML += '</tbody></table>';
    tempDiv.innerHTML = tableHTML;

    // 将临时 div 添加到 body
    document.body.appendChild(tempDiv);

    // 使用 html2canvas 将表格转换为图片
    html2canvas(tempDiv, {
        logging: true,
        useCORS: true,
        scale: window.devicePixelRatio,
        backgroundColor: null
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'notes_export.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        document.body.removeChild(loadingIndicator);
        document.body.removeChild(tempDiv);
    }).catch(error => {
        console.error('导出图片时发生错误:', error);
        alert('导出图片失败，请检查控制台以获取更多信息。');
        document.body.removeChild(loadingIndicator);
        document.body.removeChild(tempDiv);
    });
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 添加这个新数来触发烟花效果
function triggerConfetti() {
    if (typeof confetti === 'function') {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti(Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            }));
            confetti(Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            }));
        }, 250);
    } else {
        console.error('Confetti function is not available');
    }
}

// 添加这个新函数
function updateAllCountdowns() {
    const allTodoItems = document.querySelectorAll('.todo-item');
    allTodoItems.forEach(updateCountdown);
    updateAnnouncementCountdowns();
}

// 在文件末尾添加这段代码
setInterval(updateAllCountdowns, 60000); // 每分钟更新一次

addTodoBtn.addEventListener('click', () => {
    const newTodoItem = createTodoItem({ text: '', deadline: '', completed: false }, false);
    todoList.appendChild(newTodoItem);
});
