document.addEventListener('DOMContentLoaded', async function() {
  // Initialisation des variables globales
  let salesData = [];
  let weeklyFinalBalances = {}; // Notre "cache" de soldes de fin de semaine
  let currentYear, currentMonth;
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  // Récupération des données de ventes
  try {
    const response = await fetch('/api/sales');
    salesData = await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des données de ventes:', error);
  }

  // Récupérer les mouvements financiers dès le chargement de la page
  const aggregatedMovements = await getAggregatedMovements();

  // ===================================================================
  // NOUVELLE FONCTION : Trouver la date de début
  // ===================================================================
  /**
   * Trouve la date de la transaction la plus ancienne (vente ou mouvement)
   * et la retourne au début de cette semaine-là (Lundi).
   */
  function findEarliestDate() {
    // Par défaut, le 1er janvier de l'année en cours
    let minDate = new Date(new Date().getFullYear(), 0, 1);

    const salesDates = salesData
      .map(s => new Date(s.date))
      .filter(d => !isNaN(d.getTime()));
      
    const movementDates = Object.keys(aggregatedMovements)
      .map(k => new Date(k))
      .filter(d => !isNaN(d.getTime()));

    const allDates = [...salesDates, ...movementDates];
    
    if (allDates.length > 0) {
      // Trouve la date la plus ancienne
      minDate = new Date(Math.min.apply(null, allDates));
    }
    
    // Aligne la date au Lundi de cette semaine-là
    const dayOfWeek = minDate.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Dimanche, 1=Lundi
    minDate.setDate(minDate.getDate() - daysToSubtract);
    minDate.setHours(0, 0, 0, 0);
    
    return minDate;
  }

  // Fonctions utilitaires (inchangées)
  function formatAr(price) {
    return Number(price).toLocaleString('fr-FR').replace(/\s/g, '.') + ' Ar';
  }
  function formatAriary(amount) {
    return `${amount.toLocaleString('fr-FR').replace(/\s/g, '.')} Ar`;
  }
  function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function formatDateDisplay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  // Fonction pour calculer les recettes d'un jour (inchangée)
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

  // Fonction pour mettre à jour le tableau journalier (inchangée)
  function updateTreasuryTable(startDate, endDate) {
    const tableBody = document.getElementById('treasuryTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    let totalRecettes = 0;
    let totalDepenses = 0;
    let totalSolde = 0;
    let totalDecaissement = 0;
    let soldeFinale = 0;

    const previousWeekEndDate = new Date(startDate);
    previousWeekEndDate.setDate(previousWeekEndDate.getDate() - 1);
    const previousWeekStartKey = formatDateKey(new Date(previousWeekEndDate.getTime() - 6 * 24 * 60 * 60 * 1000));
    
    // Lit le cache pré-calculé
    let initialReport = weeklyFinalBalances[previousWeekStartKey] || 0;
    let previousDaySoldeFinal = initialReport;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDay = new Date(startDate);
    let daysProcessed = 0;

    while (daysProcessed < 7) {
      const day = new Date(currentDay);
      if (day > today) break;

      const dayRecettes = calculateDayRevenue(day);
      totalRecettes += dayRecettes;

      const dayKey = formatDateKey(day);
      const dayMovements = aggregatedMovements[dayKey] || { spent: 0, disburse: 0 };
      const dayDepenses = dayMovements.spent || 0;
      totalDepenses += dayDepenses;
      const dayDecaissement = dayMovements.disburse || 0;
      totalDecaissement += dayDecaissement;

      let dayReport = previousDaySoldeFinal;
      const daySolde = (dayReport + dayRecettes) - dayDepenses;
      totalSolde += daySolde;
      const daySoldeFinal = daySolde - dayDecaissement;
      previousDaySoldeFinal = daySoldeFinal;
      soldeFinale = daySoldeFinal;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDateDisplay(day)}</td>
        <td>${formatAriary(dayReport)}</td>
        <td>${formatAriary(dayRecettes)}</td>
        <td>${formatAriary(dayDepenses)}</td>
        <td>${formatAriary(daySolde)}</td>
        <td>${formatAriary(dayDecaissement)}</td>
        <td>${formatAriary(daySoldeFinal)}</td>
      `;
      tableBody.appendChild(row);

      currentDay.setDate(currentDay.getDate() + 1);
      daysProcessed++;
    }

    if (daysProcessed === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="7" class="no-data">Aucune donnée disponible pour cette période</td>`;
      tableBody.appendChild(row);
    }
    
    // (Optionnel) On peut mettre à jour le cache si le jour 'today' est dans cette semaine
    if (daysProcessed > 0) {
        const currentWeekStartKey = formatDateKey(startDate);
        // On ne met à jour que si le solde a pu changer (si 'today' est dans la semaine)
        if (new Date() >= startDate && new Date() <= endDate) {
             weeklyFinalBalances[currentWeekStartKey] = soldeFinale;
        }
    }

    if (document.getElementById('totalRecettes')) document.getElementById('totalRecettes').textContent = formatAriary(totalRecettes);
    if (document.getElementById('totalDepenses')) document.getElementById('totalDepenses').textContent = formatAriary(totalDepenses);
    if (document.getElementById('totalSolde')) document.getElementById('totalSolde').textContent = formatAriary(totalSolde);
    if (document.getElementById('totalDecaissement')) document.getElementById('totalDecaissement').textContent = formatAriary(totalDecaissement);
    if (document.getElementById('soldeFinale')) document.getElementById('soldeFinale').textContent = formatAriary(soldeFinale);
  }

  // Fonction pour obtenir toutes les semaines d'un mois donné (inchangée)
  function getWeeksInMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstDay.getDate() - daysToSubtract);
    let currentWeekStart = new Date(firstWeekStart);

    while (true) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      weeks.push({ start: new Date(currentWeekStart), end: new Date(currentWeekEnd) });
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);

      if ((currentWeekStart.getMonth() > month && currentWeekStart.getFullYear() === year) || currentWeekStart.getFullYear() > year) {
        break;
      }
    }
    return weeks;
  }

  // Fonctions utilitaires (inchangées)
  function addOption(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
  }
  
  function updateMonthDisplay() {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    document.getElementById('currentMonthDisplay').textContent =
      `${monthNames[currentMonth]} ${currentYear}`;
    updateNavigationButtons();
  }
  
  function updateNavigationButtons() {
    const nextMonthButton = document.getElementById('nextMonth');
    const now = new Date();
    const currentSystemYear = now.getFullYear();
    const currentSystemMonth = now.getMonth();
    if (currentYear > currentSystemYear || (currentYear === currentSystemYear && currentMonth >= currentSystemMonth)) {
      nextMonthButton.disabled = true;
      nextMonthButton.classList.add('disabled');
    } else {
      nextMonthButton.disabled = false;
      nextMonthButton.classList.remove('disabled');
    }
  }

  // Fonction pour mettre à jour les options de semaine (inchangée)
  function updateWeekOptions() {
    const weekSelector = document.getElementById('weekSelector');
    weekSelector.innerHTML = '';
    const weeks = getWeeksInMonth(currentYear, currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availableWeeks = weeks.filter(week => {
      const weekStart = new Date(week.start);
      weekStart.setHours(0,0,0,0);
      return weekStart <= today;
    });

    availableWeeks.forEach((week, index) => {
      const weekNum = String(index + 1).padStart(2, '0');
      const startDate = formatDate(week.start);
      const endDate = formatDate(week.end);
      const weekText = `Semaine ${weekNum} - [${startDate} - ${endDate}]`;
      addOption(weekSelector, `week${index + 1}`, weekText);
    });

    if (weekSelector.options.length > 0) {
      const currentWeekIndex = findCurrentWeekIndex(availableWeeks);
      weekSelector.selectedIndex = currentWeekIndex >= 0 ?
        currentWeekIndex : availableWeeks.length - 1;
    }
  }

  // Fonctions utilitaires (inchangées)
  function findCurrentWeekIndex(weeks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < weeks.length; i++) {
      if (today >= weeks[i].start && today <= weeks[i].end) {
        return i;
      }
    }
    return -1;
  }

  function formatDate(date) {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${date.getDate()} ${monthNames[date.getMonth()]}`;
  }

  // Fonction pour mettre à jour le titre (inchangée)
  function updateTitle(isRecapMode) {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    if (isRecapMode) {
      document.getElementById('treasuryDateTitle').textContent =
        `Récapitulation Trésorerie - ${monthNames[currentMonth]} ${currentYear}`;
    } else {
      const weekSelector = document.getElementById('weekSelector');
      if (weekSelector && weekSelector.selectedIndex >= 0) {
        const selectedWeek = weekSelector.options[weekSelector.selectedIndex].text;
        const parts = selectedWeek.split(' - ');
        const dateRange = parts[1].trim() + ' - ' + parts[2].trim();
        document.getElementById('treasuryDateTitle').textContent = `Trésorerie du : ${dateRange}`;
      } else {
        document.getElementById('treasuryDateTitle').textContent = `Trésorerie - ${monthNames[currentMonth]} ${currentYear}`;
      }
    }
  }

  // Fonction pour générer le récapitulatif mensuel (MODIFIÉE - non-async)
  function generateMonthlySummary(year, month) {
    try {
      const weeks = getWeeksInMonth(year, month);
      const summaryTableBody = document.getElementById('treasurySummaryTableBody');
      summaryTableBody.innerHTML = '';
      let totalRecettes = 0;
      let totalDepenses = 0;
      let totalDecaissements = 0;
      let lastSolde = 0;
      for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i];
        const weekNum = String(i + 1).padStart(2, '0');
        // Appel synchrone, lit le cache
        const weeklySummary = calculateWeeklySummary(week.start, week.end); 
        totalRecettes += weeklySummary.recettes;
        totalDepenses += weeklySummary.depenses;
        totalDecaissements += weeklySummary.decaissements;
        lastSolde = weeklySummary.solde;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>Semaine ${weekNum}</td>
          <td>${formatAriary(weeklySummary.report)}</td>
          <td>${formatAriary(weeklySummary.recettes)}</td>
          <td>${formatAriary(weeklySummary.depenses)}</td>
          <td>${formatAriary(weeklySummary.decaissements)}</td>
          <td>${formatAriary(weeklySummary.solde)}</td>
        `;
        if (weeklySummary.solde < 0) {
          row.querySelector('td:last-child').style.color = '#e74c3c';
        } else {
          row.querySelector('td:last-child').style.color = '#27ae60';
        }
        summaryTableBody.appendChild(row);
      }
      document.getElementById('totalRecapRecettes').textContent = formatAriary(totalRecettes);
      document.getElementById('totalRecapDepenses').textContent = formatAriary(totalDepenses);
      document.getElementById('totalRecapDecaissements').textContent = formatAriary(totalDecaissements);
      document.getElementById('totalRecapSolde').textContent = formatAriary(lastSolde);
      const totalSoldeElement = document.getElementById('totalRecapSolde');
      if (lastSolde < 0) {
        totalSoldeElement.style.color = '#e74c3c';
      } else {
        totalSoldeElement.style.color = '#27ae60';
      }
    } catch (error) {
      console.error("Erreur lors de la génération du récapitulatif:", error);
    }
  }

  // Fonction pour calculer les totaux d'une semaine (MODIFIÉE - non-async)
  function calculateWeeklySummary(startDate, endDate) {
    let totalRecettes = 0;
    let totalDepenses = 0;
    let totalDecaissements = 0;
    let initialReport = 0;
    const previousWeekEndDate = new Date(startDate);
    previousWeekEndDate.setDate(previousWeekEndDate.getDate() - 1);
    const previousWeekStartKey = formatDateKey(new Date(previousWeekEndDate.getTime() - 6 * 24 * 60 * 60 * 1000));
    
    // Utilise le cache pré-calculé
    if (weeklyFinalBalances[previousWeekStartKey]) {
      initialReport = weeklyFinalBalances[previousWeekStartKey];
    }
    
    let currentDay = new Date(startDate);
    let endDay = new Date(endDate);
    endDay.setHours(23, 59, 59);
    const today = new Date();
    if (endDay > today) endDay = today;
    
    while (currentDay <= endDay) {
      const dayRecettes = calculateDayRevenue(currentDay);
      totalRecettes += dayRecettes;
      const dayKey = formatDateKey(currentDay);
      const dayMovements = aggregatedMovements[dayKey] || { spent: 0, disburse: 0 };
      totalDepenses += dayMovements.spent || 0;
      totalDecaissements += dayMovements.disburse || 0;
      currentDay.setDate(currentDay.getDate() + 1);
    }
    const solde = initialReport + totalRecettes - totalDepenses - totalDecaissements;
    return {
      report: initialReport,
      recettes: totalRecettes,
      depenses: totalDepenses,
      decaissements: totalDecaissements,
      solde: solde
    };
  }

  // ===================================================================
  // NOUVELLE FONCTION DE PRÉ-CALCUL GLOBAL
  // ===================================================================
  /**
   * Pré-calcule les soldes finaux de TOUTES les semaines depuis 
   * la date de début jusqu'à la date de fin (aujourd'hui).
   */
  function preCalculateEntireHistory(startDate, endDate) {
    console.log(`Pré-calcul de l'historique complet de ${formatDateDisplay(startDate)} à ${formatDateDisplay(endDate)}`);
    
    let currentWeekStart = new Date(startDate);
    
    while (currentWeekStart <= endDate) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

      // Appelle la fonction synchrone
      const summary = calculateWeeklySummary(currentWeekStart, currentWeekEnd);
      
      // Stocke le résultat dans le cache
      const weekStartKey = formatDateKey(currentWeekStart);
      weeklyFinalBalances[weekStartKey] = summary.solde;
      
      // Avancer à la semaine suivante
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    console.log("Pré-calcul de tout l'historique terminé.");
  }

  // ===================================================================
  // GESTIONNAIRES D'ÉVÉNEMENTS (Simplifiés)
  // ===================================================================

  // N'a plus besoin d'être 'async'
  document.getElementById('prevMonth').addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateMonthDisplay();
    updateWeekOptions();

    // *** SUPPRIMÉ : Plus besoin de pré-calculer ici ***

    if (document.getElementById('recapSwitch').checked) {
      generateMonthlySummary(currentYear, currentMonth); // Lit le cache
    } else {
      const weekSelector = document.getElementById('weekSelector');
      if (weekSelector.options.length > 0) {
        weekSelector.selectedIndex = weekSelector.options.length - 1; // Select last available week
        weekSelector.dispatchEvent(new Event('change'));
      } else {
        document.getElementById('treasuryTableBody').innerHTML = '<tr><td colspan="7" class="no-data">Aucune donnée pour ce mois</td></tr>';
        updateTitle(false);
      }
    }
  });

  // N'a plus besoin d'être 'async'
  document.getElementById('nextMonth').addEventListener('click', function() {
    if (this.disabled) return;
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateMonthDisplay();
    updateWeekOptions();

    // *** SUPPRIMÉ : Plus besoin de pré-calculer ici ***

    if (document.getElementById('recapSwitch').checked) {
      generateMonthlySummary(currentYear, currentMonth); // Lit le cache
    } else {
      const weekSelector = document.getElementById('weekSelector');
      if (weekSelector.options.length > 0) {
        weekSelector.selectedIndex = 0; // Select first week of new month
        weekSelector.dispatchEvent(new Event('change'));
      } else {
        document.getElementById('treasuryTableBody').innerHTML = '<tr><td colspan="7" class="no-data">Aucune donnée pour ce mois</td></tr>';
        updateTitle(false);
      }
    }
  });

  // N'a plus besoin d'être 'async'
  document.getElementById('recapSwitch').addEventListener('change', function() {
    const isRecapMode = this.checked;
    document.getElementById('detailedView').style.display = isRecapMode ? 'none' : '';
    document.getElementById('summaryView').style.display = isRecapMode ? '' : 'none';
    document.getElementById('weekSelector').style.display = isRecapMode ? 'none' : '';
    updateTitle(isRecapMode);
    
    if (isRecapMode) {
      generateMonthlySummary(currentYear, currentMonth); // Lit le cache
    } else {
      // Re-déclenche l'affichage de la semaine sélectionnée
      const weekSelector = document.getElementById('weekSelector');
      if (weekSelector.options.length > 0) {
        weekSelector.dispatchEvent(new Event('change'));
      } else {
        document.getElementById('treasuryTableBody').innerHTML = '<tr><td colspan="7" class="no-data">Aucune donnée pour ce mois</td></tr>';
        updateTitle(false);
      }
    }
  });

  // Inchangé, lit le cache
  document.getElementById('weekSelector').addEventListener('change', function() {
    if (this.selectedIndex < 0) return;

    const selectedWeekText = this.options[this.selectedIndex].text;
    const match = selectedWeekText.match(/\[(.*?)\]/);
    if (!match) return;

    const [startStr, endStr] = match[1].split(' - ');
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const startDay = parseInt(startStr.split(' ')[0]);
    const startMonth = monthNames.findIndex(m => m === startStr.split(' ')[1]);
    const endDay = parseInt(endStr.split(' ')[0]);
    const endMonth = monthNames.findIndex(m => m === endStr.split(' ')[1]);

    const startDate = new Date(currentYear, startMonth, startDay);
    const endDate = new Date(currentYear, endMonth, endDay);
    
    if(startMonth === 11 && endMonth === 0) endDate.setFullYear(currentYear + 1);

    updateTitle(false);
    updateTreasuryTable(startDate, endDate); // Lit le cache
  });

  /**
   * Récupère et agrège les mouvements financiers par date et type (inchangé)
   */
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
  // INITIALISATION (Modifiée)
  // ===================================================================
  
  // N'a plus besoin d'être 'async'
  function initializePage() {
    // *** AJOUT : Trouver la date de début ***
    const earliestDate = findEarliestDate();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // S'assurer qu'on inclut aujourd'hui

    // *** MODIFIÉ : Lancer le pré-calcul complet ***
    // Les données (salesData, aggregatedMovements) sont déjà chargées
    preCalculateEntireHistory(earliestDate, today);

    // Le reste est inchangé
    updateMonthDisplay();
    updateWeekOptions();

    const weekSelector = document.getElementById('weekSelector');

    if (weekSelector.options.length > 0) {
      weekSelector.dispatchEvent(new Event('change'));
    } else {
      const tableBody = document.getElementById('treasuryTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Aucune donnée disponible pour ce mois</td></tr>';
      }
      updateTitle(false);
    }
  }

  // Lancer l'initialisation (après les 'await' initiaux)
  initializePage();
});