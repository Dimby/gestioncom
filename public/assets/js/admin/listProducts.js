import { PRODUCT_CATEGORIES, calculateSalePrice } from "/assets/js/utils.js";

let currentPage = 1;
let itemsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => {
  renderProducts();

  document.getElementById("searchInput").addEventListener("input", function () {
    currentPage = 1;
    renderProducts(this.value);
  });
});

let medocsData = [];

fetch("/api/products")
  .then(res => res.json())
  .then(data => {
    medocsData = data || [];
    renderProducts();
  });

function renderProducts(filter = "") {

  let products = medocsData;

  // 🔍 filtre recherche
  if (filter) {
    const f = filter.toLowerCase();
    products = products.filter(p =>
      (p.brand_name && p.brand_name.toLowerCase().includes(f)) ||
      (p.generic_name && p.generic_name.toLowerCase().includes(f))
    );
  }

  const totalItems = products.length;
  document.getElementById("productCount").textContent = totalItems;

let paginated = products;

if (itemsPerPage !== "all") {
paginated = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
);
}

  let html = `
    <table border="1" id="productsTable">
      <thead>
        <tr>
            <th>Nom produit</th>
            <th>Type</th>
            <th>Fournisseur</th>
            <th>Prix global</th>
            <th>Prix achat</th>
            <th>Pièces/Boite</th>
            <th>Prix vente</th>
            <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  paginated.forEach(p => {
    html += `
        <tr data-id="${p.id}">
        <td>${p.brand_name || ""}</td>
        <td>${p.generic_name || ""}</td>
        <td>${p.supplier || "-"}</td>
        <td>${p.purchaseTotalPrice || 0}</td> 
        <td>${p.purchasePrice || 0}</td>
        <td>${p.pieces || "-"}</td>
        <td>${p.salePrice || 0}</td>
        <td style="text-align:center;">
            <span class="action-edit">✏️</span>
            <span class="action-delete" style="margin-left:8px;">🗑️</span>
        </td>
        </tr>
    `;
    });

  html += "</tbody></table>";

  document.getElementById("products").innerHTML = html;

  renderPagination(totalItems, paginated.length);
  attachProductActions(paginated);
}

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
    <span id="shownCount">${paginatedCount} affiché(s)</span>
  `;

  document.getElementById("products").after(nav);

  const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(totalItems / itemsPerPage);

  document.getElementById("pageInfo").textContent =
    itemsPerPage === "all"
      ? `Tous les résultats`
      : `Page ${currentPage} / ${totalPages}`;

  document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts(document.getElementById("searchInput")?.value || "");
    }
  };

  document.getElementById("nextPage").onclick = () => {
    if (itemsPerPage !== "all" && currentPage < totalPages) {
      currentPage++;
      renderProducts(document.getElementById("searchInput")?.value || "");
    }
  };

  document.getElementById("itemsPerPageSelect").value = itemsPerPage;

  document.getElementById("itemsPerPageSelect").onchange = function () {
    itemsPerPage = this.value === "all" ? "all" : Number(this.value);
    currentPage = 1;
    renderProducts(document.getElementById("searchInput")?.value || "");
  };
}

function attachProductActions(products) {

  // ✏️ EDIT
  document.querySelectorAll(".action-edit").forEach(btn => {
    btn.onclick = function () {

        const tr = this.closest("tr");
        const id = tr.getAttribute("data-id");

        const product = products.find(p => p.id == id);
        if (!product) return;

        createProductEditModal();

        const modal = document.getElementById("editProductModal");

        // remplir les champs
        document.getElementById("editProductName").value = product.brand_name || "";
        document.getElementById("editProductType").value = product.generic_name || "";
        document.getElementById("editProductPieces").value = product.pieces || "";
        document.getElementById("editProductSupplier").value = product.supplier || "";
        document.getElementById("editProductPurchasePrice").value = product.purchasePrice || "";
        document.getElementById("editProductSalePrice").value = product.salePrice || "";
        document.getElementById("editProductTotalPrice").value = product.purchaseTotalPrice || "";

        modal.style.display = "flex";

        const purchaseInput = document.getElementById("editProductPurchasePrice");
        const saleInput = document.getElementById("editProductSalePrice");

        purchaseInput.addEventListener("input", () => {

            const purchase = Number(purchaseInput.value);

            if (!purchase || purchase <= 0) {
                saleInput.value = "";
                return;
            }
            
            saleInput.value = calculateSalePrice(purchase);
        });

        // submit
        document.getElementById("editProductForm").onsubmit = async function (e) {
            e.preventDefault();

            const updated = {
                brand_name: document.getElementById("editProductName").value,
                generic_name: document.getElementById("editProductType").value,
                pieces: (document.getElementById("editProductPieces").value) || 0,
                supplier: document.getElementById("editProductSupplier").value,
                purchasePrice: Number(document.getElementById("editProductPurchasePrice").value) || 0,
                salePrice: Number(document.getElementById("editProductSalePrice").value) || 0,
                purchaseTotalPrice: Number(document.getElementById("editProductTotalPrice").value) || 0,
            };

            try {
                const res = await fetch(`/api/products/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updated)
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.message);

                modal.style.display = "none";

                alert("Produit modifié !");
                renderProducts(document.getElementById("searchInput")?.value || "");

                window.location.reload();

            } catch (err) {
                console.error(err);
                alert("Erreur : " + err.message);
            }
        };
    };
    });

  // 🗑️ DELETE
  document.querySelectorAll(".action-delete").forEach(btn => {
    btn.onclick = async function () {

        const tr = this.closest("tr");
        const id = tr.getAttribute("data-id");

        if (!confirm("Supprimer ce produit ?")) return;

        try {
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE"
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message);

            alert("Produit supprimé !");
            renderProducts(document.getElementById("searchInput")?.value || "");

            window.location.reload();

        } catch (err) {
            console.error(err);
            alert("Erreur : " + err.message);
        }
    };
    });
}

function createProductEditModal() {

  if (document.getElementById("editProductModal")) return;

  const modal = document.createElement("div");
  modal.id = "editProductModal";

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

  modal.innerHTML = `
  <div style="background:#fff;padding:20px;border-radius:10px;width:400px">
    <h3>Modifier produit</h3>

    <form id="editProductForm">

      <div>
        <label>Nom produit</label>
        <input type="text" id="editProductName" required style="width:100%">
      </div>

      <div>
        <label>Type</label>
        <input type="text" id="editProductType" style="width:100%">
      </div>

      <div>
        <label>Nombre de pièces</label>
        <input type="text" id="editProductPieces" style="width:100%">
      </div>

      <div>
        <label>Fournisseur</label>
        <input type="text" id="editProductSupplier" style="width:100%">
      </div>

      <div>
        <label>Prix Global</label>
        <input type="number" id="editProductTotalPrice" style="width:100%">
      </div>

      <div>
        <label>Prix d'achat</label>
        <input type="number" id="editProductPurchasePrice" style="width:100%">
      </div>

      <div>
        <label>Prix de vente</label>
        <input type="number" id="editProductSalePrice" style="width:100%">
      </div>

      <div style="margin-top:15px; display:flex; justify-content:space-between;">
        <button type="button" id="cancelEditProduct">Annuler</button>
        <button type="submit">Valider</button>
      </div>

    </form>
  </div>
`;

  document.body.appendChild(modal);

  document.getElementById("cancelEditProduct").onclick = () => {
    modal.style.display = "none";
  };
}

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("newProduct").onclick = () => {
    createProductAddModal();
    const modal = document.getElementById("addProductModal");
    modal.style.display = "flex";
  };

});

function createProductAddModal() {

    if (document.getElementById("addProductModal")) return;

    const modal = document.createElement("div");
    modal.id = "addProductModal";

    modal.style = `
        display:none;
        position:fixed;
        z-index:1000;
        top:0;left:0;
        width:100vw;height:100vh;
        background:rgba(0,0,0,0.5);
        justify-content:center;
        align-items:center;
    `;

    modal.innerHTML = `
        <div style="background:#fff;padding:20px;border-radius:10px;width:400px">
        <h3>Ajouter produit</h3>

        <form id="addProductForm">

            <input type="text" id="addName" placeholder="Nom produit" required>

            <select id="addType"></select>

            <input type="text" id="addPieces" placeholder="Nombre de pièces">

            <input type="text" id="addSupplier" placeholder="Fournisseur">

            <input type="number" id="addTotalPrice" placeholder="Prix global">

            <input type="number" id="addPurchase" placeholder="Prix achat" required>

            <input type="number" id="addSale" placeholder="Prix vente" required>

            <div style="margin-top:10px">
            <button type="button" id="cancelAddProduct">Annuler</button>
            <button type="submit">Ajouter</button>
            </div>

        </form>
        </div>
    `;

    const typeSelect = modal.querySelector("#addType");

    Object.keys(PRODUCT_CATEGORIES).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = PRODUCT_CATEGORIES[key];
        typeSelect.appendChild(option);
    });

    const purchaseInput = modal.querySelector("#addPurchase");
    const saleInput = modal.querySelector("#addSale");

    // Calcul automatique du prix de vente
    purchaseInput.addEventListener("input", () => {
        const purchase = Number(purchaseInput.value);

        if (!purchase || purchase <= 0) {
            saleInput.value = "";
            return;
        }

        saleInput.value = calculateSalePrice(purchase);
    });

    modal.querySelector("#addProductForm").onsubmit = async function(e){
        e.preventDefault();

        const stock = 0; // On démarre à 0, le stock initial sera géré via l'historique du produit

        try {
            const newId = Date.now().toString();
            const product = {
                id: newId,
                brand_name: modal.querySelector("#addName").value,
                generic_name: modal.querySelector("#addType").value,
                pieces: (modal.querySelector("#addPieces").value),
                supplier: modal.querySelector("#addSupplier").value,
                purchasePrice: Number(modal.querySelector("#addPurchase").value),
                salePrice: Number(modal.querySelector("#addSale").value),
                purchaseTotalPrice: Number(modal.querySelector("#addTotalPrice").value) || 0,
            };

            // await fetch("/api/products", {
            //     method:"POST",
            //     headers:{ "Content-Type":"application/json" },
            //     body: JSON.stringify(product)
            // });

            const values = JSON.stringify({
                id: newId,
                brand_name: product.brand_name,
                name: product.brand_name + " - " + product.generic_name,
                pieces: product.pieces,
                category: product.generic_name,
                purchasePrice: product.purchasePrice,
                salePrice: product.salePrice,
                stock: stock,
                sold: 0,
                history: [{
                    date: new Date().toISOString(),
                    change: stock,
                    stockBefore: stock,
                    purchasePrice: product.purchasePrice,
                    salePrice: product.salePrice,
                    note: "Création initiale du produit"
                }]
            });

            const res = await fetch("/api/stocks", {
                method:"POST",
                headers:{ "Content-Type":"application/json" },
                body: values
            });

            if (res.ok) {
                alert(`Produit créé et ajouté au stock !`);
            } else {
                const err = await res.json();
                alert(err.message || "Erreur lors de l'ajout.");
            }

            alert("Produit ajouté !");
            modal.style.display = "none";

            reloadProducts();

        } catch(err){
            console.error(err);
            alert("Erreur : " + err.message);
        }
    };

    document.body.appendChild(modal);

    document.getElementById("cancelAddProduct").onclick = () => {
        modal.style.display = "none";
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}

async function reloadProducts(filter = "") {
  const res = await fetch("/api/products");
  const data = await res.json();
  medocsData = data || [];
  renderProducts(filter);
}

async function sendOrder() {
  try {
    // Récupérer les lignes de commande du modal
    const rows = document.querySelectorAll("#orderBody tr");
    
    if (rows.length === 0) {
      alert("Veuillez ajouter au moins une ligne à la commande.");
      return;
    }

    // Construire le tableau des articles
    const items = [];
    for (const tr of rows) {
      const productId = tr.querySelector(".order-product-select").value;
      const quantity = Number(tr.querySelector(".order-qty").value);

      if (!productId) {
        alert("Veuillez sélectionner un produit pour chaque ligne.");
        return;
      }

      if (!quantity || quantity <= 0) {
        alert("Veuillez entrer une quantité valide pour chaque ligne.");
        return;
      }

      items.push({
        productId: productId,
        quantity: quantity
      });
    }

    // Envoyer à l'API
    const response = await fetch("/api/orders/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Erreur lors de l'envoi de la commande");
    }

    alert(result.message);

    // Fermer le modal et réinitialiser
    const modal = document.getElementById("orderModal");
    modal.style.display = "none";
    document.getElementById("orderBody").innerHTML = "";
    document.getElementById("orderTotal").textContent = "0";

  } catch (err) {
    console.error("Erreur lors de l'envoi de la commande:", err);
    alert("Erreur : " + err.message);
  }
}

function createOrderModal() {

  if (document.getElementById("orderModal")) return;

  const modal = document.createElement("div");
  modal.id = "orderModal";

  modal.style = `
    display:none;
    position:fixed;
    top:0;left:0;
    width:100vw;height:100vh;
    background:rgba(0,0,0,0.5);
    justify-content:center;
    align-items:center;
  `;

  modal.innerHTML = `
    <div style="background:#fff;padding:20px;border-radius:10px;max-height: 730px;
    overflow: auto;">
      <h3>Nouvelle commande</h3>

      <table style="width:100%" id="orderTable">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Fournisseur</th>
            <th>Prix boîte</th>
            <th>Quantité</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="orderBody"></tbody>
      </table>

      <div style="margin-top:15px">
        <button style="background-color: #575858;" id="addOrderLine">+ Ajouter ligne</button>
      </div>

      <div style="margin-top:15px">
        <strong>Total : <span id="orderTotal">0</span></strong>
      </div>

      <div style="margin-top:10px">
        <button id="sendOrderModal">Confirmer</button>
        <button id="closeOrderModal">Fermer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("closeOrderModal").onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("sendOrderModal").onclick = async () => {
    await sendOrder();
  };

  document.getElementById("addOrderLine").onclick = () => {
    addOrderLine();
  };

  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

function addOrderLine() {

  const tbody = document.getElementById("orderBody");

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <select class="order-product-select"></select>
    </td>
    <td><input class="order-supplier" readonly></td>
    <td><input class="order-price" readonly></td>
    <td><input type="number" class="order-qty" value="1" min="1"></td>
    <td><button class="remove-line">❌</button></td>
  `;

  tbody.appendChild(tr);

  const select = tr.querySelector(".order-product-select");

  $(select).select2({
    placeholder: "Rechercher un produit",
    width: 'resolve'
  });

  // remplir produits
  medocsData.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.brand_name;
    select.appendChild(option);
  });

  // update auto
  $(select).on("change", () => {
    updateLine(tr);
  });
  tr.querySelector(".order-qty").oninput = updateTotal;

  tr.querySelector(".remove-line").onclick = () => {
    tr.remove();
    updateTotal();
  };

  // initialiser
  updateLine(tr);
}

function updateLine(tr) {

  const id = tr.querySelector(".order-product-select").value;
  const product = medocsData.find(p => p.id == id);

  if (!product) return;

  tr.querySelector(".order-supplier").value = product.supplier || "-";
  tr.querySelector(".order-price").value = product.purchaseTotalPrice || 0;

  updateTotal();
}

function updateTotal() {

  let total = 0;
  let totalQuantity = 0;
  let totalLines = 0;

  document.querySelectorAll("#orderBody tr").forEach(tr => {
    const price = Number(tr.querySelector(".order-price").value);
    const qty = Number(tr.querySelector(".order-qty").value);

    if (qty > 0) {
      totalLines++;           // nombre de produits différents
      totalQuantity += qty;   // quantité totale réelle
      total += price * qty;
    }
  });

  document.getElementById("orderTotal").textContent =
    `${total} Ar (${totalLines} produits, ${totalQuantity} unités)`;
}

document.getElementById("simulateOrder").onclick = () => {
  createOrderModal();

  const modal = document.getElementById("orderModal");
  modal.style.display = "flex";

  document.getElementById("orderBody").innerHTML = "";
  addOrderLine();
};