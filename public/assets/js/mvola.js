// Fichier: mvola.js
// Logique partagée (vendeur + admin) de la page Mvola.
// Les données Mvola sont tenues à part des ventes / stocks / mouvements.
document.addEventListener('DOMContentLoaded', async function () {
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const weekDayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // --- Helpers ---
  function formatAr(price) {
    return Number(price || 0).toLocaleString('fr-FR').replace(/\s/g, '.') + ' Ar';
  }
  function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function localTodayKey() {
    return formatDateKey(new Date());
  }

  // --- État ---
  let mvolaByDate = {}; // { "YYYY-MM-DD": amount }
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  // --- Éléments ---
  const form = document.getElementById('mvolaForm');
  const dateInput = document.getElementById('mvolaDate');
  const amountInput = document.getElementById('mvolaAmount');
  const calendarEl = document.getElementById('mvolaCalendar');
  const periodSelector = document.getElementById('periodSelector');
  const weekSelector = document.getElementById('weekSelector');
  const monthDisplay = document.getElementById('currentMonthDisplay');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const periodTotalEl = document.getElementById('periodTotal');
  const periodLabelEl = document.getElementById('periodLabel');

  // --- Chargement des données ---
  async function loadMvola() {
    try {
      const res = await fetch('/api/mvola', { cache: 'no-store' });
      // Une redirection (ex. vers /login.html) ou une erreur ne doit pas
      // passer inaperçue : sinon le calendrier reste vide en silence.
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (!res.ok || res.redirected || !isJson) {
        throw new Error(`Réponse inattendue de /api/mvola (statut ${res.status}${res.redirected ? ', redirigé vers ' + res.url : ''})`);
      }
      const entries = await res.json();
      mvolaByDate = {};
      (entries || []).forEach((e) => {
        if (e && e.date) mvolaByDate[e.date] = Number(e.amount) || 0;
      });
    } catch (err) {
      console.error('Erreur lors du chargement des données Mvola:', err);
      mvolaByDate = {};
    }
  }

  // --- Semaines du mois (lundi -> dimanche), coupées au mois ---
  function getWeeksInMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let weekStart = new Date(firstDay);
    const dow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));

    while (weekStart <= lastDay) {
      let weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      if (weekEnd >= firstDay && weekStart <= lastDay) {
        let start = new Date(weekStart);
        let end = new Date(weekEnd);
        if (start < firstDay) start = new Date(firstDay);
        if (end > lastDay) end = new Date(lastDay);
        weeks.push({ start, end });
      }
      weekStart.setDate(weekStart.getDate() + 7);
    }
    return weeks;
  }

  function sumBetween(start, end) {
    let total = 0;
    const d = new Date(start);
    const stop = new Date(end);
    d.setHours(0, 0, 0, 0);
    stop.setHours(0, 0, 0, 0);
    while (d <= stop) {
      total += mvolaByDate[formatDateKey(d)] || 0;
      d.setDate(d.getDate() + 1);
    }
    return total;
  }

  function monthTotal(year, month) {
    return sumBetween(new Date(year, month, 1), new Date(year, month + 1, 0));
  }

  // --- Navigation mois ---
  function updateNavigationButtons() {
    const now = new Date();
    const beyond = currentYear > now.getFullYear() ||
      (currentYear === now.getFullYear() && currentMonth >= now.getMonth());
    nextMonthBtn.disabled = beyond;
    nextMonthBtn.classList.toggle('disabled', beyond);
  }

  function updateMonthDisplay() {
    monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    updateNavigationButtons();
  }

  // --- Sélecteur de semaines ---
  function findCurrentWeekIndex(weeks) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 0; i < weeks.length; i++) {
      if (now >= weeks[i].start && now <= weeks[i].end) return i;
    }
    return -1;
  }

  function updateWeekOptions() {
    const weeks = getWeeksInMonth(currentYear, currentMonth);
    weekSelector.innerHTML = '';
    weeks.forEach((week, index) => {
      const num = String(index + 1).padStart(2, '0');
      const start = `${week.start.getDate()} ${monthNames[week.start.getMonth()]}`;
      const end = `${week.end.getDate()} ${monthNames[week.end.getMonth()]}`;
      const opt = document.createElement('option');
      opt.value = String(index);
      opt.textContent = `Semaine ${num} - [${start} - ${end}]`;
      weekSelector.appendChild(opt);
    });
    const idx = findCurrentWeekIndex(weeks);
    weekSelector.selectedIndex = idx >= 0 ? idx : weeks.length - 1;
    return weeks;
  }

  // --- Mise en évidence du total (semaine / mois) ---
  function updateSummary() {
    const mode = periodSelector.value;
    if (mode === 'month') {
      periodLabelEl.textContent = `Total du mois (${monthNames[currentMonth]} ${currentYear})`;
      periodTotalEl.textContent = formatAr(monthTotal(currentYear, currentMonth));
    } else {
      const weeks = getWeeksInMonth(currentYear, currentMonth);
      const week = weeks[weekSelector.selectedIndex] || weeks[weeks.length - 1];
      if (week) {
        const start = `${week.start.getDate()} ${monthNames[week.start.getMonth()]}`;
        const end = `${week.end.getDate()} ${monthNames[week.end.getMonth()]}`;
        periodLabelEl.textContent = `Total de la semaine (${start} - ${end})`;
        periodTotalEl.textContent = formatAr(sumBetween(week.start, week.end));
      } else {
        periodLabelEl.textContent = 'Total de la semaine';
        periodTotalEl.textContent = formatAr(0);
      }
    }
  }

  // --- Calendrier du mois ---
  function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const todayKey = localTodayKey();

    let html = '<div class="mvola-weekdays">';
    weekDayNames.forEach((d) => { html += `<div class="mvola-weekday">${d}</div>`; });
    html += '</div><div class="mvola-days">';

    // Cases vides avant le 1er (semaine commençant lundi)
    const startOffset = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startOffset; i++) {
      html += '<div class="mvola-day empty"></div>';
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      const key = formatDateKey(date);
      const amount = mvolaByDate[key];
      const classes = ['mvola-day'];
      if (key === todayKey) classes.push('today');
      if (amount != null) classes.push('has-amount');
      html += `
        <div class="${classes.join(' ')}" data-date="${key}" role="button" tabindex="0">
          <span class="mvola-day-number">${day}</span>
          <span class="mvola-day-amount">${amount != null ? formatAr(amount) : ''}</span>
        </div>`;
    }
    html += '</div>';
    calendarEl.innerHTML = html;

    // Clic sur un jour : pré-remplir le formulaire (si présent)
    if (dateInput) {
      calendarEl.querySelectorAll('.mvola-day[data-date]').forEach((cell) => {
        const select = () => {
          const key = cell.getAttribute('data-date');
          dateInput.value = key;
          localStorage.setItem('mvolaDate', key);
          amountInput.value = mvolaByDate[key] != null ? mvolaByDate[key] : '';
          dateInput.dispatchEvent(new Event('change'));
        };
        cell.addEventListener('click', select);
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
        });
      });
    }
  }

  function render() {
    updateMonthDisplay();
    renderCalendar();
    updateSummary();
  }

  // --- Formulaire (côté vendeur et admin) ---
  if (form) {
    // Restaure la date mémorisée (localStorage) ou aujourd'hui
    const savedDate = localStorage.getItem('mvolaDate');
    dateInput.value = savedDate || localTodayKey();
    amountInput.value = mvolaByDate[dateInput.value] != null ? mvolaByDate[dateInput.value] : '';

    dateInput.addEventListener('change', () => {
      localStorage.setItem('mvolaDate', dateInput.value);
      amountInput.value = mvolaByDate[dateInput.value] != null ? mvolaByDate[dateInput.value] : '';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = dateInput.value;
      const amount = Number(amountInput.value);
      if (!date || isNaN(amount) || amount < 0) {
        alert('Veuillez saisir un montant valide.');
        return;
      }
      try {
        const res = await fetch('/api/mvola', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, amount })
        });
        if (res.ok) {
          await loadMvola();
          render();
          alert('Montant Mvola enregistré !');
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.message || "Erreur lors de l'enregistrement.");
        }
      } catch (err) {
        console.error('Erreur réseau Mvola:', err);
        alert('Erreur de connexion au serveur.');
      }
    });
  }

  // --- Sélecteurs de période ---
  function applyPeriodMode() {
    const isWeek = periodSelector.value === 'week';
    weekSelector.style.display = isWeek ? '' : 'none';
    updateSummary();
  }

  periodSelector.addEventListener('change', () => {
    localStorage.setItem('mvolaPeriod', periodSelector.value);
    applyPeriodMode();
  });
  weekSelector.addEventListener('change', updateSummary);

  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updateWeekOptions();
    render();
  });
  nextMonthBtn.addEventListener('click', function () {
    if (this.disabled) return;
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    updateWeekOptions();
    render();
  });

  // --- Initialisation ---
  await loadMvola();
  periodSelector.value = localStorage.getItem('mvolaPeriod') || 'week';
  updateWeekOptions();
  applyPeriodMode();
  render();
});
