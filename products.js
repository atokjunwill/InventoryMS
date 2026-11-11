// ---------- Grab elements ----------
const productTableBody = document.getElementById('productTableBody');
const productSearch = document.getElementById('productSearch');
const categoryFilter = document.getElementById('categoryFilter');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const formError = document.getElementById('formError');
const supplierFilter = document.getElementById('supplierFilter');

// ---------- Render the table ----------
function renderProducts() {
  updateStockSummary();
  updateAlerts();
  renderSuppliers(); 
  renderReports();
  renderDashboard();   

  const search = productSearch.value.toLowerCase();
  const category = categoryFilter.value;
  const supplier = supplierFilter.value;      // NEW

  // 1. Filter by search text, category and supplier
  const filtered = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search);
    const matchesCategory = category === 'all' || p.category === category;
    const matchesSupplier = supplier === 'all' || p.supplierId === supplier;   // NEW
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  // 2. Empty state (colspan is now 8)
  if (filtered.length === 0) {
    productTableBody.innerHTML =
      '<tr><td colspan="8" class="empty-state">No products found.</td></tr>';
    return;
  }

  // 3. Turn each product into a table row
  productTableBody.innerHTML = filtered.map(p => {
    const status = getStockStatus(p);
    const percent = getStockPercent(p);

    return `
      <tr>
        <td>${escapeHTML(p.name)}</td>
        <td>${escapeHTML(p.sku)}</td>
        <td>${escapeHTML(p.category)}</td>
        <td>${escapeHTML(getSupplierName(p.supplierId))}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>
          <div class="stock-cell">
            <strong>${p.stock}</strong>
            <span class="badge badge-${status.key}">${status.label}</span>
          </div>
          <div class="progress">
            <div class="progress-fill fill-${status.key}" style="width: ${percent}%"></div>
          </div>
        </td>
        <td>${p.reorderLevel}</td>
        <td>
          <div class="actions">
            <button class="btn btn-ghost btn-small" data-action="stock" data-id="${p.id}">Stock</button>
            <button class="btn btn-ghost btn-small" data-action="edit" data-id="${p.id}">Edit</button>
            <button class="btn btn-danger btn-small" data-action="delete" data-id="${p.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Prevents users from injecting HTML into your page
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Category dropdown and suggestions ----------
function updateCategories() {
  const categories = [...new Set(products.map(p => p.category))].sort();
  const current = categoryFilter.value;

  categoryFilter.innerHTML =
    '<option value="all">All categories</option>' +
    categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');

  // keep the user's selection if it still exists
  categoryFilter.value = categories.includes(current) ? current : 'all';

  document.getElementById('categoryList').innerHTML =
    categories.map(c => `<option value="${escapeHTML(c)}">`).join('');
}

// ---------- Open and close the modal ----------
function openModal(product = null) {
  formError.textContent = '';
  productForm.reset();

  if (product) {
    // Edit mode: fill the form with existing values
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productSku').value = product.sku;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productReorder').value = product.reorderLevel;
    document.getElementById('productSupplier').value = product.supplierId || '';
  } else {
    // Add mode
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('productId').value = '';
  }

  productModal.classList.add('open');
}

function closeModal() {
  productModal.classList.remove('open');
}

// ---------- Save (with validation) ----------
productForm.addEventListener('submit', event => {
  event.preventDefault();   // stop the page from reloading

  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const sku = document.getElementById('productSku').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const stock = parseInt(document.getElementById('productStock').value);
  const reorderLevel = parseInt(document.getElementById('productReorder').value);
  const supplierId = document.getElementById('productSupplier').value;
  // ----- Validation -----
  if (!name || !sku || !category) {
    formError.textContent = 'Name, SKU and category are required.';
    return;
  }
  if (isNaN(price) || price < 0) {
    formError.textContent = 'Enter a valid price (0 or more).';
    return;
  }
  if (isNaN(stock) || stock < 0 || isNaN(reorderLevel) || reorderLevel < 0) {
    formError.textContent = 'Stock and reorder level must be 0 or more.';
    return;
  }
  const duplicate = products.some(p => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== id);
  if (duplicate) {
    formError.textContent = 'That SKU already exists.';
    return;
  }

  // ----- Add or update -----
  if (id) {
    const index = products.findIndex(p => p.id === id);
    const old = products[index];
    const statusBefore = getStockStatus(old);
    products[index] = { ...old, name, sku, category, price, stock, reorderLevel, supplierId };

    if (stock !== old.stock) {
      logMovement(
        products[index],
        stock > old.stock ? 'in' : 'out',
        Math.abs(stock - old.stock),
        old.stock,
        stock,
        'Manual edit'
      );
    }

    notifyStockChange(products[index], statusBefore, getStockStatus(products[index]));
  } else {
    const newProduct = { id: generateId(), name, sku, category, price, stock, reorderLevel, supplierId };
    products.push(newProduct);

    if (stock > 0) {
      logMovement(newProduct, 'in', stock, 0, stock, 'Initial stock');
    }
  }

  // ----- The loop: save, then re-render -----
  saveData('products', products);
  populateSupplierDropdowns(); 
  updateCategories();
  renderProducts();
  renderMovements();   // defined in stock.js
  closeModal();
});

// ---------- Stock / Edit / Delete (event delegation) ----------
productTableBody.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === 'stock') {
    openStockModal(id);   // defined in stock.js
  }

  if (button.dataset.action === 'edit') {
    const product = products.find(p => p.id === id);
    openModal(product);
  }

  if (button.dataset.action === 'delete') {
    const product = products.find(p => p.id === id);
    if (confirm(`Delete "${product.name}"?`)) {
      products = products.filter(p => p.id !== id);
      saveData('products', products);
      updateCategories();
      renderProducts();
    }
  }
});

// ---------- Buttons ----------
document.getElementById('addProductBtn').addEventListener('click', () => openModal());
document.getElementById('cancelBtn').addEventListener('click', closeModal);

// Close when clicking the dark background
productModal.addEventListener('click', event => {
  if (event.target === productModal) closeModal();
});

// Live search and filter
productSearch.addEventListener('input', renderProducts);
categoryFilter.addEventListener('change', renderProducts);

// NOTE: no startup calls here. They live at the bottom of app.js.