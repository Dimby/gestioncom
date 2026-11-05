const fs = require("fs");
const path = require("path");

const bundledProductsPath = path.join(__dirname, "../public/produits.js");
const writableProductsPath = process.pkg
  ? path.join(process.cwd(), "public", "produits.js")
  : bundledProductsPath;

function getProductsPath() {
  if (process.pkg && !fs.existsSync(writableProductsPath)) {
    fs.mkdirSync(path.dirname(writableProductsPath), { recursive: true });
    fs.copyFileSync(bundledProductsPath, writableProductsPath);
  }

  return writableProductsPath;
}

function readProducts() {
  const data = JSON.parse(fs.readFileSync(getProductsPath(), "utf-8"));
  return data.produits || [];
}

function readCatalog() {
  return JSON.parse(fs.readFileSync(getProductsPath(), "utf-8"));
}

function writeCatalog(data) {
  fs.writeFileSync(getProductsPath(), JSON.stringify(data, null, 2));
}

module.exports = { readProducts, readCatalog, writeCatalog };
