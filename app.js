// ═══════════════════════════════════════════════════════
//  MoodTrace – app.js  (full feature build)
// ═══════════════════════════════════════════════════════

// ─── CONSTANTS ──────────────────────────────────────────

const CATEGORY_LABELS = {
  work:   '💼 Work',
  money:  '💰 Money',
  rel:    '❤️ Relationships',
  health: '🏃 Health'
};

const BADGE_CLASSES = {
  work:   'badge-work',
  money:  'badge-money',
  rel:    'badge-relation',
  health: 'badge-health'
};

const WELLBEING_LABELS = [
  { max: 2,   label: 'Very Low 😔' },
  { max: 4,   label: 'Low 😟' },
  { max: 6,   label: 'Okay 😐' },
  { max: 7.5, label: 'Good 😊' },
  { max: 9,   label: 'Great 😄' },
  { max: 10,  label: 'Excellent 🤩' }
];

const COPING_LABELS = {
  meditated:  '🧘 Meditated',
  exercised:  '🏃 Exercised',
  talked:     '💬 Talked to someone',
  journalled: '📖 Journalled',
  rested:     '😴 Rested',
  music:      '🎵 Music',
  walked:     '🚶 Walked',
  breathed:   '🌬️ Breathing',
  ate:        '🍽️ Ate well',
  nothing:    '🤷 Did nothing'
};

const HELPED_LABELS = {
  1: 'Not at all 😞',
  2: 'A little 😕',
  3: 'Somewhat 😐',
  4: 'Quite a bit 🙂',
  5: 'A lot! 😄'
};

// ─── THEME ──────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('moodtrace_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('moodtrace_theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ─── STORAGE ────────────────────────────────────────────

function getEntries() {
  try {
    return JSON.parse(localStorage.getItem('moodtrace_entries') || '[]');
  } catch { return []; }
}

function saveEntries(entries) {
  localStorage.setItem('moodtrace_entries', JSON.stringify(entries));
}

function addEntry(entry) {
  const entries = getEntries();
  entry.id = Date.now();
  entries.unshift(entry);
  saveEntries(entries);
}

function updateEntry(id, updates) {
  const entries = getEntries().map(e => e.id === id ? { ...e, ...updates } : e);
  saveEntries(entries);
}

function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  saveEntries(getEntries().filter(e => e.id !== id));
  const filter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
  renderHistory(filter);
  updateEntryCount(filter);
}

function initDeleteListener() {
  const container = document.getElementById('historyList');
  if (!container) return;
  container.addEventListener('click', e => {
    const del  = e.target.closest('[data-delete-id]');
    const edit = e.target.closest('[data-edit-id]');
    if (del)  deleteEntry(Number(del.dataset.deleteId));
    if (edit) openEditModal(Number(edit.dataset.editId));
  });
}

// ─── HELPERS ────────────────────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDate(datetimeStr) {
  const d = new Date(datetimeStr);
  return {
    day:    d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date:   d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    time:   d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    hour:   d.getHours(),
    dayNum: d.getDate(),
    month:  d.getMonth(),
    year:   d.getFullYear()
  };
}

function nowFormatted() {
  return new Date().toISOString().slice(0, 16);
}

function getWellbeingLabel(avg) {
  return WELLBEING_LABELS.find(l => avg <= l.max)?.label || 'Excellent 🤩';
}

function calcStreak(entries) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const loggedDays = new Set(
    entries
      .filter(e => { const d = new Date(e.datetime); return d.getFullYear() === year && d.getMonth() === month; })
      .map(e => new Date(e.datetime).getDate())
  );

  let streak = 0;
  for (let d = today; d >= 1; d--) {
    if (loggedDays.has(d)) streak++;
    else break;
  }
  return { streak, loggedDays };
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTodayEntries() {
  const now = new Date();
  return getEntries().filter(e => {
    const d = new Date(e.datetime);
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  });
}

// ─── ONBOARDING ─────────────────────────────────────────

function checkOnboarding() {
  if (localStorage.getItem('moodtrace_onboarded')) return;
  showOnboarding();
}

function showOnboarding() {
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.style.display = 'flex';
}

function nextOnboardingStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(s => s.style.display = 'none');
  const next = document.getElementById(`onboardStep${step}`);
  if (next) next.style.display = 'block';
}

function finishOnboarding() {
  localStorage.setItem('moodtrace_onboarded', '1');
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.style.display = 'none';
}

// ─── ADD ENTRY PAGE ─────────────────────────────────────

let selectedEmoji    = '😄';
let selectedCategory = 'work';
let selectedCoping   = new Set();
let selectedHelped   = null;

function selectEmoji(el) {
  document.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedEmoji = el.dataset.emoji;
}

function selectChip(el, type) {
  document.querySelectorAll('.chip').forEach(c => { c.className = 'chip'; });
  el.classList.add('selected-' + type);
  selectedCategory = type;
}

function toggleCoping(el) {
  const action = el.dataset.action;
  if (selectedCoping.has(action)) { selectedCoping.delete(action); el.classList.remove('selected'); }
  else { selectedCoping.add(action); el.classList.add('selected'); }
}

function selectHelped(el) {
  document.querySelectorAll('.helped-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedHelped = parseInt(el.dataset.value);
}

function handleSubmit() {
  const intensity    = parseInt(document.getElementById('slider')?.value || 7);
  const datetime     = document.getElementById('entryDatetime')?.value;
  const description  = document.getElementById('description')?.value?.trim();
  const copingNotes  = document.getElementById('copingNotes')?.value?.trim() || '';

  if (!datetime)    { alert('Please pick a date and time.'); return; }
  if (!description) { alert('Please write something about how you feel.'); return; }

  // Coping suggestion if low mood and no coping selected
  if (intensity <= 4 && selectedCoping.size === 0) {
    const suggestion = getCopingSuggestion();
    if (suggestion) {
      const toastEl = document.getElementById('copingSuggestionToast');
      if (toastEl) {
        document.getElementById('copingSuggestionText').textContent = suggestion;
        toastEl.style.display = 'block';
        setTimeout(() => { toastEl.style.display = 'none'; }, 6000);
      }
    }
  }

  addEntry({
    emoji: selectedEmoji, intensity, category: selectedCategory,
    datetime, description,
    copingActions: [...selectedCoping], copingNotes, helpedRating: selectedHelped
  });

  showToast();
  handleClear();
}

function getCopingSuggestion() {
  // Find the highest-rated coping action from past entries
  const entries = getEntries();
  const copingMap = {};
  entries.forEach(e => {
    if (!e.copingActions?.length || !e.helpedRating) return;
    e.copingActions.forEach(action => {
      if (!copingMap[action]) copingMap[action] = [];
      copingMap[action].push(e.helpedRating);
    });
  });
  const sorted = Object.entries(copingMap)
    .map(([a, r]) => ({ action: a, avg: r.reduce((x, y) => x + y, 0) / r.length }))
    .sort((a, b) => b.avg - a.avg);
  if (!sorted.length) return null;
  const best = sorted[0];
  return `💡 Based on your history, "${COPING_LABELS[best.action]}" tends to help you most. Want to try it?`;
}

function handleClear() {
  document.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
  const first = document.querySelector('.emoji-option');
  if (first) { first.classList.add('selected'); selectedEmoji = first.dataset.emoji; }

  document.querySelectorAll('.chip').forEach(c => { c.className = 'chip'; });
  const firstChip = document.querySelector('.chip');
  if (firstChip) { firstChip.classList.add('selected-work'); selectedCategory = 'work'; }

  document.querySelectorAll('.coping-chip').forEach(c => c.classList.remove('selected'));
  selectedCoping = new Set();

  document.querySelectorAll('.helped-option').forEach(e => e.classList.remove('selected'));
  selectedHelped = null;

  const desc = document.getElementById('description');
  if (desc) desc.value = '';
  const cn = document.getElementById('copingNotes');
  if (cn) cn.value = '';
  const slider = document.getElementById('slider');
  if (slider) slider.value = 7;
  setText('sliderVal', '7');
  initDatetime();
}

function showToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

function initDatetime() {
  const input = document.getElementById('entryDatetime');
  if (input) input.value = nowFormatted();
}

// ─── EDIT MODAL ─────────────────────────────────────────

function openEditModal(id) {
  const entry = getEntries().find(e => e.id === id);
  if (!entry) return;

  // Populate modal fields
  document.getElementById('editEntryId').value         = id;
  document.getElementById('editDescription').value     = entry.description || '';
  document.getElementById('editDatetime').value        = entry.datetime || '';
  document.getElementById('editSlider').value          = entry.intensity || 7;
  document.getElementById('editSliderVal').textContent = entry.intensity || 7;

  // Emoji
  document.querySelectorAll('.edit-emoji-option').forEach(e => {
    e.classList.toggle('selected', e.dataset.emoji === entry.emoji);
  });

  // Category
  document.querySelectorAll('.edit-chip').forEach(c => {
    c.className = 'chip edit-chip';
    if (c.dataset.cat === entry.category) c.classList.add('selected-' + entry.category);
  });

  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

function saveEdit() {
  const id          = Number(document.getElementById('editEntryId').value);
  const description = document.getElementById('editDescription').value.trim();
  const datetime    = document.getElementById('editDatetime').value;
  const intensity   = parseInt(document.getElementById('editSlider').value);

  const selectedEmojiEl = document.querySelector('.edit-emoji-option.selected');
  const emoji = selectedEmojiEl ? selectedEmojiEl.dataset.emoji : '😊';

  const selectedCatEl = document.querySelector('.edit-chip[class*="selected-"]');
  const category = selectedCatEl ? selectedCatEl.dataset.cat : 'work';

  if (!description) { alert('Description cannot be empty.'); return; }

  updateEntry(id, { description, datetime, intensity, emoji, category });
  closeEditModal();
  const filter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
  renderHistory(filter);
}

function selectEditEmoji(el) {
  document.querySelectorAll('.edit-emoji-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

function selectEditChip(el, type) {
  document.querySelectorAll('.edit-chip').forEach(c => { c.className = 'chip edit-chip'; c.dataset.cat = c.dataset.cat; });
  el.classList.add('selected-' + type);
}

// ─── SEARCH ─────────────────────────────────────────────

let searchQuery = '';

function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    searchQuery = input.value.toLowerCase().trim();
    renderHistory(currentFilter);
  });
}

function applySearch(entries) {
  if (!searchQuery) return entries;
  return entries.filter(e =>
    e.description?.toLowerCase().includes(searchQuery) ||
    e.copingNotes?.toLowerCase().includes(searchQuery) ||
    CATEGORY_LABELS[e.category]?.toLowerCase().includes(searchQuery)
  );
}

// ─── HISTORY PAGE ───────────────────────────────────────

const PAGE_SIZE = 10;
let currentPage   = 1;
let currentFilter = 'all';

function getFilteredEntries(filter) {
  let entries = getEntries();
  if (filter === 'high')  entries = entries.filter(e => e.intensity >= 7);
  else if (filter === 'low')  entries = entries.filter(e => e.intensity <= 4);
  else if (filter !== 'all')  entries = entries.filter(e => e.category === filter);
  return applySearch(entries);
}

function renderHistory(filter = 'all') {
  currentFilter = filter;
  currentPage   = 1;
  const container = document.getElementById('historyList');
  if (!container) return;

  const entries = getFilteredEntries(filter);
  updateEntryCount(filter);

  if (entries.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--text-muted)">
        <div style="font-size:2.5rem;margin-bottom:1rem">📭</div>
        <p>${searchQuery ? 'No entries match your search.' : 'No entries found.'} <a href="add-entry.html" style="color:var(--purple-light)">Add one!</a></p>
      </div>`;
    return;
  }

  container.innerHTML = entries.slice(0, PAGE_SIZE).map(entryCard).join('');
  if (entries.length > PAGE_SIZE) {
    container.innerHTML += `<div style="text-align:center;margin-top:1.5rem"><button class="btn btn-ghost" onclick="loadMore()">Load more →</button></div>`;
  }
}

function loadMore() {
  currentPage++;
  const entries   = getFilteredEntries(currentFilter);
  const container = document.getElementById('historyList');
  if (!container) return;
  container.querySelector('.btn-ghost')?.parentElement?.remove();
  const start = (currentPage - 1) * PAGE_SIZE;
  container.innerHTML += entries.slice(start, start + PAGE_SIZE).map(entryCard).join('');
  if (entries.length > currentPage * PAGE_SIZE) {
    container.innerHTML += `<div style="text-align:center;margin-top:1.5rem"><button class="btn btn-ghost" onclick="loadMore()">Load more →</button></div>`;
  }
}

function entryCard(entry) {
  const { day, date, time } = formatDate(entry.datetime);
  const copingHtml = entry.copingActions?.length
    ? `<div class="coping-tags">${entry.copingActions.map(a => `<span class="coping-tag">${COPING_LABELS[a] || a}</span>`).join('')}</div>` : '';
  const copingNotesHtml = entry.copingNotes
    ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.35rem;font-style:italic">"${escHtml(entry.copingNotes)}"</div>` : '';
  const helpedHtml = entry.helpedRating
    ? `<span class="helped-badge">Helped: ${HELPED_LABELS[entry.helpedRating]}</span>` : '';

  return `
    <div class="history-card">
      <div class="history-card-left">
        <div class="history-emoji">${entry.emoji}</div>
        <div class="mood-score">${entry.intensity}/10</div>
      </div>
      <div class="history-body">
        <div class="history-top">
          <span class="history-heading">${escHtml(entry.description)}</span>
          <span class="badge ${BADGE_CLASSES[entry.category]}">${CATEGORY_LABELS[entry.category]}</span>
        </div>
        <div class="history-desc">${escHtml(entry.description)}</div>
        ${copingHtml}${copingNotesHtml}${helpedHtml}
      </div>
      <div class="history-right">
        <div class="history-day">${day}</div>
        <div class="history-date">${date}<br>${time}</div>
        <div style="display:flex;gap:0.4rem;margin-top:0.6rem;justify-content:flex-end">
          <button data-edit-id="${entry.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem;padding:0.2rem 0.4rem;border-radius:4px;transition:color 0.2s" onmouseover="this.style.color='#A78BFA'" onmouseout="this.style.color='var(--text-muted)'">✏️ edit</button>
          <button data-delete-id="${entry.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem;padding:0.2rem 0.4rem;border-radius:4px;transition:color 0.2s" onmouseover="this.style.color='#F472B6'" onmouseout="this.style.color='var(--text-muted)'">🗑 delete</button>
        </div>
      </div>
    </div>`;
}

function updateEntryCount(filter) {
  const el = document.getElementById('entryCount');
  if (!el) return;
  const count = getFilteredEntries(filter).length;
  el.textContent = count === 0 ? '' : `${count} entr${count === 1 ? 'y' : 'ies'}`;
}

function initHistoryFilters() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderHistory(chip.dataset.filter);
    });
  });
}

// ─── EXPORT ─────────────────────────────────────────────

function exportCSV() {
  const entries = getEntries();
  if (!entries.length) { alert('No entries to export.'); return; }
  const headers = ['Date', 'Time', 'Emoji', 'Mood Score', 'Category', 'Description', 'Coping Actions', 'Coping Notes', 'Helped Rating'];
  const rows = entries.map(e => {
    const { date, time } = formatDate(e.datetime);
    return [
      date, time, e.emoji, e.intensity,
      CATEGORY_LABELS[e.category] || e.category,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.copingActions || []).map(a => COPING_LABELS[a] || a).join(', ')}"`,
      `"${(e.copingNotes || '').replace(/"/g, '""')}"`,
      e.helpedRating ? HELPED_LABELS[e.helpedRating] : ''
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile('moodtrace-export.csv', csv, 'text/csv');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── REMINDERS / NOTIFICATIONS ──────────────────────────

function initReminders() {
  const toggle = document.getElementById('reminderToggle');
  if (!toggle) return;
  const saved = localStorage.getItem('moodtrace_reminder');
  toggle.checked = saved === '1';
  toggle.addEventListener('change', async () => {
    if (toggle.checked) {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toggle.checked = false; return; }
      }
      if (Notification.permission === 'granted') {
        localStorage.setItem('moodtrace_reminder', '1');
        scheduleReminder();
        alert('✅ Daily reminder set for 8:00 PM!');
      } else {
        toggle.checked = false;
        alert('Notifications are blocked. Please enable them in your browser settings.');
      }
    } else {
      localStorage.removeItem('moodtrace_reminder');
    }
  });
}

function scheduleReminder() {
  // Check every minute if it's time to remind (8:00 PM)
  const interval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 20 && now.getMinutes() === 0) {
      const todayEntries = getTodayEntries();
      if (!todayEntries.length && Notification.permission === 'granted') {
        new Notification('MoodTrace 🌙', {
          body: "You haven't logged your mood today. How are you feeling?",
          icon: 'moodtrace-logo.svg'
        });
      }
    }
  }, 60000);
}

function checkReminderOnLoad() {
  if (localStorage.getItem('moodtrace_reminder') === '1' &&
      Notification.permission === 'granted') {
    scheduleReminder();
  }
}

// ─── STREAK CALENDAR ────────────────────────────────────

function renderStreak() {
  const grid = document.getElementById('streakGrid');
  if (!grid) return;

  const entries    = getEntries();
  const now        = new Date();
  const year       = now.getFullYear();
  const month      = now.getMonth();
  const today      = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Count logs per day (multiple allowed)
  const dayLogs = {};
  entries.forEach(e => {
    const d = new Date(e.datetime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      dayLogs[day] = (dayLogs[day] || 0) + 1;
    }
  });

  const loggedDays = new Set(Object.keys(dayLogs).map(Number));
  const { streak }  = calcStreak(entries);

  setText('streakSub', `🔥 ${streak}-day streak · ${loggedDays.size} days logged this month`);

  grid.innerHTML = Array.from({ length: daysInMonth }, (_, i) => {
    const day   = i + 1;
    const count = dayLogs[day] || 0;
    let cls     = 'streak-day missed';
    if (day === today)        cls = 'streak-day today';
    else if (loggedDays.has(day)) cls = 'streak-day logged';
    const title = count > 1 ? `${count} entries` : count === 1 ? '1 entry' : 'no entry';
    return `<div class="${cls}" title="${title}">${day}${count > 1 ? `<span style="font-size:0.5rem;display:block;line-height:1">${count}x</span>` : ''}</div>`;
  }).join('');
}

// ─── AI MESSAGE CARD ────────────────────────────────────

async function loadAIMessage() {
  const card = document.getElementById('aiMessageCard');
  if (!card) return;

  // Only generate once per day
  const today  = new Date().toDateString();
  const cached = JSON.parse(localStorage.getItem('moodtrace_ai_msg') || '{}');
  if (cached.date === today && cached.message) {
    renderAIMessage(cached.message, card);
    return;
  }

  const todayEntries = getTodayEntries();
  const allEntries   = getEntries();

  // Need at least one entry to personalise
  if (!allEntries.length) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--purple),var(--teal));display:flex;align-items:center;justify-content:center;font-size:1.1rem">✨</div>
      <div>
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.95rem">Your Daily Message</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">Personalised just for you</div>
      </div>
    </div>
    <div style="color:var(--text-muted);font-size:0.9rem;display:flex;align-items:center;gap:0.5rem">
      <span style="animation:spin-slow 2s linear infinite;display:inline-block">✨</span> Generating your message…
    </div>`;

  try {
    const recentEntries = allEntries.slice(0, 5);
    const entrySummary  = recentEntries.map(e =>
      `- ${e.emoji} Mood ${e.intensity}/10 (${CATEGORY_LABELS[e.category]}): "${e.description}"${e.copingActions?.length ? ` | Coped with: ${e.copingActions.map(a => COPING_LABELS[a]).join(', ')}` : ''}`
    ).join('\n');

    const todaySummary = todayEntries.length
      ? `Today's entries:\n${todayEntries.map(e => `- ${e.emoji} ${e.intensity}/10: "${e.description}"`).join('\n')}`
      : "The user hasn't logged anything today yet.";

    const avgMood = +(recentEntries.reduce((s, e) => s + e.intensity, 0) / recentEntries.length).toFixed(1);

    const prompt = `You are a warm, empathetic friend who genuinely cares about someone's emotional wellbeing. 

Here is their recent mood data from MoodTrace, a personal mood tracking app:

Recent entries (newest first):
${entrySummary}

${todaySummary}

Their average mood recently: ${avgMood}/10

Write them a short, warm, personalised message (3-5 sentences) that:
- Acknowledges how they've actually been feeling based on their entries (don't be generic)
- Offers genuine empathy or a small celebration depending on their mood
- Gives one specific, practical, caring suggestion or encouragement
- Feels like it's coming from a close friend who has read their diary, not a robot
- Is uplifting but honest — don't dismiss real struggles with toxic positivity
- Ends with a gentle, caring nudge for the day

Do NOT use bullet points. Write in natural, warm prose. Keep it under 100 words.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data    = await response.json();
    const message = data.content?.[0]?.text?.trim();

    if (message) {
      localStorage.setItem('moodtrace_ai_msg', JSON.stringify({ date: today, message }));
      renderAIMessage(message, card);
    } else {
      card.style.display = 'none';
    }
  } catch (err) {
    console.error('AI message error:', err);
    card.style.display = 'none';
  }
}

function renderAIMessage(message, card) {
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--purple),var(--teal));display:flex;align-items:center;justify-content:center;font-size:1.1rem">✨</div>
      <div>
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.95rem">Your Daily Message</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">Personalised just for you</div>
      </div>
      <button onclick="refreshAIMessage()" title="Refresh" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:0.25rem;border-radius:6px;transition:color 0.2s" onmouseover="this.style.color='var(--purple-light)'" onmouseout="this.style.color='var(--text-muted)'">↻</button>
    </div>
    <p style="font-size:0.92rem;line-height:1.7;color:var(--text)">${escHtml(message)}</p>`;
}

function refreshAIMessage() {
  localStorage.removeItem('moodtrace_ai_msg');
  loadAIMessage();
}

// ─── ANALYTICS ──────────────────────────────────────────

function getAnalyticsData() {
  const entries    = getEntries();
  const now        = new Date();
  const year       = now.getFullYear();
  const month      = now.getMonth();
  const monthName  = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const allScores = entries.map(e => e.intensity);
  const avgAll    = allScores.length ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0;
  const best      = entries.length ? entries.reduce((a, b) => a.intensity > b.intensity ? a : b) : null;
  const worst     = entries.length ? entries.reduce((a, b) => a.intensity < b.intensity ? a : b) : null;

  const catCount  = { work: 0, money: 0, rel: 0, health: 0 };
  const catTotals = { work: [], money: [], rel: [], health: [] };
  entries.forEach(e => {
    if (catCount[e.category] !== undefined) {
      catCount[e.category]++;
      catTotals[e.category].push(e.intensity);
    }
  });
  const catAvgs = Object.fromEntries(
    Object.entries(catTotals).map(([k, v]) => [k, v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 0])
  );
  const topCat  = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
  const total   = Object.values(catCount).reduce((a, b) => a + b, 0);
  const catPcts = Object.fromEntries(Object.entries(catCount).map(([k, v]) => [k, total ? Math.round((v / total) * 100) : 0]));

  // Daily trend (avg per day this month, multiple entries allowed)
  const dailyMap = {};
  entries.forEach(e => {
    const d = new Date(e.datetime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dailyMap[day]) dailyMap[day] = [];
      dailyMap[day].push(e.intensity);
    }
  });
  const trendLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const trendData   = trendLabels.map(day =>
    dailyMap[day] ? +(dailyMap[day].reduce((a, b) => a + b, 0) / dailyMap[day].length).toFixed(1) : null
  );

  // Mood by time of day (Morning 6-12, Afternoon 12-18, Evening 18-24, Night 0-6)
  const timeSlots = { Morning: [], Afternoon: [], Evening: [], Night: [] };
  entries.forEach(e => {
    const h = new Date(e.datetime).getHours();
    if      (h >= 6  && h < 12) timeSlots.Morning.push(e.intensity);
    else if (h >= 12 && h < 18) timeSlots.Afternoon.push(e.intensity);
    else if (h >= 18 && h < 24) timeSlots.Evening.push(e.intensity);
    else                         timeSlots.Night.push(e.intensity);
  });
  const timeAvgs = Object.fromEntries(
    Object.entries(timeSlots).map(([k, v]) => [k, v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null])
  );

  // Coping effectiveness
  const copingMap = {};
  entries.forEach(e => {
    if (!e.copingActions?.length || !e.helpedRating) return;
    e.copingActions.forEach(a => {
      if (!copingMap[a]) copingMap[a] = [];
      copingMap[a].push(e.helpedRating);
    });
  });
  const copingEffectiveness = Object.entries(copingMap)
    .map(([action, ratings]) => ({ action, avg: +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1), count: ratings.length }))
    .sort((a, b) => b.avg - a.avg);

  return { avgAll, best, worst, topCat, catCount, catAvgs, catPcts, trendLabels, trendData, timeAvgs, monthName, entries, copingEffectiveness };
}

function renderAnalytics() {
  const { avgAll, best, worst, topCat, catCount, catAvgs, catPcts, trendLabels, trendData, timeAvgs, monthName, entries, copingEffectiveness } = getAnalyticsData();

  setText('analyticsSubtitle', `Patterns and trends from all your entries — ${monthName}`);

  if (!entries.length) {
    const noData  = document.getElementById('noDataMsg');
    const charts  = document.getElementById('chartsSection');
    if (noData) noData.style.display  = 'block';
    if (charts) charts.style.display  = 'none';
    return;
  }

  setText('aAvgMood',    avgAll ? `${avgAll} / 10` : '—');
  setText('aBestDay',    best  ? formatDate(best.datetime).date  : '—');
  setText('aWorstDay',   worst ? formatDate(worst.datetime).date : '—');
  setText('aTopTrigger', topCat?.[0] ? CATEGORY_LABELS[topCat[0]] : '—');

  setText('pctWork',  `${catPcts.work}%`);
  setText('pctMoney', `${catPcts.money}%`);
  setText('pctHealth',`${catPcts.health}%`);
  setText('pctRel',   `${catPcts.rel}%`);

  renderStreak();
  renderCharts({ trendLabels, trendData, catCount, catAvgs, timeAvgs, copingEffectiveness });
}

// ─── MONTHLY SUMMARY ────────────────────────────────────

function renderMonthlySummary() {
  const container = document.getElementById('monthlySummary');
  if (!container) return;

  const entries   = getEntries();
  const now       = new Date();
  const year      = now.getFullYear();
  const month     = now.getMonth();
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const monthEntries = entries.filter(e => {
    const d = new Date(e.datetime);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  if (!monthEntries.length) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted)"><div style="font-size:2.5rem">📅</div><p>No entries for ${monthName} yet.</p></div>`;
    return;
  }

  const scores  = monthEntries.map(e => e.intensity);
  const avg     = +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  const bestE   = monthEntries.reduce((a, b) => a.intensity > b.intensity ? a : b);
  const worstE  = monthEntries.reduce((a, b) => a.intensity < b.intensity ? a : b);

  const catCount = {};
  monthEntries.forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + 1; });
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

  const copingCount = {};
  monthEntries.forEach(e => {
    (e.copingActions || []).forEach(a => { copingCount[a] = (copingCount[a] || 0) + 1; });
  });
  const topCoping = Object.entries(copingCount).sort((a, b) => b[1] - a[1])[0];

  const { streak, loggedDays } = calcStreak(monthEntries);

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:2rem">
      <div class="page-tag" style="display:inline-flex">📅 ${monthName}</div>
      <h2 style="font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;margin-top:0.5rem">Monthly Summary</h2>
    </div>
    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="card stat-card purple" style="text-align:center">
        <div style="font-size:3rem;margin-bottom:0.5rem">${avg >= 7 ? '😄' : avg >= 5 ? '😊' : '😟'}</div>
        <div class="stat-label">Average Mood</div>
        <div class="stat-value purple">${avg}/10</div>
        <div class="stat-sub">${getWellbeingLabel(avg)}</div>
      </div>
      <div class="card stat-card teal" style="text-align:center">
        <div style="font-size:3rem;margin-bottom:0.5rem">📝</div>
        <div class="stat-label">Total Entries</div>
        <div class="stat-value teal">${monthEntries.length}</div>
        <div class="stat-sub">${loggedDays.size} days logged · ${streak}-day streak</div>
      </div>
      <div class="card stat-card pink" style="text-align:center">
        <div style="font-size:3rem;margin-bottom:0.5rem">🔁</div>
        <div class="stat-label">Top Issue</div>
        <div class="stat-value pink" style="font-size:1.2rem">${CATEGORY_LABELS[topCat[0]]}</div>
        <div class="stat-sub">${topCat[1]} entries</div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card" style="padding:1.5rem">
        <div class="section-title">Best Day</div>
        <div style="display:flex;align-items:center;gap:1rem;margin-top:0.75rem">
          <div style="font-size:2.5rem">${bestE.emoji}</div>
          <div>
            <div style="font-weight:600">${formatDate(bestE.datetime).date}</div>
            <div style="font-size:0.82rem;color:var(--text-muted)">${escHtml(bestE.description)}</div>
            <div style="font-size:0.82rem;color:var(--teal-light);margin-top:0.25rem">Score: ${bestE.intensity}/10</div>
          </div>
        </div>
      </div>
      <div class="card" style="padding:1.5rem">
        <div class="section-title">Toughest Day</div>
        <div style="display:flex;align-items:center;gap:1rem;margin-top:0.75rem">
          <div style="font-size:2.5rem">${worstE.emoji}</div>
          <div>
            <div style="font-weight:600">${formatDate(worstE.datetime).date}</div>
            <div style="font-size:0.82rem;color:var(--text-muted)">${escHtml(worstE.description)}</div>
            <div style="font-size:0.82rem;color:var(--orange-light);margin-top:0.25rem">Score: ${worstE.intensity}/10</div>
          </div>
        </div>
      </div>
    </div>
    ${topCoping ? `
    <div class="card" style="padding:1.5rem;margin-top:1.25rem;text-align:center">
      <div style="font-size:0.75rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem">Most Used Coping Action</div>
      <div style="font-size:1.5rem;font-family:'Syne',sans-serif;font-weight:700;color:var(--teal-light)">${COPING_LABELS[topCoping[0]]}</div>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-top:0.25rem">Used ${topCoping[1]} times this month</div>
    </div>` : ''}
    <div style="text-align:center;margin-top:1.5rem">
      <button class="btn btn-teal" onclick="exportCSV()">📤 Export This Month</button>
    </div>`;
}

// ─── CHARTS ─────────────────────────────────────────────

let chartInstances = {};

function renderCharts({ trendLabels, trendData, catCount, catAvgs, timeAvgs, copingEffectiveness }) {
  if (typeof Chart === 'undefined') { console.warn('Chart.js not loaded'); return; }

  Chart.defaults.color       = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#9B8FBF';
  Chart.defaults.font.family = "'DM Sans', sans-serif";

  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};

  // Trend line
  const trendCanvas = document.getElementById('trendChart');
  if (trendCanvas) {
    chartInstances.trend = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Mood', data: trendData,
          borderColor: '#A78BFA', backgroundColor: 'rgba(167,139,250,0.12)',
          borderWidth: 2.5, pointBackgroundColor: '#A78BFA', pointBorderColor: '#0F0A1E',
          pointBorderWidth: 2, pointRadius: 5, tension: 0.4, fill: true, spanGaps: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { min: 0, max: 10, ticks: { stepSize: 2 }, grid: { color: 'rgba(167,139,250,0.08)' } },
          x: { grid: { display: false } }
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw !== null ? ` Score: ${ctx.raw}/10` : ' No entry' } } }
      }
    });
  }

  // Donut
  const donutCanvas = document.getElementById('donutChart');
  if (donutCanvas) {
    chartInstances.donut = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Work', 'Money', 'Relationships', 'Health'],
        datasets: [{ data: [catCount.work, catCount.money, catCount.rel, catCount.health], backgroundColor: ['#7C3AED','#5EEAD4','#FB923C','#F472B6'], borderWidth: 0, hoverOffset: 8 }]
      },
      options: { cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} entries` } } } }
    });
  }

  // Avg by category
  const avgCanvas = document.getElementById('avgChart');
  if (avgCanvas) {
    chartInstances.avg = new Chart(avgCanvas, {
      type: 'bar',
      data: {
        labels: ['💼 Work','💰 Money','❤️ Relationships','🏃 Health'],
        datasets: [{ data: [catAvgs.work,catAvgs.money,catAvgs.rel,catAvgs.health], backgroundColor: ['rgba(124,58,237,0.75)','rgba(94,234,212,0.75)','rgba(244,114,182,0.75)','rgba(251,146,60,0.75)'], borderRadius: 6, borderSkipped: false }]
      },
      options: { indexAxis: 'y', responsive: true, scales: { x: { min:0,max:10,grid:{color:'rgba(167,139,250,0.08)'} }, y: { grid:{display:false} } }, plugins: { legend:{display:false}, tooltip:{callbacks:{label:ctx=>` Avg: ${ctx.raw}/10`}} } }
    });
  }

  // Mood by time of day
  const timeCanvas = document.getElementById('timeChart');
  if (timeCanvas) {
    const timeData = [timeAvgs.Morning, timeAvgs.Afternoon, timeAvgs.Evening, timeAvgs.Night];
    chartInstances.time = new Chart(timeCanvas, {
      type: 'bar',
      data: {
        labels: ['🌅 Morning','☀️ Afternoon','🌆 Evening','🌙 Night'],
        datasets: [{ data: timeData, backgroundColor: ['rgba(251,146,60,0.75)','rgba(167,139,250,0.75)','rgba(94,234,212,0.75)','rgba(124,58,237,0.75)'], borderRadius: 6, borderSkipped: false }]
      },
      options: { responsive: true, scales: { y:{min:0,max:10,grid:{color:'rgba(167,139,250,0.08)'}}, x:{grid:{display:false}} }, plugins: { legend:{display:false}, tooltip:{callbacks:{label:ctx=>ctx.raw!==null?` Avg: ${ctx.raw}/10`:' No data'}} } }
    });
  }

  // Coping effectiveness
  const copingCanvas = document.getElementById('copingChart');
  const noCopingMsg  = document.getElementById('noCopingMsg');
  const copingWrap   = document.getElementById('copingChartWrap');
  if (copingCanvas) {
    if (!copingEffectiveness?.length) {
      if (copingWrap)  copingWrap.style.display  = 'none';
      if (noCopingMsg) noCopingMsg.style.display = 'block';
    } else {
      if (copingWrap)  copingWrap.style.display  = 'block';
      if (noCopingMsg) noCopingMsg.style.display = 'none';
      chartInstances.coping = new Chart(copingCanvas, {
        type: 'bar',
        data: {
          labels: copingEffectiveness.map(c => COPING_LABELS[c.action] || c.action),
          datasets: [{ data: copingEffectiveness.map(c => c.avg), backgroundColor: copingEffectiveness.map((_, i) => ['rgba(94,234,212,0.75)','rgba(167,139,250,0.75)','rgba(251,146,60,0.75)','rgba(244,114,182,0.75)','rgba(124,58,237,0.75)'][i%5]), borderRadius:6, borderSkipped:false }]
        },
        options: { indexAxis:'y', responsive:true, scales: { x:{min:0,max:5,ticks:{stepSize:1},grid:{color:'rgba(167,139,250,0.08)'},title:{display:true,text:'Avg helpfulness (1–5)',color:'#9B8FBF',font:{size:11}}}, y:{grid:{display:false}} }, plugins: { legend:{display:false}, tooltip:{callbacks:{label:ctx=>{ const item=copingEffectiveness[ctx.dataIndex]; return ` Avg: ${ctx.raw}/5 · used ${item.count} time${item.count>1?'s':''}`;}}} } }
      });
    }
  }
}

// ─── DASHBOARD ──────────────────────────────────────────

function renderDashboard() {
  const entries = getEntries();
  const now     = new Date();
  const todayStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  setText('todayLabel', todayStr);

  if (!entries.length) {
    setText('welcomeMsg', 'Welcome to MoodTrace! 👋');
    setText('welcomeSub', 'Start logging your mood to see your insights here.');
    loadAIMessage();
    return;
  }

  const scores = entries.map(e => e.intensity);
  const avg    = +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  const worst  = entries.reduce((a, b) => a.intensity < b.intensity ? a : b);
  const best   = entries.reduce((a, b) => a.intensity > b.intensity ? a : b);

  const catCount = {};
  entries.forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + 1; });
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

  const monthEntries = entries.filter(e => {
    const d = new Date(e.datetime);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const { streak } = calcStreak(entries);

  setText('statAvgMood',     avg);
  setText('statAvgSub',      avg >= 7 ? '↑ Above average — great job!' : avg >= 5 ? 'Holding steady' : '↓ Below average — hang in there');
  setText('statEntryCount',  monthEntries.length);
  setText('statStreakSub',   `${streak}-day current streak 🔥`);
  setText('statWorstDay',    formatDate(worst.datetime).date);
  setText('statWorstSub',    `Score ${worst.intensity}/10 — ${CATEGORY_LABELS[worst.category]}`);
  setText('statTopIssue',    CATEGORY_LABELS[topCat[0]]?.replace(/💼|💰|❤️|🏃/g,'').trim() || topCat[0]);
  setText('statTopIssueSub', `${topCat[1]} of ${entries.length} total entries`);
  setText('statBestDay',     formatDate(best.datetime).date);
  setText('statBestSub',     `Score ${best.intensity}/10 — ${CATEGORY_LABELS[best.category]}`);
  setText('statWellbeing',   getWellbeingLabel(avg));

  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  setText('welcomeMsg', `${greeting}! You're doing great.`);
  setText('welcomeSub',  `You've logged ${monthEntries.length} entr${monthEntries.length === 1 ? 'y' : 'ies'} this month. Keep it up!`);

  // Today's logs count
  const todayCount = getTodayEntries().length;
  const todayBadge = document.getElementById('todayLogCount');
  if (todayBadge) todayBadge.textContent = todayCount ? `${todayCount} log${todayCount > 1 ? 's' : ''} today` : 'Not logged today';

  // Recent entries (last 4)
  const recentContainer = document.getElementById('recentEntries');
  if (recentContainer) {
    recentContainer.innerHTML = entries.slice(0, 4).map(entry => `
      <div class="entry-row">
        <div class="entry-emoji">${entry.emoji}</div>
        <div class="entry-info">
          <div class="entry-title">${escHtml(entry.description)}</div>
          <div class="entry-meta">${formatDate(entry.datetime).date} · ${formatDate(entry.datetime).time}</div>
        </div>
        <span class="badge ${BADGE_CLASSES[entry.category]}">${CATEGORY_LABELS[entry.category]}</span>
        <div class="entry-date">${entry.intensity}/10</div>
      </div>`).join('');
  }

  loadAIMessage();
}

// ─── PAGE INIT ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkReminderOnLoad();

  const page = document.body.dataset.page;

  if (page === 'dashboard') {
    checkOnboarding();
    renderDashboard();
    initReminders();
  }

  if (page === 'add-entry') {
    initDatetime();
  }

  if (page === 'history') {
    initDeleteListener();
    initSearch();
    renderHistory();
    initHistoryFilters();
  }

  if (page === 'analytics') {
    renderAnalytics();
  }

  if (page === 'monthly') {
    renderMonthlySummary();
  }
});
