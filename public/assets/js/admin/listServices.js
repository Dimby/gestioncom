document.addEventListener("DOMContentLoaded", () => {
  renderServices();

  document.getElementById("searchInput").addEventListener("input", function() {
    renderServices(this.value);
  });
});

let produits = [];
fetch("/api/stocks")
  .then(res => res.json())
  .then(data => {
    produits = data;
  });

let medocsData = [];
fetch("/api/products")
  .then((res) => res.json())
  .then((data) => {
    medocsData = data || [];
  });

let currentPage = 1;
let itemsPerPage = 10;

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
  document.getElementById("services").after(nav);

  const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(totalItems / itemsPerPage);
  document.getElementById("pageInfo").textContent =
    itemsPerPage === "all"
      ? `Tous les résultats`
      : `Page ${currentPage} / ${totalPages}`;

  document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderServices(document.getElementById("searchInput")?.value || "");
    }
  };
  document.getElementById("nextPage").onclick = () => {
    if (itemsPerPage !== "all" && currentPage < totalPages) {
      currentPage++;
      renderServices(document.getElementById("searchInput")?.value || "");
    }
  };
  document.getElementById("itemsPerPageSelect").value = itemsPerPage;
  document.getElementById("itemsPerPageSelect").onchange = function () {
    itemsPerPage = this.value === "all" ? "all" : Number(this.value);
    currentPage = 1;
    renderServices(document.getElementById("searchInput")?.value || "");
  };
}

async function renderServices(filter = "") {
  const res = await fetch("/api/services");
  let services = await res.json();

  // Filtre sur le nom, catégorie, ou produit
  if (filter) {
    const f = filter.toLowerCase();
    services = services.filter(s => {
      const prodObj = produits.find(prod => prod.id == s.produitId);
      const prodName = prodObj ? prodObj.name : "";
      return (s.name && s.name.toLowerCase().includes(f)) ||
             (s.info && s.info.toLowerCase().includes(f)) ||
             (prodName && prodName.toLowerCase().includes(f));
    });
  }

  // Pagination
  const totalItems = services.length;
  let paginated = services;
  if (itemsPerPage !== "all") {
    paginated = services.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }

  let html = `
    <table border="1" id="servicesTable">
      <thead>
        <tr>
          <th>Nom du service</th>
          <th>Produits utilisés</th>
          <th>Prix de vente</th>
          <th>Information</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  paginated.forEach(s => {
    const produit = produits.find(prod => prod.id == s.produitId);

    html += `
      <tr data-id="${s.id}">
        <td>${s.name || ""}</td>
        <td>${produit?.name || "Produit supprimé"}</td>
        <td>${s.price || ""}</td>
        <td>${s.info || "-"}</td>
        <td style="text-align:center;">
          <span class="action-edit" title="Modifier" style="cursor:pointer;">✏️</span>
          <span class="action-delete" title="Supprimer" style="cursor:pointer;margin-left:8px;">🗑️</span>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById("services").innerHTML = html;

  // Style chips
  if (!document.getElementById("chip-style")) {
    const style = document.createElement("style");
    style.id = "chip-style";
    style.textContent = `
      .chip {
        display: inline-block;
        background: #e0e0e0;
        border-radius: 12px;
        padding: 2px 10px;
        margin: 2px;
        font-size: 0.95em;
      }
    `;
    document.head.appendChild(style);
  }

  attachServiceActions(paginated);
  renderPagination(totalItems, paginated.length);
}

function attachServiceActions(services) {
  document.querySelectorAll(".action-edit").forEach(btn => {
    btn.onclick = function() {
      const tr = this.closest("tr");
      const id = tr.getAttribute("data-id");
      const service = services.find(s => s.id == id);
      if (!service) return;

      // APPELER LA NOUVELLE FONCTION DE CRÉATION DE MODAL
      createSimpleServiceEditModal();
      const modal = document.getElementById("editServiceModalSimple");

      // UTILISER LES NOUVEAUX IDs des champs
      document.getElementById("editServiceNameSimple").value = service.name || "";
      document.getElementById("editServicePriceSimple").value = service.price || "";
      document.getElementById("editServiceInfoSimple").value = service.info || "";

      // Pré-sélectionner le produit et mettre à jour Select2
      $('#editServiceProduitSimple').val(service.produitId).trigger('change');

      // Afficher le modal
      modal.style.display = "flex";

      // Validation du NOUVEAU formulaire
      document.getElementById("editServiceFormSimple").onsubmit = async function(e) {
        e.preventDefault();

        const updated = {
          name: document.getElementById("editServiceNameSimple").value,
          produitId: document.getElementById("editServiceProduitSimple").value,
          price: Number(document.getElementById("editServicePriceSimple").value),
          info: document.getElementById("editServiceInfoSimple").value || "",
          category: "service"
        };

        try {
            const res = await fetch(`/api/services/${service.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated)
            });
             const result = await res.json();
             if (!res.ok) throw new Error(result.message || "Erreur serveur");

            alert(result.message || "Service modifié avec succès !");
            modal.style.display = "none";
            renderServices(); // Rafraîchir la liste

        } catch(err) {
             console.error("Erreur lors de la modification du service:", err);
             alert("Erreur: " + err.message);
        }
      };
      document.getElementById("editServiceFormSimple").onsubmit = async function(e) {
        e.preventDefault();

        // Lire les valeurs depuis les NOUVEAUX champs
        const updated = {
          id: service.id, // Garder l'ID original
          name: document.getElementById("editServiceNameSimple").value.trim(),
          produitId: document.getElementById("editServiceProduitSimple").value,
          price: document.getElementById("editServicePriceSimple").value,
          info: document.getElementById("editServiceInfoSimple").value.trim(),
          category: "service" // Assurer que la catégorie est bien 'service'
        };

        // Vérification simple
        if (!updated.name || !updated.produitId || !updated.price) {
            alert("Veuillez remplir tous les champs obligatoires (Nom, Produit, Prix).");
            return;
        }

        try {
            const res = await fetch(`/api/services/${service.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated)
            });
             const result = await res.json();
             if (!res.ok) throw new Error(result.message || "Erreur serveur");

            alert(result.message || "Service modifié avec succès !");
            modal.style.display = "none";
            renderServices(); // Rafraîchir la liste

        } catch(err) {
             console.error("Erreur lors de la modification du service:", err);
             alert("Erreur: " + err.message);
        }
      };

      // Bouton Annuler du NOUVEAU modal
      document.getElementById("cancelEditServiceSimple").onclick = function() {
        modal.style.display = "none";
      };
    };
  });

  // La logique de suppression reste la même
  document.querySelectorAll(".action-delete").forEach(btn => {
    btn.onclick = async function() {
      const tr = this.closest("tr");
      const id = tr.getAttribute("data-id");
      const serviceName = tr.querySelector('td:first-child')?.textContent || 'ce service'; // Récupère le nom pour la confirmation
      if (confirm(`Voulez-vous vraiment supprimer "${serviceName}" ?`)) {
        try {
            const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Erreur serveur");

            alert(result.message || "Service supprimé.");
            renderServices(); // Met à jour le visuel sans reload

        } catch(err) {
             console.error("Erreur lors de la suppression du service:", err);
             alert("Erreur: " + err.message);
        }
      }
    };
  });
}

// Modal HTML structure
// AJOUT : Nouvelle fonction pour créer le modal simple
function createSimpleServiceEditModal() {
  // Ne recrée pas le modal s'il existe déjà
  if (document.getElementById("editServiceModalSimple")) return;

  const modal = document.createElement("div");
  modal.id = "editServiceModalSimple";
  // Styles pour le fond et le centrage (similaires à l'autre modal)
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.zIndex = "1000";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";

  // Structure HTML inspirée de admin.html/form#serviceForm
  modal.innerHTML = `
    <div class="modal-content" style="background:#fff;padding:20px 30px 30px 30px;border-radius:10px;min-width:300px;max-width:90vw; box-shadow: 0 4px 8px rgba(0,0,0,0.1);width:500px">
      <h3 style="margin-top:0;">Modifier le service</h3>
      <form id="editServiceFormSimple">
        <div class="form-group">
          <label for="editServiceNameSimple">Nom du service</label>
          <input type="text" id="editServiceNameSimple" required placeholder="Nom du service">
        </div>
        <div class="form-group">
          <label for="editServiceProduitSimple">Produit utilisé</label>
          <select id="editServiceProduitSimple" name="serviceProduit" style="width:100%;" required>
            <option value="">Sélectionner un produit</option>
            </select>
        </div>
        <div class="form-group">
          <label for="editServicePriceSimple">Prix de service</label>
          <input type="number" id="editServicePriceSimple" placeholder="10000" required>
        </div>
        <div class="form-group">
          <label for="editServiceInfoSimple">Information utile (facultatif)</label>
          <input type="text" id="editServiceInfoSimple" placeholder="Informations supplémentaires">
        </div>
        <div class="modal-actions" style="display:flex; justify-content: space-between; margin-top: 20px;">
          <button type="button" style="background-color: #6c757d;" id="cancelEditServiceSimple">Annuler</button>
          <button type="submit">Valider</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Remplir le select des produits
  const selectProduit = document.getElementById('editServiceProduitSimple');
  if (produits && produits.length > 0) {
      produits.forEach(prod => {
          if (prod.id && prod.name) {
              selectProduit.options.add(new Option(prod.name, prod.id));
          }
      });
  }


  // Initialiser Select2 pour ce nouveau select
  $('#editServiceProduitSimple').select2({
      placeholder: "Sélectionner un produit",
      dropdownParent: $('#editServiceModalSimple') // Important pour l'affichage dans le modal
  });
}

function generateId(len = 10) {
  return Math.random().toString(36).substr(2, len);
}