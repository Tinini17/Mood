//  CONSTANTS

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
  { max: 2,  label: 'Very Low 😔' },
  { max: 4,  label: 'Low 😟' },
  { max: 6,  label: 'Okay 😐' },
  { max: 7.5,label: 'Good 😊' },
  { max: 9,  label: 'Great 😄' },
  { max: 10, label: 'Excellent 🤩' }
];

//STORAGE 

function getEntries() {
  try {
    return JSON.parse(localStorage.getItem('moodtrace_entries') || '[]');
  } catch {
    return [];
  }
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

function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  const entries = getEntries().filter(e => e.id !== id);
  saveEntries(entries);
  const filter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
  renderHistory(filter);
  updateEntryCount(filter);
}

function initDeleteListener() {
  const container = document.getElementById('historyList');
  if (!container) return;
  container.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-delete-id]');
    if (!btn) return;
    deleteEntry(Number(btn.dataset.deleteId));
  });
}

//  HELPERS

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDate(datetimeStr) {
  const d = new Date(datetimeStr);
  return {
    day:  d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    dayNum: d.getDate(),
    month: d.getMonth(),
    year: d.getFullYear()
  };
}

function nowFormatted() {
  return new Date().toISOString().slice(0, 16);
}

function getWellbeingLabel(avg) {
  return WELLBEING_LABELS.find(l => avg <= l.max)?.label || 'Excellent 🤩';
}

function calcStreak(entries) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const loggedDays = new Set(
    entries
      .filter(e => {
        const d = new Date(e.datetime);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map(e => new Date(e.datetime).getDate())
  );

  let streak = 0;
  for (let d = today; d >= 1; d--) {
    if (loggedDays.has(d)) streak++;
    else break;
  }
  return { streak, loggedDays };
}

// ADD ENTRY PAGE 

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
  if (selectedCoping.has(action)) {
    selectedCoping.delete(action);
    el.classList.remove('selected');
  } else {
    selectedCoping.add(action);
    el.classList.add('selected');
  }
}

function selectHelped(el) {
  document.querySelectorAll('.helped-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedHelped = parseInt(el.dataset.value);
}

function handleSubmit() {
  const intensity   = parseInt(document.getElementById('slider')?.value || 7);
  const datetime    = document.getElementById('entryDatetime')?.value;
  const description = document.getElementById('description')?.value?.trim();
  const copingNotes = document.getElementById('copingNotes')?.value?.trim() || '';

  if (!datetime) {
    alert('Please pick a date and time.');
    return;
  }
  if (!description) {
    alert('Please write something about how you feel.');
    return;
  }

  addEntry({
    emoji: selectedEmoji,
    intensity,
    category: selectedCategory,
    datetime,
    description,
    copingActions: [...selectedCoping],
    copingNotes,
    helpedRating: selectedHelped
  });
  showToast();
  handleClear();
}

function handleClear() {
  // Reset emoji
  document.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
  const first = document.querySelector('.emoji-option');
  if (first) { first.classList.add('selected'); selectedEmoji = first.dataset.emoji; }

  // Reset chip
  document.querySelectorAll('.chip').forEach(c => { c.className = 'chip'; });
  const firstChip = document.querySelector('.chip');
  if (firstChip) { firstChip.classList.add('selected-work'); selectedCategory = 'work'; }

  // Reset coping
  document.querySelectorAll('.coping-chip').forEach(c => c.classList.remove('selected'));
  selectedCoping = new Set();

  // Reset helped
  document.querySelectorAll('.helped-option').forEach(e => e.classList.remove('selected'));
  selectedHelped = null;

  // Reset fields
  const desc = document.getElementById('description');
  if (desc) desc.value = '';
  const copingNotes = document.getElementById('copingNotes');
  if (copingNotes) copingNotes.value = '';
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

//  HISTORY PAGE 

const PAGE_SIZE = 10;
let currentPage = 1;
let currentFilter = 'all';

function getFilteredEntries(filter) {
  const entries = getEntries();
  if (filter === 'high')  return entries.filter(e => e.intensity >= 7);
  if (filter === 'low')   return entries.filter(e => e.intensity <= 4);
  if (filter === 'all')   return entries;
  return entries.filter(e => e.category === filter);
}

function renderHistory(filter = 'all') {
  currentFilter = filter;
  currentPage = 1;
  const container = document.getElementById('historyList');
  if (!container) return;

  const entries = getFilteredEntries(filter);
  updateEntryCount(filter);

  if (entries.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--text-muted)">
        <div style="font-size:2.5rem;margin-bottom:1rem">📭</div>
        <p>No entries found. <a href="add-entry.html" style="color:var(--purple-light)">Add one!</a></p>
      </div>`;
    return;
  }

  const toShow = entries.slice(0, PAGE_SIZE);
  container.innerHTML = toShow.map(entryCard).join('');

  // Load more button
  if (entries.length > PAGE_SIZE) {
    container.innerHTML += `
      <div style="text-align:center;margin-top:1.5rem">
        <button class="btn btn-ghost" onclick="loadMore()">Load more entries →</button>
      </div>`;
  }
}

function loadMore() {
  currentPage++;
  const entries = getFilteredEntries(currentFilter);
  const container = document.getElementById('historyList');
  if (!container) return;

  // Remove old load more button
  const oldBtn = container.querySelector('.btn-ghost')?.parentElement;
  if (oldBtn) oldBtn.remove();

  const start = (currentPage - 1) * PAGE_SIZE;
  const toShow = entries.slice(start, start + PAGE_SIZE);
  container.innerHTML += toShow.map(entryCard).join('');

  if (entries.length > currentPage * PAGE_SIZE) {
    container.innerHTML += `
      <div style="text-align:center;margin-top:1.5rem">
        <button class="btn btn-ghost" onclick="loadMore()">Load more entries →</button>
      </div>`;
  }
}

function entryCard(entry) {
  const { day, date, time } = formatDate(entry.datetime);

  const COPING_LABELS = {
    meditated: '🧘 Meditated', exercised: '🏃 Exercised', talked: '💬 Talked to someone',
    journalled: '📖 Journalled', rested: '😴 Rested', music: '🎵 Music',
    walked: '🚶 Walked', breathed: '🌬️ Breathing', ate: '🍽️ Ate well', nothing: '🤷 Did nothing'
  };

  const HELPED_LABELS = { 1: 'Not at all 😞', 2: 'A little 😕', 3: 'Somewhat 😐', 4: 'Quite a bit 🙂', 5: 'A lot! 😄' };

  const copingHtml = entry.copingActions?.length
    ? `<div class="coping-tags">${entry.copingActions.map(a => `<span class="coping-tag">${COPING_LABELS[a] || a}</span>`).join('')}</div>`
    : '';

  const copingNotesHtml = entry.copingNotes
    ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.35rem;font-style:italic">"${escHtml(entry.copingNotes)}"</div>`
    : '';

  const helpedHtml = entry.helpedRating
    ? `<span class="helped-badge">Helped: ${HELPED_LABELS[entry.helpedRating]}</span>`
    : '';

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
        ${copingHtml}
        ${copingNotesHtml}
        ${helpedHtml}
      </div>
      <div class="history-right">
        <div class="history-day">${day}</div>
        <div class="history-date">${date}<br>${time}</div>
        <button data-delete-id="${entry.id}"
          style="margin-top:0.6rem;background:none;border:none;color:var(--text-muted);
                 cursor:pointer;font-size:0.75rem;padding:0.2rem 0.4rem;border-radius:4px;
                 transition:color 0.2s;" onmouseover="this.style.color='#F472B6'"
          onmouseout="this.style.color='var(--text-muted)'">
          🗑 delete
        </button>
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

// STREAK CALENDAR 

function renderStreak() {
  const grid = document.getElementById('streakGrid');
  if (!grid) return;

  const entries = getEntries();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const { streak, loggedDays } = calcStreak(entries);

  setText('streakSub', `🔥 ${streak}-day streak · ${loggedDays.size} days logged`);

  grid.innerHTML = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    let cls = 'streak-day missed';
    if (day === today)          cls = 'streak-day today';
    else if (loggedDays.has(day)) cls = 'streak-day logged';
    return `<div class="${cls}">${day}</div>`;
  }).join('');
}

// ANALYTICS PAGE 

function getAnalyticsData() {
  const entries = getEntries();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // All-time stats
  const allScores = entries.map(e => e.intensity);
  const avgAll = allScores.length
    ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0;

  const best  = entries.length ? entries.reduce((a, b) => a.intensity > b.intensity ? a : b) : null;
  const worst = entries.length ? entries.reduce((a, b) => a.intensity < b.intensity ? a : b) : null;

  const catCount = { work: 0, money: 0, rel: 0, health: 0 };
  const catTotals = { work: [], money: [], rel: [], health: [] };
  entries.forEach(e => {
    if (catCount[e.category] !== undefined) {
      catCount[e.category]++;
      catTotals[e.category].push(e.intensity);
    }
  });
  const catAvgs = Object.fromEntries(
    Object.entries(catTotals).map(([k, v]) => [
      k, v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 0
    ])
  );
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(catCount).reduce((a, b) => a + b, 0);
  const catPcts = Object.fromEntries(
    Object.entries(catCount).map(([k, v]) => [k, total ? Math.round((v / total) * 100) : 0])
  );

  // Daily scores for this month (trend chart)
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
    dailyMap[day]
      ? +(dailyMap[day].reduce((a, b) => a + b, 0) / dailyMap[day].length).toFixed(1)
      : null
  );

  // Coping effectiveness — avg helpedRating per action
  const copingMap = {};
  entries.forEach(e => {
    if (!e.copingActions?.length || !e.helpedRating) return;
    e.copingActions.forEach(action => {
      if (!copingMap[action]) copingMap[action] = [];
      copingMap[action].push(e.helpedRating);
    });
  });
  const copingEffectiveness = Object.entries(copingMap)
    .map(([action, ratings]) => ({
      action,
      avg: +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
      count: ratings.length
    }))
    .sort((a, b) => b.avg - a.avg);

  return { avgAll, best, worst, topCat, catCount, catAvgs, catPcts, trendLabels, trendData, monthName, entries, copingEffectiveness };
}

function renderAnalytics() {
  const data = getAnalyticsData();
  const { avgAll, best, worst, topCat, catCount, catAvgs, catPcts, trendLabels, trendData, monthName, entries, copingEffectiveness } = data;

  // Subtitle
  setText('analyticsSubtitle', `Patterns and trends from all your entries — ${monthName}`);

  if (entries.length === 0) {
    const noData = document.getElementById('noDataMsg');
    const charts = document.getElementById('chartsSection');
    if (noData) noData.style.display = 'block';
    if (charts) charts.style.display = 'none';
    return;
  }

  // Mini stats
  setText('aAvgMood',    avgAll ? `${avgAll} / 10` : '—');
  setText('aBestDay',    best  ? formatDate(best.datetime).date  : '—');
  setText('aWorstDay',   worst ? formatDate(worst.datetime).date : '—');
  setText('aTopTrigger', topCat?.[0] ? CATEGORY_LABELS[topCat[0]] : '—');

  // Donut legend percentages
  setText('pctWork',   `${catPcts.work}%`);
  setText('pctMoney',  `${catPcts.money}%`);
  setText('pctHealth', `${catPcts.health}%`);
  setText('pctRel',    `${catPcts.rel}%`);

  // Streak
  renderStreak();

  // Charts
  renderCharts({ trendLabels, trendData, catCount, catAvgs, copingEffectiveness });
}

// CHARTS (Chart.js) 

let chartInstances = {};

function renderCharts({ trendLabels, trendData, catCount, catAvgs, copingEffectiveness }) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }

  Chart.defaults.color = '#9B8FBF';
  Chart.defaults.font.family = "'DM Sans', sans-serif";

  // Destroy old instances if re-rendering
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};

  // Trend line chart
  const trendCanvas = document.getElementById('trendChart');
  if (trendCanvas) {
    chartInstances.trend = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Mood',
          data: trendData,
          borderColor: '#A78BFA',
          backgroundColor: 'rgba(167,139,250,0.12)',
          borderWidth: 2.5,
          pointBackgroundColor: '#A78BFA',
          pointBorderColor: '#0F0A1E',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.4,
          fill: true,
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0, max: 10,
            ticks: { stepSize: 2 },
            grid: { color: 'rgba(167,139,250,0.08)' }
          },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.raw !== null ? ` Score: ${ctx.raw}/10` : ' No entry'
            }
          }
        }
      }
    });
  }

  // Donut chart
  const donutCanvas = document.getElementById('donutChart');
  if (donutCanvas) {
    chartInstances.donut = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Work', 'Money', 'Relationships', 'Health'],
        datasets: [{
          data: [catCount.work, catCount.money, catCount.rel, catCount.health],
          backgroundColor: ['#7C3AED', '#5EEAD4', '#FB923C', '#F472B6'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} entries` }
          }
        }
      }
    });
  }

  // Horizontal bar: avg per category
  const avgCanvas = document.getElementById('avgChart');
  if (avgCanvas) {
    chartInstances.avg = new Chart(avgCanvas, {
      type: 'bar',
      data: {
        labels: ['💼 Work', '💰 Money', '❤️ Relationships', '🏃 Health'],
        datasets: [{
          data: [catAvgs.work, catAvgs.money, catAvgs.rel, catAvgs.health],
          backgroundColor: [
            'rgba(124,58,237,0.75)',
            'rgba(94,234,212,0.75)',
            'rgba(244,114,182,0.75)',
            'rgba(251,146,60,0.75)'
          ],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        scales: {
          x: {
            min: 0, max: 10,
            grid: { color: 'rgba(167,139,250,0.08)' }
          },
          y: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` Avg: ${ctx.raw}/10` }
          }
        }
      }
    });
  }

  // Coping effectiveness chart 
  const copingCanvas = document.getElementById('copingChart');
  const noCopingMsg  = document.getElementById('noCopingMsg');
  const copingWrap   = document.getElementById('copingChartWrap');

  if (copingCanvas) {
    if (!copingEffectiveness || !copingEffectiveness.length) {
      if (copingWrap)  copingWrap.style.display  = 'none';
      if (noCopingMsg) noCopingMsg.style.display = 'block';
    } else {
      if (copingWrap)  copingWrap.style.display  = 'block';
      if (noCopingMsg) noCopingMsg.style.display = 'none';

      const COPING_LABELS = {
        meditated: '🧘 Meditated', exercised: '🏃 Exercised', talked: '💬 Talked to someone',
        journalled: '📖 Journalled', rested: '😴 Rested', music: '🎵 Music',
        walked: '🚶 Walked', breathed: '🌬️ Breathing', ate: '🍽️ Ate well', nothing: '🤷 Did nothing'
      };

      chartInstances.coping = new Chart(copingCanvas, {
        type: 'bar',
        data: {
          labels: copingEffectiveness.map(c => COPING_LABELS[c.action] || c.action),
          datasets: [{
            data: copingEffectiveness.map(c => c.avg),
            backgroundColor: copingEffectiveness.map((_, i) => {
              const colors = ['rgba(94,234,212,0.75)','rgba(167,139,250,0.75)','rgba(251,146,60,0.75)','rgba(244,114,182,0.75)','rgba(124,58,237,0.75)'];
              return colors[i % colors.length];
            }),
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          scales: {
            x: {
              min: 0, max: 5,
              ticks: { stepSize: 1 },
              grid: { color: 'rgba(167,139,250,0.08)' },
              title: { display: true, text: 'Avg helpfulness (1–5)', color: '#9B8FBF', font: { size: 11 } }
            },
            y: { grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const item = copingEffectiveness[ctx.dataIndex];
                  return ` Avg: ${ctx.raw}/5 · used ${item.count} time${item.count > 1 ? 's' : ''}`;
                }
              }
            }
          }
        }
      });
    }
  }
}

// DASHBOARD

function renderDashboard() {
  const entries = getEntries();

  // Today label
  const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  setText('todayLabel', todayStr);

  if (entries.length === 0) {
    setText('welcomeMsg', "Welcome to MoodTrace! 👋");
    setText('welcomeSub', "Start logging your mood to see your insights here.");
    return;
  }

  // Stats
  const scores = entries.map(e => e.intensity);
  const avg    = +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  const worst  = entries.reduce((a, b) => a.intensity < b.intensity ? a : b);
  const best   = entries.reduce((a, b) => a.intensity > b.intensity ? a : b);

  const catCount = {};
  entries.forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + 1; });
  const topCat   = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

  // This month entry count
  const now = new Date();
  const monthEntries = entries.filter(e => {
    const d = new Date(e.datetime);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const { streak } = calcStreak(entries);

  // Update stat cards
  setText('statAvgMood',    avg);
  setText('statAvgSub',     avg >= 7 ? '↑ Above average — great job!' : avg >= 5 ? 'Holding steady' : '↓ Below average — hang in there');
  setText('statEntryCount', monthEntries.length);
  setText('statStreakSub',  `${streak}-day current streak 🔥`);
  setText('statWorstDay',   formatDate(worst.datetime).date);
  setText('statWorstSub',   `Score ${worst.intensity}/10 — ${CATEGORY_LABELS[worst.category]}`);
  setText('statTopIssue',   CATEGORY_LABELS[topCat[0]]?.replace(/💼|💰|❤️|🏃/g, '').trim() || topCat[0]);
  setText('statTopIssueSub',`${topCat[1]} of ${entries.length} total entries`);
  setText('statBestDay',    formatDate(best.datetime).date);
  setText('statBestSub',    `Score ${best.intensity}/10 — ${CATEGORY_LABELS[best.category]}`);
  setText('statWellbeing',  getWellbeingLabel(avg));

  // Welcome message
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  setText('welcomeMsg', `${greeting}! You're doing great.`);
  setText('welcomeSub',  `You've logged ${monthEntries.length} entr${monthEntries.length === 1 ? 'y' : 'ies'} this month. Keep it up!`);

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
}

// ESCAPE HTML helper 

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// PAGE INIT 

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'add-entry') {
    initDatetime();
  }

  if (page === 'history') {
    initDeleteListener();
    renderHistory();
    initHistoryFilters();
  }

  if (page === 'analytics') {
    renderAnalytics();
  }

  if (page === 'dashboard') {
    renderDashboard();
  }
});
