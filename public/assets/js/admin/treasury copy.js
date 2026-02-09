document.addEventListener('DOMContentLoaded', async function() {
  // Initialisation des variables globales
  let salesData = [];
  let weeklyFinalBalances = {};
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

  // Fonctions utilitaires
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

  // Fonction pour calculer les recettes d'un jour
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

  // Fonction pour mettre à jour le tableau journalier
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

    if (daysProcessed > 0) {
      const currentWeekStartKey = formatDateKey(startDate);
      weeklyFinalBalances[currentWeekStartKey] = soldeFinale;
    }

    if (document.getElementById('totalRecettes')) document.getElementById('totalRecettes').textContent = formatAriary(totalRecettes);
    if (document.getElementById('totalDepenses')) document.getElementById('totalDepenses').textContent = formatAriary(totalDepenses);
    if (document.getElementById('totalSolde')) document.getElementById('totalSolde').textContent = formatAriary(totalSolde);
    if (document.getElementById('totalDecaissement')) document.getElementById('totalDecaissement').textContent = formatAriary(totalDecaissement);
    if (document.getElementById('soldeFinale')) document.getElementById('soldeFinale').textContent = formatAriary(soldeFinale);
  }

  // Fonction pour obtenir toutes les semaines d'un mois donné
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

      if (currentWeekStart.getMonth() > month && currentWeekStart.getFullYear() === year ||
          currentWeekStart.getFullYear() > year) {
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const lastWeek = weeks[weeks.length - 1];
        if (lastWeek.end < lastDayOfMonth) {
          const additionalWeekStart = new Date(currentWeekStart);
          const additionalWeekEnd = new Date(additionalWeekStart);
          additionalWeekEnd.setDate(additionalWeekStart.getDate() + 6);
          weeks.push({ start: additionalWeekStart, end: additionalWeekEnd });
        }
        break;
      }
    }
    return weeks;
  }

  // Fonction utilitaire pour ajouter une option au sélecteur
  function addOption(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
  }

  // Fonction pour mettre à jour l'affichage du mois
  function updateMonthDisplay() {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    document.getElementById('currentMonthDisplay').textContent =
      `${monthNames[currentMonth]} ${currentYear}`;
    updateNavigationButtons();
  }

  // Met à jour l'état des boutons de navigation
  function updateNavigationButtons() {
    const nextMonthButton = document.getElementById('nextMonth');
    const now = new Date();
    const currentSystemYear = now.getFullYear();
    const currentSystemMonth = now.getMonth();
    if (currentYear > currentSystemYear ||
        (currentYear === currentSystemYear && currentMonth >= currentSystemMonth)) {
      nextMonthButton.disabled = true;
      nextMonthButton.classList.add('disabled');
    } else {
      nextMonthButton.disabled = false;
      nextMonthButton.classList.remove('disabled');
    }
  }

  // Fonction pour mettre à jour les options de semaine
  function updateWeekOptions() {
    const weekSelector = document.getElementById('weekSelector');
    weekSelector.innerHTML = '';
    const weeks = getWeeksInMonth(currentYear, currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availableWeeks = weeks.filter(week => week.start <= today);
    availableWeeks.forEach((week, index) => {
      const weekNum = String(index + 1).padStart(2, '0');
      const startDate = formatDate(week.start);
      const endDate = formatDate(week.end);
      const weekText = `Semaine ${weekNum} - [${startDate} - ${endDate}]`;
      addOption(weekSelector, `week${index+1}`, weekText);
    });
    if (weekSelector.options.length > 0) {
      const currentWeekIndex = findCurrentWeekIndex(availableWeeks);
      weekSelector.selectedIndex = currentWeekIndex >= 0 ?
        currentWeekIndex : weekSelector.options.length - 1;
      const selectedWeek = weekSelector.options[weekSelector.selectedIndex].text;
      const parts = selectedWeek.split(' - ');
      const dateRange = parts[1].trim() + ' - ' + parts[2].trim();
      document.getElementById('treasuryDateTitle').textContent = `Trésorerie du : ${dateRange}`;
    } else {
      document.getElementById('treasuryDateTitle').textContent = `Aucune semaine disponible`;
    }
  }

  function findCurrentWeekIndex(weeks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < weeks.length; i++) {
      const startDate = new Date(weeks[i].start);
      const endDate = new Date(weeks[i].end);
      if (today >= startDate && today <= endDate) {
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

  document.getElementById('recapSwitch').addEventListener('change', function() {
    const isRecapMode = this.checked;
    document.getElementById('detailedView').style.display = isRecapMode ? 'none' : '';
    document.getElementById('summaryView').style.display = isRecapMode ? '' : 'none';
    document.getElementById('weekSelector').style.display = isRecapMode ? 'none' : '';
    updateTitle(isRecapMode);
    if (isRecapMode) {
      generateMonthlySummary(currentYear, currentMonth);
    }
  });

  document.getElementById('weekSelector').addEventListener('change', function() {
    if (this.selectedIndex >= 0) {
      const selectedWeek = this.options[this.selectedIndex].text;
      const parts = selectedWeek.split(' - ');
      let dateRange;
      if (parts.length >= 3) {
        dateRange = parts[1].trim() + ' - ' + parts[2].trim();
      } else if (parts.length === 2) {
        dateRange = parts[1].trim();
      }
      document.getElementById('treasuryDateTitle').textContent = `Trésorerie du : ${dateRange}`;
      const weekText = selectedWeek;
      const startEndMatch = weekText.match(/\[(.*?)\]/);
      if (startEndMatch && startEndMatch[1]) {
        const dateParts = startEndMatch[1].split(' - ');
        if (dateParts.length === 2) {
          const startDateParts = dateParts[0].split(' ');
          const endDateParts = dateParts[1].split(' ');
          const monthNames = [
            'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
          ];
          const startMonth = monthNames.indexOf(startDateParts[1].toLowerCase());
          const endMonth = monthNames.indexOf(endDateParts[1].toLowerCase());
          if (startMonth !== -1 && endMonth !== -1) {
            const startDate = new Date(currentYear, startMonth, parseInt(startDateParts[0]));
            const endDate = new Date(currentYear, endMonth, parseInt(endDateParts[0]));
            updateTreasuryTable(startDate, endDate);
          }
        }
      }
    }
  });

  // Fonction pour mettre à jour le titre
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
        let dateRange;
        if (parts.length >= 3) {
          dateRange = parts[1].trim() + ' - ' + parts[2].trim();
        } else if (parts.length === 2) {
          dateRange = parts[1].trim();
        }
        document.getElementById('treasuryDateTitle').textContent = `Trésorerie du : ${dateRange}`;
      } else {
        document.getElementById('treasuryDateTitle').textContent = `Trésorerie - ${monthNames[currentMonth]} ${currentYear}`;
      }
    }
  }

  // Fonction pour générer le récapitulatif mensuel
  async function generateMonthlySummary(year, month) {
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
        const weeklySummary = await calculateWeeklySummary(week.start, week.end);
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

  // Fonction pour calculer les totaux d'une semaine
  async function calculateWeeklySummary(startDate, endDate) {
    let totalRecettes = 0;
    let totalDepenses = 0;
    let totalDecaissements = 0;
    let initialReport = 0;
    const previousWeekEndDate = new Date(startDate);
    previousWeekEndDate.setDate(previousWeekEndDate.getDate() - 1);
    const previousWeekStartKey = formatDateKey(new Date(previousWeekEndDate.getTime() - 6 * 24 * 60 * 60 * 1000));
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

  // Sélection automatique de la semaine courante au chargement
  setTimeout(() => {
    selectSpecificWeek('2025-08-14');
    if (document.getElementById('recapSwitch').checked) {
      document.getElementById('weekSelector').style.display = 'none';
      document.getElementById('detailedView').style.display = 'none';
      document.getElementById('summaryView').style.display = '';
      generateMonthlySummary(currentYear, currentMonth);
      updateTitle(true);
    }
  }, 500);

  // Fonction pour sélectionner une semaine spécifique
  function selectSpecificWeek(targetDate) {
    const date = new Date(targetDate);
    if (isNaN(date.getTime())) return;
    currentYear = date.getFullYear();
    currentMonth = date.getMonth();
    updateMonthDisplay();
    updateWeekOptions();
    const weekSelector = document.getElementById('weekSelector');
    for (let i = 0; i < weekSelector.options.length; i++) {
      const option = weekSelector.options[i];
      const weekText = option.text;
      const weekDates = getWeekDatesFromText(weekText.split(' - ')[1].trim());
      if (weekDates) {
        const targetDateTime = date.getTime();
        if (
          targetDateTime >= weekDates.start.getTime() &&
          targetDateTime <= weekDates.end.getTime()
        ) {
          weekSelector.selectedIndex = i;
          weekSelector.dispatchEvent(new Event('change'));
          return true;
        }
      }
    }
    return false;
  }

  // Fonction pour extraire les dates de début et de fin à partir d'un texte formaté
  function getWeekDatesFromText(dateRangeText) {
    const bracketMatch = dateRangeText.match(/\[(.*?)\]/);
    if (!bracketMatch || !bracketMatch[1]) return null;
    const dateRange = bracketMatch[1];
    const dateParts = dateRange.split(' - ');
    if (dateParts.length !== 2) return null;
    const startDateParts = dateParts[0].split(' ');
    const endDateParts = dateParts[1].split(' ');
    if (startDateParts.length !== 2 || endDateParts.length !== 2) return null;
    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const startMonth = monthNames.indexOf(startDateParts[1].toLowerCase());
    const endMonth = monthNames.indexOf(endDateParts[1].toLowerCase());
    if (startMonth === -1 || endMonth === -1) return null;
    let startYear = currentYear;
    let endYear = currentYear;
    if (startMonth === 11 && endMonth === 0) {
      endYear = currentYear + 1;
    } else if (startMonth === 0 && endMonth === 11) {
      startYear = currentYear - 1;
    }
    const startDate = new Date(startYear, startMonth, parseInt(startDateParts[0], 10));
    const endDate = new Date(endYear, endMonth, parseInt(endDateParts[0], 10));
    return { start: startDate, end: endDate };
  }

  /**
   * Récupère et agrège les mouvements financiers par date et type
   * @returns {Object} Un objet où les clés sont les dates (format YYYY-MM-DD) et les valeurs contiennent les sommes par type
   */
  async function getAggregatedMovements() {
    try {
      const response = await fetch('/api/movements');
      const movements = await response.json();
      
      // Regrouper les mouvements par date et type
      const aggregated = {};
      
      movements.forEach(movement => {
        if (!movement.date || !movement.type || !movement.price) return;
        
        // Formater la date en YYYY-MM-DD pour le regroupement
        const date = new Date(movement.date);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Initialiser l'entrée pour cette date si elle n'existe pas
        if (!aggregated[dateKey]) {
          aggregated[dateKey] = {
            spent: 0, // Dépenses
            disburse: 0, // Décaissements
            date: dateKey // Garder la date pour le tri
          };
        }
        
        // Additionner les montants selon le type
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
  
  // Fonction pour mettre à jour l'affichage du mois
  function updateMonthDisplay() {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    document.getElementById('currentMonthDisplay').textContent = 
      `${monthNames[currentMonth]} ${currentYear}`;
    
    // Mettre à jour l'état des boutons de navigation
    updateNavigationButtons();
  }
  
  // Fonction pour formater une date en format jour mois
  function formatDate(date) {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    return `${date.getDate()} ${monthNames[date.getMonth()]}`;
  }
  
  // Gestionnaires d'événements pour la navigation et le switch recap
  document.getElementById('prevMonth').addEventListener('click', function() {
    currentMonth = (currentMonth - 1 + 12) % 12;
    if (currentMonth === 11) currentYear--;
    updateMonthDisplay();
    updateTitle(document.getElementById('recapSwitch').checked);
    if (document.getElementById('recapSwitch').checked) {
      generateMonthlySummary(currentYear, currentMonth);
    } else {
      updateWeekOptions();
      const weekSelector = document.getElementById('weekSelector');
      if (weekSelector.options.length > 0) {
        weekSelector.selectedIndex = 0;
        const event = new Event('change');
        weekSelector.dispatchEvent(event);
      }
    }
  });
  
  document.getElementById('nextMonth').addEventListener('click', function() {
    if (this.disabled) return;
    currentMonth = (currentMonth + 1) % 12;
    if (currentMonth === 0) currentYear++;
    updateMonthDisplay();
    updateTitle(document.getElementById('recapSwitch').checked);
    if (document.getElementById('recapSwitch').checked) {
      generateMonthlySummary(currentYear, currentMonth);
    } else {
      updateWeekOptions();
      const weekSelector = document.getElementById('weekSelector');
      if (weekSelector.options.length > 0) {
        weekSelector.selectedIndex = 0;
        const event = new Event('change');
        weekSelector.dispatchEvent(event);
      }
    }
  });
  
  document.getElementById('recapSwitch').addEventListener('change', function() {
    const isRecapMode = this.checked;
    document.getElementById('detailedView').style.display = isRecapMode ? 'none' : '';
    document.getElementById('summaryView').style.display = isRecapMode ? '' : 'none';
    document.getElementById('weekSelector').style.display = isRecapMode ? 'none' : '';
    updateTitle(isRecapMode);
    if (isRecapMode) {
      generateMonthlySummary(currentYear, currentMonth);
    }
  });
  
  document.getElementById('weekSelector').addEventListener('change', function() {
    if (this.selectedIndex >= 0) {
      const selectedWeek = this.options[this.selectedIndex].text;
      const parts = selectedWeek.split(' - ');
      let dateRange;
      if (parts.length >= 3) {
        dateRange = parts[1].trim() + ' - ' + parts[2].trim();
      } else if (parts.length === 2) {
        dateRange = parts[1].trim();
      }
      document.getElementById('treasuryDateTitle').textContent = `Trésorerie du : ${dateRange}`;
      const weekText = selectedWeek;
      const startEndMatch = weekText.match(/\[(.*?)\]/);
      if (startEndMatch && startEndMatch[1]) {
        const dateParts = startEndMatch[1].split(' - ');
        if (dateParts.length === 2) {
          const startDateParts = dateParts[0].split(' ');
          const endDateParts = dateParts[1].split(' ');
          
          const monthNames = [
            'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
          ];
          
          const startMonth = monthNames.indexOf(startDateParts[1].toLowerCase());
          const endMonth = monthNames.indexOf(endDateParts[1].toLowerCase());
          
          if (startMonth !== -1 && endMonth !== -1) {
            const startDate = new Date(currentYear, startMonth, parseInt(startDateParts[0]));
            const endDate = new Date(currentYear, endMonth, parseInt(endDateParts[0]));
            
            // Mettre à jour le tableau avec les données de cette semaine
            updateTreasuryTable(startDate, endDate);
          }
        }
      }
    }
  });
  
  // Fonction pour mettre à jour le titre
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
        let dateRange;
        if (parts.length >= 3) {
          dateRange = parts[1].trim() + ' - ' + parts[2].trim();
        } else if (parts.length === 2) {
          dateRange = parts[1].trim();
        }
        document.getElementById('treasuryDateTitle').textContent = `Trésorerie du : ${dateRange}`;
      } else {
        document.getElementById('treasuryDateTitle').textContent = `Trésorerie - ${monthNames[currentMonth]} ${currentYear}`;
      }
    }
  }
  
  // Fonction pour générer le récapitulatif mensuel
  async function generateMonthlySummary(year, month) {
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
        const weeklySummary = await calculateWeeklySummary(week.start, week.end);
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
  
  // Fonction pour calculer les totaux d'une semaine
  async function calculateWeeklySummary(startDate, endDate) {
    let totalRecettes = 0;
    let totalDepenses = 0;
    let totalDecaissements = 0;
    let initialReport = 0;
    const previousWeekEndDate = new Date(startDate);
    previousWeekEndDate.setDate(previousWeekEndDate.getDate() - 1);
    const previousWeekStartKey = formatDateKey(new Date(previousWeekEndDate.getTime() - 6 * 24 * 60 * 60 * 1000));
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
  
  // Sélection automatique de la semaine courante au chargement
  setTimeout(() => {
    selectSpecificWeek('2025-08-14');
    
    // Si switch de récapitulation est coché par défaut, générer le récapitulatif
    if (document.getElementById('recapSwitch').checked) {
      document.getElementById('weekSelector').style.display = 'none';
      document.getElementById('detailedView').style.display = 'none';
      document.getElementById('summaryView').style.display = '';
      generateMonthlySummary(currentYear, currentMonth);
      updateTitle(true);
    }
  }, 500);
});

// Fonction utilitaire pour formater une date en YYYY-MM-DD (pour les clés)
function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Fonction utilitaire pour formater une date pour l'affichage (jj/mm/yy)
function formatDateDisplay(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

// Fonction utilitaire pour formater les montants en Ariary
function formatAriary(amount) {
  return `${amount.toLocaleString('fr-FR').replace(/\s/g, '.')} Ar`;
}

// Fonction pour extraire les dates de début et de fin à partir d'un texte formaté
function getWeekDatesFromText(dateRangeText) {
  // Format attendu: "[28 Janvier - 03 Février]"
  // Extraire la partie entre crochets
  const bracketMatch = dateRangeText.match(/\[(.*?)\]/);
  if (!bracketMatch || !bracketMatch[1]) return null;
  
  const dateRange = bracketMatch[1];
  const dateParts = dateRange.split(' - ');
  
  if (dateParts.length !== 2) return null;
  
  // Analyser les dates de début et de fin
  const startDateParts = dateParts[0].split(' ');
  const endDateParts = dateParts[1].split(' ');
  
  if (startDateParts.length !== 2 || endDateParts.length !== 2) return null;
  
  const monthNames = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  
  const startMonth = monthNames.indexOf(startDateParts[1].toLowerCase());
  const endMonth = monthNames.indexOf(endDateParts[1].toLowerCase());
  
  if (startMonth === -1 || endMonth === -1) return null;
  
  // Déterminer l'année correcte pour chaque date
  // (important pour les semaines à cheval sur deux années)
  let startYear = currentYear;
  let endYear = currentYear;
  
  // Si le mois de début est décembre et le mois de fin est janvier
  if (startMonth === 11 && endMonth === 0) {
    endYear = currentYear + 1;
  }
  // Si le mois de début est janvier et le mois de fin est décembre (cas rare)
  else if (startMonth === 0 && endMonth === 11) {
    startYear = currentYear - 1;
  }
  
  const startDate = new Date(startYear, startMonth, parseInt(startDateParts[0], 10));
  const endDate = new Date(endYear, endMonth, parseInt(endDateParts[0], 10));
  
  return { start: startDate, end: endDate };
}

/**
 * Récupère et agrège les mouvements financiers par date et type
 * @returns {Object} Un objet où les clés sont les dates (format YYYY-MM-DD) et les valeurs contiennent les sommes par type
 */
async function getAggregatedMovements() {
  try {
    const response = await fetch('/api/movements');
    const movements = await response.json();
    
    // Regrouper les mouvements par date et type
    const aggregated = {};
    
    movements.forEach(movement => {
      if (!movement.date || !movement.type || !movement.price) return;
      
      // Formater la date en YYYY-MM-DD pour le regroupement
      const date = new Date(movement.date);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Initialiser l'entrée pour cette date si elle n'existe pas
      if (!aggregated[dateKey]) {
        aggregated[dateKey] = {
          spent: 0, // Dépenses
          disburse: 0, // Décaissements
          date: dateKey // Garder la date pour le tri
        };
      }
      
      // Additionner les montants selon le type
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

// Fonction pour mettre à jour les colonnes dépenses et décaissements dans le tableau de trésorerie
async function updateMovementColumns() {
  try {
    // Récupérer les données agrégées
    const aggregatedMovements = await getAggregatedMovements();
    
    // Parcourir toutes les lignes du tableau de trésorerie
    const rows = document.querySelectorAll("#treasuryTable tbody tr");
    
    rows.forEach(row => {
      // Récupérer la date de la ligne (format dd/mm/yy)
      const dateCell = row.querySelector("td:first-child");
      if (!dateCell) return;
      
      // Convertir la date au format YYYY-MM-DD pour correspondre à notre agrégation
      const dateParts = dateCell.textContent.split('/');
      if (dateParts.length !== 3) return;
      
      // Convertir dd/mm/yy en YYYY-MM-DD
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = '20' + dateParts[2]; // Supposant que 'yy' est un format à 2 chiffres
      const dateKey = `${year}-${month}-${day}`;
      
      // Récupérer les données pour cette date
      const movementData = aggregatedMovements[dateKey];
      
      // Trouver les cellules pour les dépenses et décaissements
      const depenseCell = row.querySelector("td:nth-child(3)"); // 3ème colonne
      const decaissementCell = row.querySelector("td:nth-child(5)"); // 5ème colonne
      
      // Mettre à jour les montants s'ils existent
      if (depenseCell && movementData) {
        depenseCell.textContent = formatAr(movementData.spent);
      }
      
      if (decaissementCell && movementData) {
        decaissementCell.textContent = formatAr(movementData.disburse);
      }
      
      // Recalculer le solde et le solde final
      updateRowTotals(row);
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour des colonnes de mouvements:", error);
  }
}

/**
 * Recalcule les soldes pour une ligne donnée du tableau
 * @param {HTMLElement} row La ligne du tableau à mettre à jour
 */
function updateRowTotals(row) {
  // Récupérer les valeurs des cellules
  const recetteCell = row.querySelector("td:nth-child(2)");
  const depenseCell = row.querySelector("td:nth-child(3)");
  const soldeCell = row.querySelector("td:nth-child(4)");
  const decaissementCell = row.querySelector("td:nth-child(5)");
  const soldeFinalCell = row.querySelector("td:nth-child(6)");
  
  if (!recetteCell || !depenseCell || !soldeCell || !decaissementCell || !soldeFinalCell) return;
  
  // Extraire les valeurs numériques (supprimer 'Ar' et les espaces/points)
  const recette = parseFloat(recetteCell.textContent.replace(/[^\d]/g, '')) || 0;
  const depense = parseFloat(depenseCell.textContent.replace(/[^\d]/g, '')) || 0;
  const decaissement = parseFloat(decaissementCell.textContent.replace(/[^\d]/g, '')) || 0;
  
  // Calculer les soldes
  const solde = recette - depense;
  const soldeFinal = solde - decaissement;
  
  // Mettre à jour les cellules
  soldeCell.textContent = formatAr(solde);
  soldeFinalCell.textContent = formatAr(soldeFinal);
  
  // Appliquer une couleur en fonction du solde final
  if (soldeFinal < 0) {
    soldeFinalCell.style.color = '#e74c3c'; // Rouge pour négatif
  } else {
    soldeFinalCell.style.color = '#27ae60'; // Vert pour positif
  }
}

// Appeler la fonction au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  updateMovementColumns();
});