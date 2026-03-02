const STORAGE_KEY = 'dad-energy-meter.entries';
const DAYS_TO_CHART = 7;
const MAX_RECENT_ENTRIES = 10;
const TARGET_CALORIES = 1800;
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'];

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
const caloriesTotal = document.getElementById('calories-total');
const caloriesTarget = document.getElementById('calories-target');
const caloriesRemaining = document.getElementById('calories-remaining');

const foodInputs = {
  breakfast: {
    text: document.getElementById('breakfast-text'),
    cal: document.getElementById('breakfast-cal'),
  },
  lunch: {
    text: document.getElementById('lunch-text'),
    cal: document.getElementById('lunch-cal'),
  },
  dinner: {
    text: document.getElementById('dinner-text'),
    cal: document.getElementById('dinner-cal'),
  },
  snack: {
    text: document.getElementById('snack-text'),
    cal: document.getElementById('snack-cal'),
  },
};

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

function emptyFood() {
  return {
    breakfast: { text: '', cal: 0 },
    lunch: { text: '', cal: 0 },
    dinner: { text: '', cal: 0 },
    snack: { text: '', cal: 0 },
  };
}

function parseCalories(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(3000, Math.round(numeric)));
}

function parseSavedSleep(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
}

function parseSavedEnergy(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 10) {
    return 5;
  }

  return numeric;
}

// Normalize older saved entries so food logging works without breaking existing data.
function normalizeEntry(entry = {}) {
  const food = emptyFood();

  MEAL_KEYS.forEach((meal) => {
    const savedMeal = entry.food?.[meal] || {};
    food[meal] = {
      text: typeof savedMeal.text === 'string' ? savedMeal.text : '',
      cal: parseCalories(savedMeal.cal),
    };
  });

  return {
    date: entry.date || '',
    energy: parseSavedEnergy(entry.energy),
    sleep: parseSavedSleep(entry.sleep),
    workout: entry.workout === 'no' ? 'no' : 'yes',
    notes: typeof entry.notes === 'string' ? entry.notes : '',
    updatedAt: entry.updatedAt || '',
    food,
  };
}

function defaultEntry(date = todayString()) {
  return {
    date,
    energy: 5,
    sleep: '',
    workout: 'yes',
    notes: '',
    updatedAt: '',
    food: emptyFood(),
  };
}

function normalizeEntries(entries) {
  return Object.fromEntries(
    Object.entries(entries || {}).map(([key, value]) => [key, normalizeEntry(value)])
  );
}

function loadEntries() {
  try {
    return normalizeEntries(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch (error) {
    console.error('Failed to parse entries', error);
    return {};
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeEntries(entries)));
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
  formMessage.dataset.state = message ? (isError ? 'error' : 'success') : '';
}

function totalCaloriesForFood(food) {
  return MEAL_KEYS.reduce((total, meal) => total + parseCalories(food[meal]?.cal), 0);
}

function readFoodFromForm() {
  const food = emptyFood();

  MEAL_KEYS.forEach((meal) => {
    food[meal] = {
      text: foodInputs[meal].text.value.trim(),
      cal: parseCalories(foodInputs[meal].cal.value),
    };
  });

  return food;
}

function renderCalorieSummary(food) {
  const total = totalCaloriesForFood(food);
  caloriesTotal.textContent = String(total);
  caloriesTarget.textContent = String(TARGET_CALORIES);
  caloriesRemaining.textContent = String(TARGET_CALORIES - total);
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
  return {
    date: dateInput.value,
    energy: Number(energyInput.value),
    sleep: sleepInput.value === '' ? NaN : Number(sleepInput.value),
    workout: form.elements.workout.value,
    notes: notesInput.value.trim(),
    updatedAt: timestampString(),
    food: readFoodFromForm(),
  };
}

function fillFoodFields(food) {
  MEAL_KEYS.forEach((meal) => {
    const mealEntry = food[meal] || { text: '', cal: 0 };
    foodInputs[meal].text.value = mealEntry.text || '';
    foodInputs[meal].cal.value = mealEntry.cal > 0 ? String(mealEntry.cal) : '';
  });
}

function fillForm(entry) {
  const normalized = normalizeEntry(entry);

  dateInput.value = normalized.date || todayString();
  energyInput.value = String(normalized.energy || 5);
  energyValue.textContent = energyInput.value;
  sleepInput.value = normalized.sleep === '' ? '' : String(normalized.sleep);
  form.elements.workout.value = normalized.workout;
  notesInput.value = normalized.notes;
  fillFoodFields(normalized.food);
  renderCalorieSummary(normalized.food);
}

function entryForDate(dateString) {
  const entries = loadEntries();
  return entries[dateString] || defaultEntry(dateString);
}

function renderEntries(entries) {
  const recent = sortedEntries(entries).slice(0, MAX_RECENT_ENTRIES);

  if (recent.length === 0) {
    entriesList.innerHTML = '<li class="entry empty">No entries yet.</li>';
    return;
  }

  entriesList.innerHTML = recent.map((entry) => {
    const normalized = normalizeEntry(entry);
    const totalCalories = totalCaloriesForFood(normalized.food);

    return `
      <li class="entry">
        <div class="entry-top">
          <strong>${formatDate(normalized.date)}</strong>
          <span>Energy ${normalized.energy}/10</span>
        </div>
        <div class="entry-meta">
          <span>Sleep ${normalized.sleep === '' ? '-' : `${normalized.sleep}h`}</span>
          <span>Workout ${normalized.workout === 'yes' ? 'Yes' : 'No'}</span>
          <span>cals ${totalCalories}</span>
          <span>${escapeHtml(formatTimestamp(normalized.updatedAt))}</span>
        </div>
        ${normalized.notes ? `<p class="entry-notes">${escapeHtml(normalized.notes)}</p>` : ''}
      </li>
    `;
  }).join('');
}

function lastNDaysEntries(entries, count) {
  return sortedEntries(entries)
    .slice()
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
        data: chartEntries.map((entry) => normalizeEntry(entry).energy),
        borderColor: '#ef7d23',
        backgroundColor: 'rgba(239, 125, 35, 0.14)',
        tension: 0.35,
        pointBackgroundColor: '#ef7d23',
        pointBorderColor: '#ef7d23',
        fill: false,
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
          max: 10,
          ticks: { stepSize: 2 },
          title: {
            display: true,
            text: 'Energy',
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

function loadEntryIntoForm(dateString) {
  fillForm(entryForDate(dateString));
}

energyInput.addEventListener('input', () => {
  energyValue.textContent = energyInput.value;
});

dateInput.addEventListener('change', () => {
  loadEntryIntoForm(dateInput.value || todayString());
  setMessage('');
});

MEAL_KEYS.forEach((meal) => {
  foodInputs[meal].cal.addEventListener('input', () => {
    renderCalorieSummary(readFoodFromForm());
  });
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
  entries[entry.date] = normalizeEntry(entry);
  saveEntries(entries);
  renderAll();
  fillForm(entries[entry.date]);
  setMessage(existed ? 'Entry updated.' : 'Entry saved.');
});

clearButton.addEventListener('click', () => {
  const confirmed = window.confirm('Clear all saved Dad Energy Meter entries?');
  if (!confirmed) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  fillForm(defaultEntry(todayString()));
  setMessage('All entries cleared.');
});

loadEntryIntoForm(todayString());
renderAll();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
