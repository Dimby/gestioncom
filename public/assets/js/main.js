$(document).ready(async function() {

  // Fonction pour mettre la date d'aujourd'hui au format YYYY-MM-DD
  const setTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('serviceDate')) document.getElementById('serviceDate').value = today;
    if(document.getElementById('productDate')) document.getElementById('productDate').value = today;
    if(document.getElementById('expenseDate')) document.getElementById('expenseDate').value = today;
  };
  setTodayDate();

  // Fonction utilitaire pour combiner la Date choisie avec l'Heure actuelle
  // Cela permet de garder un tri chronologique correct même si on change le jour
  const getFullDateFromInput = (inputId) => {
    const inputVal = document.getElementById(inputId).value; // ex: "2023-10-25"
    if (!inputVal) return new Date().toISOString();

    const dateObj = new Date(inputVal);
    const now = new Date();
    // On garde l'heure actuelle pour ne pas écraser l'ordre de tri
    dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return dateObj.toISOString();
  };

  // --- Section Produit ---
  let produits = [];
  try {
    const res = await fetch("/api/stocks");
    produits = await res.json();

    produits.forEach((p) => {
      const optionText = p.name + ' - ' + formatAr(p.salePrice);
      const $option = $('<option>', {
        value: p.id
      });

      if (p.stock <= 0) {
        $option.text(optionText + ' - [Stock épuisé]'); // Ajoute le message
        $option.prop('disabled', true); // Désactive l'option
        $option.attr('data-stock-status', 'out');
      } else {
        $option.text(optionText + ' - ' + p.stock + ' en stock'); // Texte normal
      }

      $('#produits').append($option); // Ajoute l'option (modifiée ou non)
    });

    $('#produits').trigger('change.select2');

  } catch (e) {
    $('#produits').html('<option value="">Erreur chargement produits</option>');
  }

  // Fonction pour calculer le prix total du produit
  function calculateProduitPrice() {
    const selectedId = $('#produits').val();
    const produit = produits.find(p => p.id == selectedId);
    // On utilise 1 comme quantité par défaut si le champ est vide
    const quantity = Number($('#quantity').val()) || 1;

    if (produit && produit.salePrice) {
      $('#price').val(produit.salePrice * quantity);
    } else {
      $('#price').val('');
    }
  }

  // Quand on sélectionne un produit...
  $('#produits').on('change', function() {
    const selectedId = $(this).val();
    const produit = produits.find(p => p.id == selectedId);

    if (produit) {
      $('#category').html(`<option value="${produit.category}">${produit.category}</option>`);
      $('#category').prop('disabled', false);
      $('#quantity').attr('max', produit.stock);
      // On initialise la quantité à 1 pour éviter un champ vide
      $('#quantity').val(1); 
    } else {
      $('#category').html('<option value="">Catégorie</option>');
      $('#category').prop('disabled', true);
      $('#price').val('');
      $('#quantity').val('');
      $('#quantity').removeAttr('max');
    }
    // ...on met à jour le prix
    calculateProduitPrice();
  });

  // Quand on change la quantité...
  $('#quantity').on('input', function() {
    // ...on met aussi à jour le prix
    calculateProduitPrice();
  });

  // --- Section Service ---
  let services = [];
  let stocks = [];

  async function loadServiceData() {
  try {
    const [servicesRes, stocksRes] = await Promise.all([
      fetch("/api/services"),
      fetch("/api/stocks")
    ]);
    services = await servicesRes.json();
    stocks = await stocksRes.json();

    const serviceSelect = document.getElementById("serviceSelect");
    if (serviceSelect) {
      // --- MODIFICATION : Vérifier le stock du produit associé ---
      serviceSelect.innerHTML = '<option value="">Sélectionner un service</option>' +
        services.map(s => {
          const produitUtilise = stocks.find(p => p.id == s.produitId);
          let optionText = `${s.name} - ${formatAr(s.price)}`;
          let isDisabled = false;

          if (!produitUtilise || produitUtilise.stock <= 0) {
            optionText += ' - [Produit utilisé épuisé]';
            isDisabled = true;
          }

          // Ajouter l'attribut disabled si nécessaire
          return `<option value="${s.id}" ${isDisabled ? 'disabled' : ''}>${optionText}</option>`;
        }).join('');
      // --- Fin de la modification ---

      $('#serviceSelect').trigger('change');
    }
  } catch (error) {
    console.error("Erreur lors du chargement des services:", error);
  }
}

  // --- Gestion des onglets ---
  const tabProduit = document.getElementById("tabProduit");
  const tabService = document.getElementById("tabService");
  const tabExpenses = document.getElementById("tabExpenses");
  const tabContentProduit = document.getElementById("tabContentProduit");
  const tabContentService = document.getElementById("tabContentService");
  const tabContentExpenses = document.getElementById("tabContentExpenses");

  function activateTab(activeTab, activateContent, inactiveTabs, inactiveContents) {
    if (!activeTab || !activateContent) return;
    activateContent.style.display = "";
    inactiveContents.forEach(content => { if (content) content.style.display = "none"; });
    activeTab.classList.add("active");
    activeTab.style.background = "#fff";
    inactiveTabs.forEach(tab => {
      if (tab) {
        tab.classList.remove("active");
        tab.style.background = "#f9f9f9";
      }
    });
  }

  if (tabProduit) { tabProduit.onclick = function(e) { e.preventDefault(); activateTab(tabProduit, tabContentProduit, [tabService, tabExpenses], [tabContentService, tabContentExpenses]); }; }
  if (tabService) { tabService.onclick = function(e) { e.preventDefault(); activateTab(tabService, tabContentService, [tabProduit, tabExpenses], [tabContentProduit, tabContentExpenses]); loadServiceData(); }; }
  if (tabExpenses) { tabExpenses.onclick = function(e) { e.preventDefault(); activateTab(tabExpenses, tabContentExpenses, [tabProduit, tabService], [tabContentProduit, tabContentService]); }; }

  loadServiceData();
  
  // --- Logique du formulaire Service ---
  $("#serviceSelect, #serviceQuantity").on("change input", calculateServicePrice);

  function calculateServicePrice() {
    const serviceSelect = document.getElementById("serviceSelect");
    const serviceQuantity = document.getElementById("serviceQuantity");
    const servicePriceInput = document.getElementById("servicePrice");
    
    if (!serviceSelect || !serviceQuantity || !servicePriceInput) return;
    
    const serviceId = serviceSelect.value;
    const quantity = Number(serviceQuantity.value) || 1;

    const service = services.find(s => s.id == serviceId);
    if (!service) {
      servicePriceInput.value = "";
      return;
    }

    const price = (Number(service.price) || 0) * quantity;
    servicePriceInput.value = price;
  }

  const serviceSaleForm = document.getElementById("serviceSaleForm");
  if (serviceSaleForm) {
    serviceSaleForm.onsubmit = async function(e) {
      e.preventDefault();

      const serviceSelect = document.getElementById("serviceSelect");
      const serviceQuantity = document.getElementById("serviceQuantity");
      const servicePrice = document.getElementById("servicePrice");
      const servicePayment = document.getElementById("servicePayment");
      
      if (!serviceSelect.value || !serviceQuantity.value || !servicePrice.value || !servicePayment.value) {
        alert("Veuillez remplir tous les champs.");
        return;
      }

      const serviceId = serviceSelect.value;
      const quantity = Number(serviceQuantity.value);
      const salePrice = Number(servicePrice.value);
      const payment = servicePayment.value;

      const service = services.find(s => s.id == serviceId);
      const produitUtilise = stocks.find(s => s.id == service.produitId);

      if (!service || !produitUtilise) {
        alert("Service ou produit associé non trouvé. Veuillez recharger la page.");
        return;
      }

      const sale = {
        id: Date.now(),
        name: service.name,
        category: service.category || "service",
        produit: produitUtilise.name,
        quantity,
        salePrice,
        unitPrice: Number(service.price),
        payment,
        date: getFullDateFromInput('serviceDate')
      };

      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sale)
        });

        if (res.ok) {
          alert("Vente de service ajoutée !");
          window.location.reload();
        } else {
          alert("Erreur lors de l'ajout de la vente.");
        }
      } catch (error) {
        console.error("Erreur réseau lors de l'ajout de la vente:", error);
        alert("Erreur de connexion au serveur.");
      }
    };
  }
  
  // --- Section Vente de produit ---
  const itemForm = document.getElementById("itemForm");
  if (itemForm) {
      itemForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const produitsSelect = document.getElementById("produits");
        const quantityInput = document.getElementById("quantity");
        const priceInput = document.getElementById("price");
        const paymentSelect = document.getElementById("payment");
        const categorySelect = document.getElementById("category");
        
        if (!produitsSelect.value || !quantityInput.value || !priceInput.value || !paymentSelect.value || !categorySelect.value) {
            alert("Formulaire incomplet.");
            return;
        }

        const produit = produits.find(p => p.id == produitsSelect.value);
        if (!produit) {
            alert("Produit non trouvé.");
            return;
        }

        const sale = {
            id: Date.now(),
            produit: produit.name,
            category: categorySelect.value,
            quantity: Number(quantityInput.value),
            salePrice: Number(priceInput.value),
            unitPrice: produit.salePrice,
            payment: paymentSelect.value,
            date: getFullDateFromInput('productDate')
        };

        try {
            const res = await fetch("/api/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sale)
            });

            if (res.ok) {
                alert("Vente ajoutée !");
                window.location.reload();
            } else {
                alert("Erreur lors de l'ajout.");
            }
        } catch (error) {
            console.error("Erreur lors de l'ajout de la vente:", error);
            alert("Erreur de connexion au serveur.");
        }
      });
  }

  // --- Section Dépenses ---
  const expensesContainer = document.getElementById('expensesContainer');
  const addExpenseBtn = document.getElementById('addExpenseBtn');
  const expensesForm = document.getElementById('expensesForm');

  if (addExpenseBtn && expensesContainer) {
    addExpenseBtn.addEventListener('click', function() {
      const newExpenseItem = document.createElement('div');
      newExpenseItem.className = 'expense-item';
      newExpenseItem.innerHTML = `
        <div class="form-group-01" style="margin-top: 10px;">
          <select class="expense-type" required>
            <option value="">Type de mouvement</option>
            <option value="spent">Dépense</option>
            <option value="disburse">Décaissement</option>
          </select>
          <input type="text" class="expense-description" placeholder="Description" required>
          <input type="number" class="expense-price" min="0" placeholder="Montant" required>
          <button type="button" class="remove-expense">×</button>
        </div>
      `;
      expensesContainer.appendChild(newExpenseItem);
      
      const removeButtons = document.querySelectorAll('.remove-expense');
      removeButtons.forEach(button => {
        button.style.display = 'inline-block';
        button.addEventListener('click', function() {
          this.closest('.expense-item').remove();
          
          if (document.querySelectorAll('.expense-item').length === 1) {
            const firstRemoveButton = document.querySelector('.remove-expense');
            if (firstRemoveButton) firstRemoveButton.style.display = 'none';
          }
        });
      });
    });
  }

  if (expensesForm && expensesContainer) {
    expensesForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const expenseItems = document.querySelectorAll('.expense-item');
      const expenses = [];
      const selectedDate = getFullDateFromInput('expenseDate');
      
      expenseItems.forEach(item => {
        const type = item.querySelector('.expense-type').value;
        const description = item.querySelector('.expense-description').value;
        const price = parseFloat(item.querySelector('.expense-price').value);
        
        if (type && description && !isNaN(price)) {
          expenses.push({ type, description, price, date: selectedDate });
        }
      });
      
      if (expenses.length === 0) {
        alert('Veuillez remplir au moins une dépense correctement.');
        return;
      }
      
      try {
        const response = await fetch('/api/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenses)
        });
        
        if (response.ok) {
          alert('Dépenses enregistrées avec succès!');
          expensesForm.reset();
          expensesContainer.innerHTML = `
            <div class="expense-item">
              <div class="form-group-01">
                <select class="expense-type" required>
                  <option value="">Type de mouvement</option>
                  <option value="spent">Dépense</option>
                  <option value="disburse">Décaissement</option>
                </select>
                <input type="text" class="expense-description" placeholder="Description" required>
                <input type="number" class="expense-price" min="0" placeholder="Montant" required>
                <button type="button" class="remove-expense" style="display:none;">×</button>
              </div>
            </div>
          `;
        } else {
          const errorData = await response.json();
          alert(`Erreur: ${errorData.message || 'Une erreur est survenue.'}`);
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion au serveur.');
      }
    });
  }
});

function formatAr(price) {
  return Number(price)
    .toLocaleString('fr-FR')
    .replace(/\s/g, '.')
    + 'Ar';
}