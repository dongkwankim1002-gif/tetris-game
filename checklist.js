// Personal Daily Checklist + Todo List
// Data is persisted in localStorage on this device only.

// Fill in your own OAuth 2.0 Client ID from Google Cloud Console
// (APIs & Services > Credentials > Create Credentials > OAuth client ID > Web application).
// Add this page's origin (e.g. https://<user>.github.io) as an Authorized JavaScript origin.
const GOOGLE_CLIENT_ID = '206523921934-fuvt1u175pmq5jo16oej4rdv38396840.apps.googleusercontent.com';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

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

// ---------- Google Calendar Sync ----------
let googleTokenClient = null;
let googleAccessToken = null;

function initGoogleCalendarClient() {
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
        setTimeout(initGoogleCalendarClient, 300);
        return;
    }
    googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_CALENDAR_SCOPE,
        callback: (response) => {
            if (response.error) {
                alert('구글 캘린더 연결에 실패했습니다: ' + response.error);
                return;
            }
            googleAccessToken = response.access_token;
            document.getElementById('calendar-connect-btn').textContent = '✅ 캘린더 연결됨';
            document.getElementById('calendar-import-btn').hidden = false;
        }
    });
}

function connectGoogleCalendar() {
    if (GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
        alert('checklist.js의 GOOGLE_CLIENT_ID를 실제 Google OAuth 클라이언트 ID로 교체해야 합니다.');
        return;
    }
    if (!googleTokenClient) {
        alert('구글 로그인 준비 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    googleTokenClient.requestAccessToken();
}

async function fetchCalendarIds() {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader', {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    if (!res.ok) return ['primary'];
    const data = await res.json();
    const ids = (data.items || [])
        .filter(cal => cal.selected !== false)
        .map(cal => cal.id);
    return ids.length > 0 ? ids : ['primary'];
}

async function importTodayEventsFromCalendar() {
    if (!googleAccessToken) {
        alert('먼저 "구글 캘린더 연결" 버튼으로 로그인해 주세요. (로그인 후 1시간이 지나면 다시 연결해야 합니다)');
        return;
    }

    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date();
    timeMax.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime'
    });

    // Fetch from every calendar the account can see (not just "primary"),
    // since shared/secondary calendars each have their own event list.
    const calendarIds = await fetchCalendarIds();
    const results = await Promise.all(calendarIds.map(async (calendarId) => {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
            headers: { Authorization: `Bearer ${googleAccessToken}` }
        });
        if (!res.ok) return { ok: false, items: [] };
        const data = await res.json();
        return { ok: true, items: data.items || [] };
    }));

    if (!results.some(r => r.ok)) {
        alert('일정을 가져오지 못했습니다 (로그인이 만료되었을 수 있습니다). "구글 캘린더 연결"을 다시 눌러 재로그인해 주세요.');
        return;
    }

    const allEvents = results.flatMap(r => r.items).filter(event => event.status !== 'cancelled');
    let importedCount = 0;

    allEvents.forEach(event => {
        const alreadyImported = todoItems.some(i => i.calendarEventId === event.id);
        if (alreadyImported) return;

        const time = event.start && event.start.dateTime
            ? new Date(event.start.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            : '종일';

        todoItems.push({
            id: uid(),
            text: `[${time}] ${event.summary || '(제목 없음)'}`,
            done: false,
            calendarEventId: event.id
        });
        importedCount += 1;
    });

    saveTodoItems();
    renderTodo();
    alert(importedCount > 0 ? `오늘 일정 ${importedCount}건을 추가했습니다.` : '새로 추가할 일정이 없습니다.');
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
    document.getElementById('calendar-connect-btn').addEventListener('click', connectGoogleCalendar);
    document.getElementById('calendar-import-btn').addEventListener('click', importTodayEventsFromCalendar);
    initGoogleCalendarClient();

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
