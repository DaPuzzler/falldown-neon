const STORAGE_KEY = 'dad-energy-meter.entries';
const DAYS_TO_CHART = 7;
const MAX_RECENT_ENTRIES = 10;

const form = document.getElementById('entry-form');
const dateInput = document.getElementById('date');
const energyInput = document.getElementById('energy');
const energyValue = document.getElementById('energy-value');
const sleepInput = document.getElementById('sleep');
const notesInput = document.getElementById('notes');
const clearButton = document.getElementById('clear-button');
const entriesList = document.getElementById('entries-list');
const formMessage = document.getElementById('form-message');
const chartCanvas = document.getElementById('trend-chart');
const chartFallback = document.getElementById('chart-fallback');

let trendChart;

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timestampString() {
  return new Date().toISOString();
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (error) {
    console.error('Failed to parse entries', error);
    return {};
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function sortedEntries(entries) {
  return Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return 'Saved previously';
  }

  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.dataset.state = isError ? 'error' : 'success';
}

function validateEntry(entry) {
  if (!entry.date) {
    return 'Date is required.';
  }

  if (!Number.isFinite(entry.energy) || entry.energy < 1 || entry.energy > 10) {
    return 'Energy must be a number from 1 to 10.';
  }

  if (!Number.isFinite(entry.sleep) || entry.sleep < 0 || entry.sleep > 24) {
    return 'Sleep must be a numeric value from 0 to 24.';
  }

  return '';
}

function getFormEntry() {
  const workout = form.elements.workout.value;
  return {
    date: dateInput.value,
    energy: Number(energyInput.value),
    sleep: Number(sleepInput.value),
    workout,
    notes: notesInput.value.trim(),
    updatedAt: timestampString(),
  };
}

function resetFormForNextEntry() {
  dateInput.value = todayString();
  energyInput.value = '5';
  energyValue.textContent = energyInput.value;
  sleepInput.value = '';
  form.elements.workout.value = 'yes';
  notesInput.value = '';
}

function renderEntries(entries) {
  const recent = sortedEntries(entries).slice(0, MAX_RECENT_ENTRIES);

  if (recent.length === 0) {
    entriesList.innerHTML = '<li class="entry empty">No entries yet.</li>';
    return;
  }

  entriesList.innerHTML = recent.map((entry) => `
    <li class="entry">
      <div class="entry-top">
        <strong>${formatDate(entry.date)}</strong>
        <span>Energy ${entry.energy}/10</span>
      </div>
      <div class="entry-meta">
        <span>Sleep ${entry.sleep}h</span>
        <span>Workout ${entry.workout === 'yes' ? 'Yes' : 'No'}</span>
        <span>${escapeHtml(formatTimestamp(entry.updatedAt))}</span>
      </div>
      ${entry.notes ? `<p class="entry-notes">${escapeHtml(entry.notes)}</p>` : ''}
    </li>
  `).join('');
}

function lastNDaysEntries(entries, count) {
  return sortedEntries(entries)
    .slice(0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-count);
}

function renderChart(entries) {
  const chartEntries = lastNDaysEntries(entries, DAYS_TO_CHART);

  if (!window.Chart) {
    chartCanvas.hidden = true;
    chartFallback.hidden = false;
    return;
  }

  chartCanvas.hidden = false;
  chartFallback.hidden = true;

  const data = {
    labels: chartEntries.map((entry) =>
      new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Energy',
        data: chartEntries.map((entry) => entry.energy),
        borderColor: '#ef7d23',
        backgroundColor: 'rgba(239, 125, 35, 0.14)',
        tension: 0.35,
        pointBackgroundColor: '#ef7d23',
        pointBorderColor: '#ef7d23',
      },
      {
        label: 'Sleep',
        data: chartEntries.map((entry) => entry.sleep),
        borderColor: '#3f83f8',
        backgroundColor: 'rgba(63, 131, 248, 0.14)',
        tension: 0.35,
        pointBackgroundColor: '#3f83f8',
        pointBorderColor: '#3f83f8',
      },
    ],
  };

  if (trendChart) {
    trendChart.destroy();
  }

  trendChart = new Chart(chartCanvas, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: 24,
          ticks: { stepSize: 4 },
          title: {
            display: true,
            text: 'Energy / Sleep Hours',
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            boxWidth: 10,
            usePointStyle: true,
          },
        },
      },
    },
  });
}

function renderAll() {
  const entries = loadEntries();
  renderEntries(entries);
  renderChart(entries);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

energyInput.addEventListener('input', () => {
  energyValue.textContent = energyInput.value;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const entry = getFormEntry();
  const validationError = validateEntry(entry);

  if (validationError) {
    setMessage(validationError, true);
    return;
  }

  const entries = loadEntries();
  const existed = Boolean(entries[entry.date]);
  entries[entry.date] = entry;
  saveEntries(entries);
  renderAll();
  setMessage(existed ? 'Entry updated.' : 'Entry saved.');
  resetFormForNextEntry();
});

clearButton.addEventListener('click', () => {
  const confirmed = window.confirm('Clear all saved Dad Energy Meter entries?');
  if (!confirmed) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  resetFormForNextEntry();
  setMessage('All entries cleared.');
});

dateInput.value = todayString();
energyValue.textContent = energyInput.value;
renderAll();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
