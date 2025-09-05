// Calendar To-Do (day-wise) — localStorage backed
// Author: ChatGPT (deliverable)

(() => {
  // helpers
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const pad = n => n.toString().padStart(2, '0');

  // DOM
  const calendarEl = qs('#calendar');
  const monthLabel = qs('#currentMonthLabel');
  const prevBtn = qs('#prevMonth');
  const nextBtn = qs('#nextMonth');

  const selectedDateLabel = qs('#selectedDateLabel');
  const selectedDateIso = qs('#selectedDateIso');
  const taskForm = qs('#taskForm');
  const taskInput = qs('#taskInput');
  const taskList = qs('#taskList');
  const clearDateTasksBtn = qs('#clearDateTasks');
  const clearAllBtn = qs('#clearAll');

  // store
  const STORAGE_KEY = 'calendar_todos_v1';

  // state
  let viewDate = new Date(); // calendar month/year being shown
  let selectedDate = new Date(); // which date's tasks we're viewing

  // load store
  const loadStore = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Failed load', e);
      return {};
    }
  };

  const saveStore = (store) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  };

  const getIso = (d) => {
    const y = d.getFullYear(), m = pad(d.getMonth()+1), day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  };

  const getTasksFor = (iso) => {
    const store = loadStore();
    return store[iso] ? store[iso] : [];
  };

  const setTasksFor = (iso, tasks) => {
    const store = loadStore();
    store[iso] = tasks;
    saveStore(store);
  };

  const removeTasksFor = (iso) => {
    const store = loadStore();
    delete store[iso];
    saveStore(store);
  };

  // --- Render calendar ---
  const renderCalendar = () => {
    calendarEl.innerHTML = '';

    // header: weekdays
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const wk = document.createElement('div');
    wk.className = 'weekdays';
    weekdays.forEach(w => {
      const d = document.createElement('div'); d.textContent = w; wk.appendChild(d);
    });
    calendarEl.appendChild(wk);

    // month/year label
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekDay = firstDay.getDay();

    monthLabel.textContent = firstDay.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    // compute days
    const daysContainer = document.createElement('div');
    daysContainer.className = 'days';
    // add empty placeholders before first day
    for(let i=0;i<startWeekDay;i++){
      const empty = document.createElement('div'); empty.className='day empty'; daysContainer.appendChild(empty);
    }

    const daysInMonth = new Date(year, month+1, 0).getDate();

    for(let d=1; d<=daysInMonth; d++){
      const cur = new Date(year, month, d);
      const iso = getIso(cur);
      const el = document.createElement('div'); el.className = 'day';
      if (getIso(new Date()) === iso) el.classList.add('today');

      // header part: date number
      const num = document.createElement('div'); num.className = 'dateNum'; num.textContent = d;
      el.appendChild(num);

      // show count of tasks for that day
      const tasks = getTasksFor(iso);
      if (tasks.length) {
        const small = document.createElement('div'); small.className = 'smallCount'; small.textContent = `${tasks.length} task${tasks.length>1? 's':''}`;
        el.appendChild(small);
      }

      // click handler: select date
      el.addEventListener('click', () => {
        selectedDate = cur;
        renderSelectedDate();
        renderTasks();
      });

      daysContainer.appendChild(el);
    }

    calendarEl.appendChild(daysContainer);
  };

  // render selected date header
  const renderSelectedDate = () => {
    const iso = getIso(selectedDate);
    const label = selectedDate.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    selectedDateLabel.textContent = label;
    selectedDateIso.textContent = iso;
  };

  // render task list for selectedDate
  const renderTasks = () => {
    taskList.innerHTML = '';
    const iso = getIso(selectedDate);
    const tasks = getTasksFor(iso);

    if (tasks.length === 0) {
      const li = document.createElement('li'); li.style.opacity = 0.65; li.style.padding='18px';
      li.textContent = 'No tasks for this date — add one!';
      taskList.appendChild(li);
      // also update calendar to hide smallcount maybe
      renderCalendar(); // re-render to update counts and highlight
      highlightSelectedInCalendar();
      return;
    }

    tasks.forEach((t, idx) => {
      const li = document.createElement('li'); li.className = 'task-item';
      const left = document.createElement('div'); left.className='task-left';
      const check = document.createElement('div'); check.className='check';
      if (t.done) check.classList.add('checked');
      check.innerHTML = t.done ? '✓' : '';
      check.addEventListener('click', () => {
        t.done = !t.done;
        tasks[idx] = t;
        setTasksFor(iso, tasks);
        renderTasks();
        renderCalendar();
        highlightSelectedInCalendar();
      });

      const text = document.createElement('div'); text.className = 'task-text' + (t.done ? ' done' : '');
      text.textContent = t.text;

      left.appendChild(check); left.appendChild(text);

      const actions = document.createElement('div'); actions.className = 'task-actions';
      const editBtn = document.createElement('button'); editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        const newText = prompt('Edit task', t.text);
        if (newText !== null) {
          t.text = newText.trim();
          tasks[idx] = t;
          setTasksFor(iso, tasks);
          renderTasks();
          renderCalendar();
          highlightSelectedInCalendar();
        }
      });

      const delBtn = document.createElement('button'); delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (!confirm('Delete this task?')) return;
        tasks.splice(idx,1);
        setTasksFor(iso, tasks);
        renderTasks();
        renderCalendar();
        highlightSelectedInCalendar();
      });

      actions.appendChild(editBtn); actions.appendChild(delBtn);
      li.appendChild(left); li.appendChild(actions);
      taskList.appendChild(li);
    });

    renderCalendar(); // update counts
    highlightSelectedInCalendar();
  };

  // highlight selected date on calendar visually (simple)
  const highlightSelectedInCalendar = () => {
    // find the day cell that matches selectedDate
    const iso = getIso(selectedDate);
    qsa('.days .day').forEach(dayEl => {
      // the date number text
      const n = dayEl.querySelector('.dateNum');
      if (!n) return;
      const num = parseInt(n.textContent,10);
      // derive date of this cell using current view month and year
      const viewYear = viewDate.getFullYear(), viewMonth = viewDate.getMonth();
      const cellDate = new Date(viewYear, viewMonth, num);
      if (getIso(cellDate) === iso) {
        dayEl.style.boxShadow = '0 12px 30px rgba(124,58,237,0.18)';
        dayEl.style.border = '1px solid rgba(124,58,237,0.15)';
      } else {
        dayEl.style.boxShadow = ''; dayEl.style.border = '1px dashed rgba(255,255,255,0.02)';
      }
    });
  };

  // handle form submit
  taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const iso = getIso(selectedDate);
    const tasks = getTasksFor(iso);
    tasks.push({ text, done:false, createdAt: Date.now() });
    setTasksFor(iso, tasks);
    taskInput.value = '';
    renderTasks();
    renderCalendar();
  });

  // month navigation
  prevBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1);
    renderCalendar();
    highlightSelectedInCalendar();
  });
  nextBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1);
    renderCalendar();
    highlightSelectedInCalendar();
  });

  // clear tasks for date
  clearDateTasksBtn.addEventListener('click', () => {
    const iso = getIso(selectedDate);
    if (!getTasksFor(iso).length) { alert('No tasks to clear for ' + iso); return; }
    if (!confirm('Delete all tasks for ' + iso + '?')) return;
    removeTasksFor(iso);
    renderTasks();
    renderCalendar();
  });

  clearAllBtn.addEventListener('click', () => {
    if (!confirm('Clear all saved data? This will remove all tasks for every date.')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderTasks();
    renderCalendar();
  });

  // initial
  const init = () => {
    // default selectedDate is today
    selectedDate = new Date();
    // ensure viewDate shows selected month
    viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderCalendar();
    renderSelectedDate();
    renderTasks();
  };

  // keyboard shortcuts: left/right month, t = today
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { prevBtn.click(); }
    if (e.key === 'ArrowRight') { nextBtn.click(); }
    if (e.key.toLowerCase() === 't') { selectedDate = new Date(); viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); renderSelectedDate(); renderCalendar(); renderTasks(); }
  });

  init();

})();
