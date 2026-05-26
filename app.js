const STORAGE_KEY = "todoHabitTracker.v2";
const today = new Date();
const todayKey = toDateKey(today);
let activeFilter = "all";

const initialState = {
  tasks: [
    { id: crypto.randomUUID(), title: "Go for a walk without phone", priority: "normal", done: false, createdAt: Date.now() },
    { id: crypto.randomUUID(), title: "Journal your thoughts", priority: "normal", done: false, createdAt: Date.now() },
    {
      id: crypto.randomUUID(),
      title: "Remember what you wanted to be when you were a kid.",
      priority: "normal",
      done: false,
      createdAt: Date.now()
    }
  ],
  habits: [
    { id: crypto.randomUUID(), title: "Wake up early", completions: {} },
    { id: crypto.randomUUID(), title: "Drink 5L water", completions: {} },
    { id: crypto.randomUUID(), title: "Workout or Stretching", completions: {} }
  ]
};

let state = loadState();

const taskForm = document.querySelector("#taskForm");
const habitForm = document.querySelector("#habitForm");
const taskInput = document.querySelector("#taskInput");
const habitInput = document.querySelector("#habitInput");
const taskPriority = document.querySelector("#taskPriority");
const taskList = document.querySelector("#taskList");
const habitTable = document.querySelector("#habitTable");
const taskEmpty = document.querySelector("#taskEmpty");
const habitEmpty = document.querySelector("#habitEmpty");
const weekTitle = document.querySelector("#weekTitle");

const weekDays = getCurrentWeek(today);

render();

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    priority: taskPriority.value,
    done: false,
    createdAt: Date.now()
  });

  taskInput.value = "";
  taskPriority.value = "normal";
  persistAndRender();
});

habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = habitInput.value.trim();
  if (!title) return;

  state.habits.push({
    id: crypto.randomUUID(),
    title,
    completions: {}
  });

  habitInput.value = "";
  persistAndRender();
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderTasks();
  });
});

document.querySelector("#resetTodayBtn").addEventListener("click", () => {
  state.habits = state.habits.map((habit) => {
    const completions = { ...habit.completions };
    delete completions[todayKey];
    return { ...habit, completions };
  });
  persistAndRender();
});

function render() {
  renderTasks();
  renderHabits();
}

function renderTasks() {
  taskList.textContent = "";
  const filtered = state.tasks.filter((task) => {
    if (activeFilter === "done") return task.done;
    return true;
  });

  filtered.forEach((task) => {
    const template = document.querySelector("#taskTemplate").content.cloneNode(true);
    const item = template.querySelector(".task-item");
    const checkbox = template.querySelector(".task-check");
    const title = template.querySelector(".task-title");
    const meta = template.querySelector(".task-meta");
    const remove = template.querySelector(".delete-task");

    item.classList.toggle("done", task.done);
    item.classList.add(task.priority);
    checkbox.checked = task.done;
    title.textContent = task.title;
    meta.textContent = `${task.priority} priority`;

    checkbox.addEventListener("change", () => {
      state.tasks = state.tasks.map((existing) =>
        existing.id === task.id ? { ...existing, done: checkbox.checked } : existing
      );
      persistAndRender();
    });

    remove.addEventListener("click", () => {
      state.tasks = state.tasks.filter((existing) => existing.id !== task.id);
      persistAndRender();
    });

    taskList.appendChild(template);
  });

  taskEmpty.classList.toggle("visible", filtered.length === 0);
}

function renderHabits() {
  habitTable.textContent = "";
  weekTitle.textContent = getWeekLabel(weekDays);

  const thead = habitTable.createTHead();
  const dayNameRow = thead.insertRow();
  appendTableHeader(dayNameRow, "", "habit-column corner");
  weekDays.forEach((date) => {
    appendTableHeader(dayNameRow, date.toLocaleDateString(undefined, { weekday: "narrow" }), "day-label", toDateKey(date) === todayKey);
  });
  appendTableHeader(dayNameRow, "Count", "count-column side-heading");
  appendTableHeader(dayNameRow, "Bar", "bar-column side-heading");

  const dayNumberRow = thead.insertRow();
  appendTableHeader(dayNumberRow, "Habits", "habit-column habit-heading");
  weekDays.forEach((date) => {
    appendTableHeader(dayNumberRow, date.getDate(), "day-number", toDateKey(date) === todayKey);
  });
  appendTableHeader(dayNumberRow, "", "count-column side-heading");
  appendTableHeader(dayNumberRow, "", "bar-column side-heading");

  const tbody = habitTable.createTBody();

  state.habits.forEach((habit) => {
    const row = tbody.insertRow();
    const label = appendTableCell(row, "", "habit-name habit-column");
    const title = document.createElement("span");
    title.textContent = habit.title;
    const remove = document.createElement("button");
    remove.className = "sheet-delete";
    remove.type = "button";
    remove.textContent = "x";
    remove.ariaLabel = `Delete ${habit.title}`;
    remove.addEventListener("click", () => {
      state.habits = state.habits.filter((existing) => existing.id !== habit.id);
      persistAndRender();
    });
    label.append(title, remove);

    weekDays.forEach((date) => {
      const key = toDateKey(date);
      const cell = appendTableCell(row, "", "check-cell", key === todayKey);
      const checkbox = document.createElement("button");
      checkbox.className = "sheet-check";
      checkbox.type = "button";
      checkbox.ariaLabel = `${habit.title} on ${date.toLocaleDateString()}`;
      checkbox.classList.toggle("checked", Boolean(habit.completions[key]));
      checkbox.addEventListener("click", () => {
        const completions = { ...habit.completions, [key]: !habit.completions[key] };
        if (!completions[key]) delete completions[key];
        state.habits = state.habits.map((existing) =>
          existing.id === habit.id ? { ...existing, completions } : existing
        );
        persistAndRender();
      });
      cell.appendChild(checkbox);
    });

    const count = getWeekCount(habit.completions);
    appendTableCell(row, count, "count-cell count-column");
    const barCell = appendTableCell(row, "", "bar-cell bar-column");
    const bar = document.createElement("span");
    bar.style.width = `${getPercent(count, weekDays.length)}%`;
    barCell.appendChild(bar);
  });

  const tfoot = habitTable.createTFoot();
  const countRow = tfoot.insertRow();
  appendTableHeader(countRow, "Count", "summary-label habit-column");
  weekDays.forEach((date) => appendTableCell(countRow, getDayCount(toDateKey(date)), "summary-count"));
  appendTableCell(countRow, "", "summary-count count-column");
  appendTableCell(countRow, "", "summary-count bar-column");

  const barRow = tfoot.insertRow();
  appendTableHeader(barRow, "Bar", "bar-label habit-column");
  weekDays.forEach((date) => {
    const cell = appendTableCell(barRow, "", "daily-bar-cell");
    const bar = document.createElement("span");
    const count = getDayCount(toDateKey(date));
    bar.style.height = `${getPercent(count, state.habits.length)}%`;
    cell.appendChild(bar);
  });
  appendTableCell(barRow, "", "bar-fill count-column");
  appendTableCell(barRow, "", "bar-fill bar-column");

  habitEmpty.classList.toggle("visible", state.habits.length === 0);
}

function appendTableHeader(row, content, className, isToday = false) {
  const cell = document.createElement("th");
  cell.scope = "col";
  cell.className = className;
  cell.classList.toggle("today-column", isToday);
  cell.textContent = content;
  row.appendChild(cell);
  return cell;
}

function appendTableCell(row, content, className, isToday = false) {
  const cell = row.insertCell();
  cell.className = className;
  cell.classList.toggle("today-column", isToday);
  cell.textContent = content;
  return cell;
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.habits)) {
      return saved;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return initialState;
}

function getCurrentWeek(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

function getWeekCount(completions) {
  return weekDays.reduce((total, date) => total + Number(Boolean(completions[toDateKey(date)])), 0);
}

function getWeekLabel(days) {
  const first = days[0];
  const month = first.toLocaleDateString(undefined, { month: "long" });
  const weekNumber = Math.ceil(first.getDate() / 7);
  return `${month} ${toOrdinal(weekNumber)} Week`;
}

function toOrdinal(number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = number % 100;
  return `${number}${suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]}`;
}

function getDayCount(key) {
  return state.habits.reduce((total, habit) => total + Number(Boolean(habit.completions[key])), 0);
}

function getPercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getStreak(completions) {
  let count = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  while (completions[toDateKey(cursor)]) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
