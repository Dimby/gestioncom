document.addEventListener('DOMContentLoaded', async function() {
  // Initialisation des variables globales
  let salesData = [];
  let currentYear, currentMonth;
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  const weekDayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Récupération des données de ventes
  try {
    const response = await fetch('/api/sales');
    salesData = await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des données de ventes:', error);
  }

  // Récupérer les mouvements financiers dès le chargement de la page
  const aggregatedMovements = await getAggregatedMovements();

  /**
   * Trouve la date de la transaction la plus ancienne (vente ou mouvement),
   * utilisée comme point de départ du cumul "Report".
   */
  function findEarliestDate() {
    let minDate = new Date(new Date().getFullYear(), 0, 1);

    const salesDates = salesData
      .map(s => new Date(s.date))
      .filter(d => !isNaN(d.getTime()));

    const movementDates = Object.keys(aggregatedMovements)
      .map(k => new Date(k))
      .filter(d => !isNaN(d.getTime()));

    const allDates = [...salesDates, ...movementDates];
    if (allDates.length > 0) {
      minDate = new Date(Math.min.apply(null, allDates));
    }
    minDate.setHours(0, 0, 0, 0);
    return minDate;
  }

  // Fonctions utilitaires
  function formatAriary(amount) {
    return `${Number(amount).toLocaleString('fr-FR').replace(/\s/g, '.')} Ar`;
  }
  function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function isPCommandeExcluded() {
    return document.getElementById('excludePCommandeSwitch')?.checked === true;
  }

  function getEffectiveDisburse(movements) {
    return isPCommandeExcluded() ? 0 : (movements.disburse || 0);
  }

  function updatePCommandeVisibility() {
    const isVisible = !isPCommandeExcluded();
    document.querySelectorAll('.p-commande-column').forEach(element => {
      element.style.display = isVisible ? '' : 'none';
    });
  }

  // Recettes d'un jour
  function calculateDayRevenue(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const daySales = salesData.filter(sale => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      return (
        saleDate.getFullYear() === year &&
        saleDate.getMonth() === month &&
        saleDate.getDate() === day
      );
    });
    let total = 0;
    daySales.forEach(sale => {
      if (typeof sale.salePrice === 'number') {
        total += sale.salePrice;
      } else if (typeof sale.unitPrice === 'number' && typeof sale.quantity === 'number') {
        total += sale.unitPrice * sale.quantity;
      }
    });
    return total;
  }

  // Marge brute d'un jour
  function calculateDayMargin(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const daySales = salesData.filter(sale => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      return (
        saleDate.getFullYear() === year &&
        saleDate.getMonth() === month &&
        saleDate.getDate() === day
      );
    });

    let productMargin = 0;
    let serviceMargin = 0;

    daySales.forEach(sale => {
      const unitPrice = sale.unitPrice || 0;
      const purchasePrice = sale.purchasePrice || 0;
      const quantity = sale.quantity || 1;
      const margin = (unitPrice - purchasePrice) * quantity;
      if (sale.category === "service") {
        serviceMargin += margin;
      } else {
        productMargin += margin;
      }
    });

    return { product: productMargin, service: serviceMargin, total: productMargin + serviceMargin };
  }

  // Valeurs agrégées d'un jour (recettes / dépenses / P.Commande / marge / solde du jour)
  function getDayData(date) {
    const recettes = calculateDayRevenue(date);
    const movements = aggregatedMovements[formatDateKey(date)] || { spent: 0, disburse: 0 };
    const depenses = movements.spent || 0;
    const disburse = getEffectiveDisburse(movements);
    const margin = calculateDayMargin(date).total;
    // Solde journalier : Recettes - Dépenses - P.Commande (sans report)
    const solde = recettes - (depenses + disburse);
    return { recettes, depenses, disburse, margin, solde };
  }

  // ===================================================================
  // CALENDRIER + colonne "Total semaine"
  // ===================================================================

  function line(cls, text) {
    return `<span class="t-line ${cls}">${text}</span>`;
  }

  // Bloc de lignes (recettes / dépenses / P.Com / solde / marge) d'un jour ou d'un total
  function renderLines({ recettes, depenses, disburse, solde, margin }, excluded) {
    let html = '';
    html += line('recette', `+ ${formatAriary(recettes)}`);
    html += line('depense', `- ${formatAriary(depenses)}`);
    if (!excluded) {
      html += `<span class="t-line pcommande p-commande-column">P.Cmd ${formatAriary(disburse)}</span>`;
    }
    html += `<span class="t-line solde${solde < 0 ? ' negative' : ''}">Solde ${formatAriary(solde)}</span>`;
    html += line('marge', `Marge ${formatAriary(margin)}`);
    return html;
  }

  function renderCalendar() {
    const calendarEl = document.getElementById('treasuryCalendar');
    if (!calendarEl) return;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayKey = formatDateKey(now);
    const excluded = isPCommandeExcluded();

    // En-tête : 7 jours + colonne Total semaine
    let html = '<div class="treasury-weekdays">';
    weekDayNames.forEach(d => { html += `<div class="treasury-weekday">${d}</div>`; });
    html += '<div class="treasury-weekday total">Total semaine</div>';
    html += '</div><div class="treasury-days">';

    // Construction des créneaux (cases vides avant le 1er, puis les jours, padding de fin)
    const startOffset = (firstDay.getDay() + 6) % 7;
    const slots = [];
    for (let i = 0; i < startOffset; i++) slots.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) slots.push(day);
    while (slots.length % 7 !== 0) slots.push(null);

    for (let w = 0; w < slots.length / 7; w++) {
      const week = slots.slice(w * 7, w * 7 + 7);
      const weekTotal = { recettes: 0, depenses: 0, disburse: 0, solde: 0, margin: 0 };
      let weekHasData = false;
      let cells = '';

      week.forEach(day => {
        if (day == null) { cells += '<div class="treasury-day empty"></div>'; return; }
        const date = new Date(currentYear, currentMonth, day);
        const key = formatDateKey(date);
        const isFuture = date > now;
        const classes = ['treasury-day'];
        if (key === todayKey) classes.push('today');
        if (isFuture) classes.push('future');

        let lines = '';
        if (!isFuture) {
          const d = getDayData(date);
          if (d.recettes || d.depenses || d.disburse || d.margin) { classes.push('has-data'); weekHasData = true; }
          weekTotal.recettes += d.recettes;
          weekTotal.depenses += d.depenses;
          weekTotal.disburse += d.disburse;
          weekTotal.solde += d.solde;
          weekTotal.margin += d.margin;
          lines = renderLines(d, excluded);
        }
        cells += `
          <div class="${classes.join(' ')}">
            <span class="treasury-day-number">${day}</span>
            <div class="treasury-day-lines">${lines}</div>
          </div>`;
      });

      // Colonne total de la semaine
      cells += `
        <div class="treasury-day treasury-week-total${weekHasData ? ' has-data' : ''}">
          <span class="treasury-day-number">Σ Semaine</span>
          <div class="treasury-day-lines">${renderLines(weekTotal, excluded)}</div>
        </div>`;

      html += cells;
    }
    html += '</div>';
    calendarEl.innerHTML = html;

    updateMonthKPI();
  }

  // ===================================================================
  // KPI du mois affiché
  // ===================================================================
  function setKPI(id, value, markNegative) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatAriary(value);
    if (markNegative) el.classList.toggle('negative', value < 0);
  }

  function updateMonthKPI() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Report = solde final du mois M-1 : cumul de (Recettes - Dépenses), hors P.Commande,
    // depuis la 1ère transaction jusqu'à la veille du 1er du mois affiché.
    let report = 0;
    const start = findEarliestDate();
    for (const d = new Date(start); d < firstDay; d.setDate(d.getDate() + 1)) {
      const m = aggregatedMovements[formatDateKey(d)] || { spent: 0 };
      report += calculateDayRevenue(d) - (m.spent || 0);
    }

    // Totaux du mois affiché (jusqu'à aujourd'hui inclus)
    let mRecettes = 0, mDepenses = 0, mDisburse = 0, mMargin = 0;
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      if (date > now) break;
      const d = getDayData(date);
      mRecettes += d.recettes;
      mDepenses += d.depenses;
      mDisburse += d.disburse;
      mMargin += d.margin;
    }

    setKPI('kpiReport', report, true);
    setKPI('kpiRecettes', mRecettes);
    setKPI('kpiDepenses', mDepenses);
    setKPI('kpiPCommande', mDisburse);
    setKPI('kpiMargin', mMargin);
  }

  // ===================================================================
  // Navigation / titre
  // ===================================================================
  function updateMonthDisplay() {
    document.getElementById('currentMonthDisplay').textContent =
      `${monthNames[currentMonth]} ${currentYear}`;
    updateNavigationButtons();
  }

  function updateNavigationButtons() {
    const nextMonthButton = document.getElementById('nextMonth');
    const now = new Date();
    const beyond = currentYear > now.getFullYear() ||
      (currentYear === now.getFullYear() && currentMonth >= now.getMonth());
    nextMonthButton.disabled = beyond;
    nextMonthButton.classList.toggle('disabled', beyond);
  }

  function updateTitle() {
    document.getElementById('treasuryDateTitle').textContent =
      `Trésorerie - ${monthNames[currentMonth]} ${currentYear}`;
  }

  // ===================================================================
  // Mouvements financiers (agrégés par date et type)
  // ===================================================================
  async function getAggregatedMovements() {
    try {
      const response = await fetch('/api/movements');
      const movements = await response.json();
      const aggregated = {};
      movements.forEach(movement => {
        if (!movement.date || !movement.type || !movement.price) return;
        const dateKey = new Date(movement.date).toISOString().split('T')[0];
        if (!aggregated[dateKey]) {
          aggregated[dateKey] = { spent: 0, disburse: 0 };
        }
        if (movement.type === 'spent') {
          aggregated[dateKey].spent += Number(movement.price) || 0;
        } else if (movement.type === 'disburse') {
          aggregated[dateKey].disburse += Number(movement.price) || 0;
        }
      });
      return aggregated;
    } catch (error) {
      console.error("Erreur lors de la récupération des mouvements:", error);
      return {};
    }
  }

  // ===================================================================
  // Gestionnaires d'événements
  // ===================================================================
  function refresh() {
    updateMonthDisplay();
    updateTitle();
    renderCalendar();
  }

  document.getElementById('prevMonth').addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    refresh();
  });

  document.getElementById('nextMonth').addEventListener('click', function() {
    if (this.disabled) return;
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    refresh();
  });

  document.getElementById('excludePCommandeSwitch').addEventListener('change', function() {
    updatePCommandeVisibility();
    renderCalendar();
  });

  // ===================================================================
  // Initialisation
  // ===================================================================
  updateMonthDisplay();
  updateTitle();
  updatePCommandeVisibility();
  renderCalendar();
});
