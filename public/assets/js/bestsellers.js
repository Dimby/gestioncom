document.addEventListener('DOMContentLoaded', async function() {
    // Éléments DOM
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const minSold = document.getElementById('minSold');
    const maxSold = document.getElementById('maxSold');
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    const resetButton = document.getElementById('resetFilters');
    const bestsellersTable = document.getElementById('bestsellersTable').querySelector('tbody');
    const paginationNav = document.getElementById('paginationNav');
    
    // Variables pour la pagination
    const itemsPerPage = 10;
    let currentPage = 1;
    let bestsellersData = [];
    let filteredData = [];
    let categories = new Set();
    
    // Charger les données initiales
    await loadBestsellers();
    
    // Événements pour les filtres
    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    minSold.addEventListener('input', applyFilters);
    maxSold.addEventListener('input', applyFilters);
    minPrice.addEventListener('input', applyFilters);
    maxPrice.addEventListener('input', applyFilters);
    resetButton.addEventListener('click', resetFilters);
    
    // Fonction pour changer de page (définie dans la portée locale)
    function changePage(page) {
        currentPage = page;
        updateTable();
        // Faire défiler vers le haut du tableau
        bestsellersTable.parentElement.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Modifier la fonction loadBestsellers pour ne plus dépendre de /api/products
    async function loadBestsellers() {
        try {
            // Récupérer les données des produits les plus vendus
            const response = await fetch('/api/bestsellers');
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des données');
            }
            
            bestsellersData = await response.json();
            
            // Au lieu de faire une requête séparée pour les produits,
            // utiliser directement les données des bestsellers
            
            // Collecter toutes les catégories uniques pour le filtre
            categories = new Set();
            
            // S'assurer que chaque item a les propriétés nécessaires
            bestsellersData = bestsellersData.map(item => {
                // Ajouter des valeurs par défaut si nécessaires
                return {
                    name: item.name || 'Produit sans nom',
                    category: item.category || 'Non catégorisé',
                    totalQuantity: item.totalQuantity || 0,
                    unitPrice: item.totalRevenue && item.totalQuantity ? 
                        item.totalRevenue / item.totalQuantity : 0,
                    stock: item.stock || 0, // Cette valeur pourrait être absente
                    totalRevenue: item.totalRevenue || 0
                };
            });
            
            // Collecter les catégories des produits
            bestsellersData.forEach(item => {
                if (item.category) {
                    categories.add(item.category);
                }
            });
            
            // Remplir le sélecteur de catégories
            populateCategoryFilter();
            
            // Appliquer les filtres initiaux (tous les produits)
            filteredData = [...bestsellersData];
            
            // Afficher les données
            updateTable();
            
        } catch (error) {
            console.error('Erreur:', error);
            bestsellersTable.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px; color: red;">
                        Erreur lors du chargement des données: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    function populateCategoryFilter() {
        // Vider les options existantes sauf la première
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }
        
        // Ajouter une option pour chaque catégorie
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        const minQuantity = minSold.value ? parseInt(minSold.value) : 0;
        const maxQuantity = maxSold.value ? parseInt(maxSold.value) : Infinity;
        const minPriceValue = minPrice.value ? parseInt(minPrice.value) : 0;
        const maxPriceValue = maxPrice.value ? parseInt(maxPrice.value) : Infinity;
        
        filteredData = bestsellersData.filter(item => {
            // Filtre par terme de recherche (nom du produit ou catégorie)
            const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                                 (item.category && item.category.toLowerCase().includes(searchTerm));
            
            // Filtre par catégorie
            const matchesCategory = !selectedCategory || item.category === selectedCategory;
            
            // Filtre par quantité vendue
            const matchesQuantity = item.totalQuantity >= minQuantity && item.totalQuantity <= maxQuantity;
            
            // Filtre par prix
            const matchesPrice = item.unitPrice >= minPriceValue && item.unitPrice <= maxPriceValue;
            
            return matchesSearch && matchesCategory && matchesQuantity && matchesPrice;
        });
        
        // Réinitialiser à la première page après l'application des filtres
        currentPage = 1;
        updateTable();
    }
    
    function resetFilters() {
        searchInput.value = '';
        categoryFilter.value = '';
        minSold.value = '';
        maxSold.value = '';
        minPrice.value = '';
        maxPrice.value = '';
        
        filteredData = [...bestsellersData];
        currentPage = 1;
        updateTable();
    }
    
    function updateTable() {
        // Calculer les indices de début et de fin pour la pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
        
        // Vider le tableau existant
        bestsellersTable.innerHTML = '';
        
        // Vérifier s'il y a des données à afficher
        if (filteredData.length === 0) {
            bestsellersTable.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px;">
                        Aucun produit ne correspond aux critères de recherche.
                    </td>
                </tr>
            `;
            paginationNav.innerHTML = '';
            return;
        }
        
        // Afficher les produits de la page courante
        for (let i = startIndex; i < endIndex; i++) {
            const item = filteredData[i];
            const row = document.createElement('tr');
            
            // Calculer le total des ventes (prix unitaire * quantité)
            const total = item.totalRevenue || (item.unitPrice * item.totalQuantity);
            
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category || 'Non catégorisé'}</td>
                <td>${item.totalQuantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${item.stock}</td>
                <td>${formatCurrency(total)}</td>
            `;
            
            bestsellersTable.appendChild(row);
        }
        
        // Mettre à jour la pagination
        updatePagination();
    }
    
    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        
        // Vider la navigation de pagination existante
        paginationNav.innerHTML = '';
        
        if (totalPages <= 1) {
            return; // Pas besoin de pagination s'il n'y a qu'une page
        }
        
        // Créer les boutons de pagination correctement
        
        // Bouton précédent
        const prevButton = document.createElement('button');
        prevButton.textContent = '« Précédent';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => changePage(currentPage - 1));
        paginationNav.appendChild(prevButton);
        
        // Pages numérotées
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (currentPage === i) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => changePage(i));
            paginationNav.appendChild(pageButton);
        }
        
        // Bouton suivant
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Suivant »';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => changePage(currentPage + 1));
        paginationNav.appendChild(nextButton);
    }
    
    // Formater les montants en devise
    function formatCurrency(amount) {
        return amount.toLocaleString('fr-FR') + ' Ar';
    }
});