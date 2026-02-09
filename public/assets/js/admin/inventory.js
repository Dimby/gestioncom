document.addEventListener('DOMContentLoaded', async function () {
  let medicines = [];
  let filteredMedicines = [];
  let currentPage = 1;
  let itemsPerPage = 10;

  // Récupère les données du fichier medocs.json
  async function fetchMedicines() {
    const res = await fetch('/medocs.json');
    const data = await res.json();
    medicines = data.medicines || [];
    filteredMedicines = medicines;
  }

  function renderInventoryTable() {
    const tableBody = document.getElementById('inventoryTableBody');
    tableBody.innerHTML = '';
    let paginated = filteredMedicines;
    if (itemsPerPage !== "all") {
      paginated = filteredMedicines.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );
    }
    paginated.forEach(med => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${med.brand_name}</td>
        <td>${med.sale_price ?? ''}</td>
      `;
      tableBody.appendChild(tr);
    });
    renderPagination(filteredMedicines.length, paginated.length);
  }

  // Pagination identique à listServices.js
  function renderPagination(totalItems, paginatedCount) {
    const nav = document.getElementById("paginationNav") || document.createElement("div");
    nav.id = "paginationNav";
    nav.style.marginTop = "20px";
    nav.style.display = "flex";
    nav.style.alignItems = "center";
    nav.style.gap = "10px";

    nav.innerHTML = `
      <button id="prevPage">&lt;</button>
      <span id="pageInfo"></span>
      <button id="nextPage">&gt;</button>
      <select id="itemsPerPageSelect">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="all">Tous</option>
      </select>
      <span id="shownCount" style="margin-left:10px;">${paginatedCount} affiché(s)</span>
    `;
    document.querySelector(".inventory-container").appendChild(nav);

    const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(totalItems / itemsPerPage);
    document.getElementById("pageInfo").textContent =
      itemsPerPage === "all"
        ? `Tous les résultats`
        : `Page ${currentPage} / ${totalPages}`;

    document.getElementById("prevPage").onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderInventoryTable();
      }
    };
    document.getElementById("nextPage").onclick = () => {
      if (itemsPerPage !== "all" && currentPage < totalPages) {
        currentPage++;
        renderInventoryTable();
      }
    };
    document.getElementById("itemsPerPageSelect").value = itemsPerPage;
    document.getElementById("itemsPerPageSelect").onchange = function () {
      itemsPerPage = this.value === "all" ? "all" : Number(this.value);
      currentPage = 1;
      renderInventoryTable();
    };
  }

  // Logique de recherche
  document.getElementById('searchInput').addEventListener('input', function () {
    const query = this.value.trim().toLowerCase();
    filteredMedicines = medicines.filter(med =>
      med.brand_name && med.brand_name.toLowerCase().includes(query)
    );
    currentPage = 1;
    renderInventoryTable();
  });

  await fetchMedicines();
  renderInventoryTable();
});