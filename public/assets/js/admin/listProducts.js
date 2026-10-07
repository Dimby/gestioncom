import { PRODUCT_CATEGORIES, calculateSalePrice } from "/assets/js/utils.js";
const DRAFT = "gestioncom.orderDraft.v1";
let products = [],
	currentPage = 1,
	itemsPerPage = 10;

const PRODUCT_UNITS = [
	["piece", "Pièce"],
	["boite", "Boîte"],
	["litre", "Litre"],
	["kg", "Kilogramme"],
	["metre", "Mètre"],
	["rouleau", "Rouleau"],
	["paquet", "Paquet"],
];

function productUnits(product = {}) {
	product = product || {};
	const legacy = String(product.pieces ?? "").trim().match(/^(\d+(?:[.,]\d+)?)\s*([^\d\s(]+)?/);
	const legacyQuantity = legacy ? Number(legacy[1].replace(",", ".")) : 1;
	const legacyUnit = legacy?.[2]?.toLowerCase() || "piece";
	const units = {
		pieces: "piece",
		pièce: "piece",
		pièces: "piece",
		boites: "boite",
		"boîte": "boite",
		"boîtes": "boite",
		litres: "litre",
		kilogramme: "kg",
		kilogrammes: "kg",
		mètre: "metre",
		mètres: "metre",
		rouleaux: "rouleau",
		paquets: "paquet",
	};
	const quantity = Number(product.piecesQuantity);
	return {
		piecesQuantity: Number.isFinite(quantity) && quantity > 0
			? quantity
			: (Number.isFinite(legacyQuantity) && legacyQuantity > 0 ? legacyQuantity : 1),
		piecesUnit: product.piecesUnit || units[legacyUnit] || legacyUnit,
	};
}

function formatPieces(product) {
	const { piecesQuantity, piecesUnit } = productUnits(product);
	const labels = {
		piece: ["pièce", "pièces"],
		boite: ["boîte", "boîtes"],
		litre: ["litre", "litres"],
		kg: ["kg", "kg"],
		metre: ["mètre", "mètres"],
		rouleau: ["rouleau", "rouleaux"],
		paquet: ["paquet", "paquets"],
	};
	const unitLabels = labels[piecesUnit] || [piecesUnit, `${piecesUnit}s`];
	return `${piecesQuantity} ${piecesQuantity > 1 ? unitLabels[1] : unitLabels[0]}`;
}

function purchasePrice(total, quantity) {
	const count = Number(quantity);
	return count > 0 ? Math.ceil((Number(total) || 0) / count) : 0;
}

document.addEventListener("DOMContentLoaded", async () => {
	await reloadProducts();
	searchInput.oninput = () => {
		currentPage = 1;
		renderProducts();
	};
	newProduct.onclick = () => openProductModal();
});
async function reloadProducts() {
	const r = await fetch("/api/products");
	products = await r.json();
	syncDraft();
	renderProducts();
}
function renderProducts() {
	const f = searchInput.value.toLowerCase(),
		filtered = products.filter(
			(p) =>
				!f ||
				[p.brand_name, p.generic_name, p.supplier].some((v) =>
					String(v || "")
						.toLowerCase()
						.includes(f),
				),
		),
		shown =
			itemsPerPage === "all"
				? filtered
				: filtered.slice(
					(currentPage - 1) * itemsPerPage,
					currentPage * itemsPerPage,
				);
	productCount.textContent = filtered.length;
	const container = document.getElementById("products");
	container.innerHTML = `<table border="1" id="productsTable"><thead><tr><th>Nom produit</th><th>Type</th><th>Fournisseur</th><th>Prix global</th><th>Prix achat</th><th>Pièces/Boite</th><th>Prix vente</th><th>Action</th></tr></thead><tbody>${shown.map((p) => `<tr data-id="${p.id}"><td>${p.brand_name || ""}</td><td>${p.generic_name || ""}</td><td>${p.supplier || "-"}</td><td>${p.purchaseTotalPrice || 0}</td><td>${p.purchasePrice || 0}</td><td>${formatPieces(p)}</td><td>${p.salePrice || 0}</td><td><button class="edit-product">✏️</button><button class="delete-product">🗑️</button></td></tr>`).join("")}</tbody></table>`;
	document
		.querySelectorAll(".edit-product")
		.forEach(
			(b) =>
			(b.onclick = () =>
				openProductModal(
					products.find((p) => String(p.id) === b.closest("tr").dataset.id),
				)),
		);
	document
		.querySelectorAll(".delete-product")
		.forEach(
			(b) => (b.onclick = () => deleteProduct(b.closest("tr").dataset.id)),
		);
	pagination(filtered.length, shown.length);
}
function pagination(total, shown) {
	let n = document.getElementById("paginationNav");
	if (!n) {
		n = document.createElement("div");
		n.id = "paginationNav";
		document.getElementById("products").after(n);
	}
	const pages =
		itemsPerPage === "all" ? 1 : Math.max(1, Math.ceil(total / itemsPerPage));
	if (currentPage > pages) currentPage = pages;
	n.innerHTML = `<button id="prevPage">&lt;</button><span>Page ${currentPage} / ${pages}</span><button id="nextPage">&gt;</button><select id="itemsPerPageSelect"><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="all">Tous</option></select><span>${shown} affiché(s)</span>`;
	itemsPerPageSelect.value = itemsPerPage;
	prevPage.onclick = () => {
		if (currentPage > 1) {
			currentPage--;
			renderProducts();
		}
	};
	nextPage.onclick = () => {
		if (currentPage < pages) {
			currentPage++;
			renderProducts();
		}
	};
	itemsPerPageSelect.onchange = (e) => {
		itemsPerPage = e.target.value === "all" ? "all" : Number(e.target.value);
		currentPage = 1;
		renderProducts();
	};
}
function productModal() {
	if (document.getElementById("editProductModal")) return;
	const m = document.createElement("div");
	m.id = "editProductModal";
	m.style.cssText =
		"display:none;position:fixed;z-index:1000;inset:0;background:#0008;justify-content:center;align-items:center";
	m.innerHTML = `<div style="background:white;padding:20px;border-radius:10px;width:400px"><h3 id="productModalTitle"></h3><form id="editProductForm"><label>Nom produit<input id="productName" required></label><label>Type<select id="productType"></select></label><label>Fournisseur<input id="productSupplier"></label><label>Prix global<input type="number" min="0" step="any" id="productTotalPrice"></label><label>Nombre de pièces/boîtes<input type="number" min="0.01" step="any" id="productPiecesQuantity" required></label><label>Unité<select id="productPiecesUnit" required></select></label><label>Prix d'achat<input type="number" min="0" id="productPurchasePrice" readonly required></label><label>Prix de vente<input type="number" min="0" id="productSalePrice" required></label><p style="margin: 0"><button type="button" id="cancelProduct">Annuler</button><button>Valider</button></p></form></div>`;
	document.body.appendChild(m);
	const q = (id) => m.querySelector(`#${id}`);
	Object.entries(PRODUCT_CATEGORIES).forEach(([v, l]) =>
		q("productType").add(new Option(l, v)),
	);
	PRODUCT_UNITS.forEach(([value, label]) =>
		q("productPiecesUnit").add(new Option(label, value)),
	);
	q("cancelProduct").onclick = () => (m.style.display = "none");
	m.onclick = (e) => {
		if (e.target === m) m.style.display = "none";
	};
}
function openProductModal(p = null) {
	productModal();
	const modal = document.getElementById("editProductModal"),
		q = (id) => modal.querySelector(`#${id}`);
	q("productModalTitle").textContent = p
		? "Modifier le produit"
		: "Ajouter un produit";
	q("productName").value = p?.brand_name || "";
	q("productType").value = p?.generic_name || "";
	q("productSupplier").value = p?.supplier || "";
	q("productTotalPrice").value = p?.purchaseTotalPrice || "";
	const units = productUnits(p);
	q("productPiecesQuantity").value = units.piecesQuantity;
	q("productPiecesUnit").value = units.piecesUnit;
	q("productPurchasePrice").value = purchasePrice(
		q("productTotalPrice").value,
		q("productPiecesQuantity").value,
	);
	q("productSalePrice").value = p?.salePrice || "";
	const updatePurchasePrice = () => {
		const amount = purchasePrice(q("productTotalPrice").value, q("productPiecesQuantity").value);
		q("productPurchasePrice").value = amount;
		if (amount > 0) q("productSalePrice").value = calculateSalePrice(amount);
	};
	q("productTotalPrice").oninput = updatePurchasePrice;
	q("productPiecesQuantity").oninput = updatePurchasePrice;
	q("editProductForm").onsubmit = async (e) => {
		e.preventDefault();
		const body = {
			brand_name: q("productName").value.trim(),
			generic_name: q("productType").value,
			piecesQuantity: +q("productPiecesQuantity").value,
			piecesUnit: q("productPiecesUnit").value,
			supplier: q("productSupplier").value.trim(),
			purchaseTotalPrice: +q("productTotalPrice").value || 0,
			purchasePrice: +q("productPurchasePrice").value || 0,
			salePrice: +q("productSalePrice").value || 0,
		};
		const r = await fetch(p ? `/api/products/${p.id}` : "/api/products", {
			method: p ? "PUT" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
			out = await r.json();
		if (!r.ok) return alert(out.message || "Erreur");
		modal.style.display = "none";
		await reloadProducts();
	};
	modal.style.display = "flex";
}
async function deleteProduct(id) {
	if (!confirm("Supprimer ce produit ?")) return;
	const r = await fetch(`/api/products/${id}`, { method: "DELETE" }),
		o = await r.json();
	if (!r.ok) return alert(o.message || "Erreur");
	localStorage.setItem(
		DRAFT,
		JSON.stringify(
			readDraft().filter((x) => String(x.productId) !== String(id)),
		),
	);
	await reloadProducts();
}
function createOrderModal() {
	if (document.getElementById("orderModal")) return;
	const m = document.createElement("div");
	m.id = "orderModal";
	m.style.cssText =
		"display:none;position:fixed;z-index:1000;inset:0;background:#0008;justify-content:center;align-items:center";
	m.innerHTML = `<div style="background:white;padding:20px;border-radius:10px;max-height:730px;overflow:auto"><h3>Nouvelle commande</h3><table id="orderTable"><thead><tr><th>Produit</th><th>Fournisseur</th><th>Prix globale</th><th>Pièces/Boite</th><th>Quantité</th><th></th></tr></thead><tbody id="orderBody"></tbody></table><p><button id="addOrderLine">+ Ajouter ligne</button></p><strong>Total : <span id="orderTotal">0</span></strong><p style="display:flex;gap:10px;"><button id="sendOrderModal">Confirmer</button><button id="closeOrderModal">Fermer</button></p></div>`;
	document.body.appendChild(m);
	closeOrderModal.onclick = () => {
		saveDraft();
		m.style.display = "none";
	};
	addOrderLine.onclick = () => addLine();
	sendOrderModal.onclick = sendOrder;
	m.onclick = (e) => {
		if (e.target === m) {
			saveDraft();
			m.style.display = "none";
		}
	};
}
function addLine(line = {}) {
	const tr = document.createElement("tr");
	tr.innerHTML = `<td><select class="order-product-select"><option value="">Sélectionner</option>${products.map((p) => `<option value="${p.id}">${p.brand_name}</option>`).join("")}</select></td><td><input class="order-supplier" readonly></td><td><input type="number" min="0" class="order-price"></td><td><input class="order-pieces"></td><td><input type="number" min="1" class="order-qty" value="1"></td><td><button class="remove-line">❌</button></td>`;
	orderBody.appendChild(tr);
	const s = tr.querySelector(".order-product-select");
	s.value = line.productId || "";
	const update = () => {
		const p = products.find((x) => String(x.id) === s.value);
		if (!p) return;
		tr.querySelector(".order-supplier").value = p.supplier || "-";
		tr.querySelector(".order-price").value =
			line.price ?? p.purchaseTotalPrice ?? 0;
		tr.querySelector(".order-pieces").value = line.pieces ?? p.pieces ?? "";
		line = {};
		saveDraft();
		total();
	};
	s.onchange = update;
	[".order-price", ".order-pieces", ".order-qty"].forEach(
		(x) =>
		(tr.querySelector(x).oninput = () => {
			saveDraft();
			total();
		}),
	);
	tr.querySelector(".remove-line").onclick = () => {
		tr.remove();
		saveDraft();
		total();
	};
	if (s.value) update();
	else total();
}
function lines() {
	return [...document.querySelectorAll("#orderBody tr")]
		.map((t) => ({
			productId: t.querySelector(".order-product-select").value,
			price: +t.querySelector(".order-price").value || 0,
			pieces: t.querySelector(".order-pieces").value,
			quantity: +t.querySelector(".order-qty").value || 1,
		}))
		.filter((x) => x.productId);
}
function readDraft() {
	try {
		return JSON.parse(localStorage.getItem(DRAFT) || "[]");
	} catch {
		return [];
	}
}
function saveDraft() {
	localStorage.setItem(DRAFT, JSON.stringify(lines()));
}
function restoreDraft() {
	orderBody.innerHTML = "";
	(readDraft().length ? readDraft() : [{}]).forEach(addLine);
}
function syncDraft() {
	const m = new Map(products.map((p) => [String(p.id), p]));
	localStorage.setItem(
		DRAFT,
		JSON.stringify(
			readDraft()
				.filter((x) => m.has(String(x.productId)))
				.map((x) => ({
					...x,
					pieces: m.get(String(x.productId)).pieces ?? "",
					price: m.get(String(x.productId)).purchaseTotalPrice ?? 0,
				})),
		),
	);
	globalThis.__products = products;
}
function total() {
	let sum = 0,
		q = 0;
	document.querySelectorAll("#orderBody tr").forEach((t) => {
		const n = +t.querySelector(".order-qty").value || 0;
		sum += (+t.querySelector(".order-price").value || 0) * n;
		q += n;
	});
	orderTotal.textContent = `${sum} Ar (${q} unités)`;
}
async function sendOrder() {
	const items = lines();
	if (!items.length) return alert("Ajoutez une ligne valide.");
	const r = await fetch("/api/orders/batch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ items }),
	}),
		o = await r.json();
	if (!r.ok) return alert(o.message || "Erreur");
	localStorage.removeItem(DRAFT);
	orderBody.innerHTML = "";
	total();
	orderModal.style.display = "none";
	await reloadProducts();
	alert(o.message);
}
