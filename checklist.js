// Personal Daily Checklist + Todo List
// Data is persisted in localStorage on this device only.

const STORAGE_KEYS = {
    dailyItems: 'checklist_daily_items',
    dailyProgress: 'checklist_daily_progress',
    todoItems: 'checklist_todo_items'
};

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Daily Checklist ----------
let dailyItems = loadJSON(STORAGE_KEYS.dailyItems, []);
let dailyProgress = loadJSON(STORAGE_KEYS.dailyProgress, { date: todayKey(), done: [] });

if (dailyProgress.date !== todayKey()) {
    dailyProgress = { date: todayKey(), done: [] };
    saveJSON(STORAGE_KEYS.dailyProgress, dailyProgress);
}

function saveDailyItems() {
    saveJSON(STORAGE_KEYS.dailyItems, dailyItems);
}

function saveDailyProgress() {
    saveJSON(STORAGE_KEYS.dailyProgress, dailyProgress);
}

function renderDaily() {
    const list = document.getElementById('daily-list');
    const empty = document.getElementById('daily-empty');
    list.innerHTML = '';

    empty.style.display = dailyItems.length === 0 ? 'block' : 'none';

    dailyItems.forEach(item => {
        const isDone = dailyProgress.done.includes(item.id);
        const li = document.createElement('li');
        li.className = `checklist-item${isDone ? ' done' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isDone;
        checkbox.addEventListener('change', () => toggleDaily(item.id));

        const text = document.createElement('span');
        text.className = 'item-text';
        text.textContent = item.text;

        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.textContent = '✕';
        del.title = 'Remove habit';
        del.addEventListener('click', () => removeDaily(item.id));

        li.append(checkbox, text, del);
        list.appendChild(li);
    });

    const total = dailyItems.length;
    const done = dailyProgress.done.filter(id => dailyItems.some(i => i.id === id)).length;
    document.getElementById('daily-progress-label').textContent = `${done} / ${total}`;
    document.getElementById('daily-progress-bar').style.width = total > 0 ? `${(done / total) * 100}%` : '0%';
}

function addDaily(text) {
    dailyItems.push({ id: uid(), text });
    saveDailyItems();
    renderDaily();
}

function removeDaily(id) {
    dailyItems = dailyItems.filter(i => i.id !== id);
    dailyProgress.done = dailyProgress.done.filter(dId => dId !== id);
    saveDailyItems();
    saveDailyProgress();
    renderDaily();
}

function toggleDaily(id) {
    if (dailyProgress.done.includes(id)) {
        dailyProgress.done = dailyProgress.done.filter(dId => dId !== id);
    } else {
        dailyProgress.done.push(id);
    }
    saveDailyProgress();
    renderDaily();
}

// ---------- Todo List ----------
const DEFAULT_TODOS = [
    { id: 'seed-salon', text: '미용실 다녀왔나', done: false },
    { id: 'seed-dentist', text: '치과 방문하였나', done: false },
    { id: 'seed-insurance', text: '보험 해약할 거 해약했나', done: false }
];

let todoItems = loadJSON(STORAGE_KEYS.todoItems, DEFAULT_TODOS);

function saveTodoItems() {
    saveJSON(STORAGE_KEYS.todoItems, todoItems);
}

function renderTodo() {
    const list = document.getElementById('todo-list');
    const empty = document.getElementById('todo-empty');
    list.innerHTML = '';

    empty.style.display = todoItems.length === 0 ? 'block' : 'none';

    todoItems.forEach(item => {
        const li = document.createElement('li');
        li.className = `checklist-item${item.done ? ' done' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => toggleTodo(item.id));

        const text = document.createElement('span');
        text.className = 'item-text';
        text.textContent = item.text;

        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.textContent = '✕';
        del.title = 'Remove task';
        del.addEventListener('click', () => removeTodo(item.id));

        li.append(checkbox, text, del);
        list.appendChild(li);
    });

    const remaining = todoItems.filter(i => !i.done).length;
    document.getElementById('todo-progress-label').textContent = `${remaining} left`;
    const total = todoItems.length;
    const done = total - remaining;
    document.getElementById('todo-progress-bar').style.width = total > 0 ? `${(done / total) * 100}%` : '0%';
}

function addTodo(text) {
    todoItems.push({ id: uid(), text, done: false });
    saveTodoItems();
    renderTodo();
}

function removeTodo(id) {
    todoItems = todoItems.filter(i => i.id !== id);
    saveTodoItems();
    renderTodo();
}

function toggleTodo(id) {
    const item = todoItems.find(i => i.id === id);
    if (item) item.done = !item.done;
    saveTodoItems();
    renderTodo();
}

function clearCompletedTodos() {
    todoItems = todoItems.filter(i => !i.done);
    saveTodoItems();
    renderTodo();
}

// ---------- Wiring ----------
document.addEventListener('DOMContentLoaded', () => {
    const dailyForm = document.getElementById('daily-form');
    const dailyInput = document.getElementById('daily-input');
    dailyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = dailyInput.value.trim();
        if (!text) return;
        addDaily(text);
        dailyInput.value = '';
        dailyInput.focus();
    });

    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        if (!text) return;
        addTodo(text);
        todoInput.value = '';
        todoInput.focus();
    });

    document.getElementById('clear-completed-btn').addEventListener('click', clearCompletedTodos);

    const todayLabel = document.getElementById('today-label');
    todayLabel.textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

    const themes = ['default', 'retro', 'pastel'];
    let currentThemeIndex = 0;
    document.getElementById('theme-btn').addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const theme = themes[currentThemeIndex];
        if (theme === 'default') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', theme);
    });

    renderDaily();
    renderTodo();
});
