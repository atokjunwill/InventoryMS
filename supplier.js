const supplierTableBody = document.getElementById('supplierTableBody');
const supplierSearch = document.getElementById('supplierSearch');
const supplierModal = document.getElementById('supplierModal');
const supplierForm = document.getElementById('supplierForm');
const supplierError = document.getElementById('supplierError');

function renderSuppliers() {
  const search = supplierSearch.value.toLowerCase();

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search) ||
    s.contact.toLowerCase().includes(search) ||
    s.email.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    supplierTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">No suppliers found.</td></tr>';
    return;
  }

  supplierTableBody.innerHTML = filtered.map(s => {
    // Count how many products belong to this supplier
    const count = products.filter(p => p.supplierId === s.id).length;

    return `
      <tr>
        <td>
          <strong>${escapeHTML(s.name)}</strong><br>
          <span class="cell-muted">${escapeHTML(s.address)}</span>
        </td>
        <td>${escapeHTML(s.contact)}</td>
        <td>${escapeHTML(s.email)}</td>
        <td>${escapeHTML(s.phone)}</td>
        <td>
          <button class="link-btn" data-action="products" data-id="${s.id}">
            ${count} ${count === 1 ? 'product' : 'products'}
          </button>
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-ghost btn-small" data-action="edit" data-id="${s.id}">Edit</button>
            <button class="btn btn-danger btn-small" data-action="delete" data-id="${s.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function populateSupplierDropdowns() {
  const formSelect = document.getElementById('productSupplier');
  const filterSelect = document.getElementById('supplierFilter');

  const options = suppliers
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`)
    .join('');

  // Remember what was selected, so a refresh doesn't reset it
  const currentFilter = filterSelect.value;
  const currentForm = formSelect.value;

  formSelect.innerHTML = '<option value="">No supplier</option>' + options;
  filterSelect.innerHTML = '<option value="all">All suppliers</option>' + options;

  filterSelect.value = suppliers.some(s => s.id === currentFilter) ? currentFilter : 'all';
  formSelect.value = suppliers.some(s => s.id === currentForm) ? currentForm : '';
}

function openSupplierModal(supplier = null) {
  supplierError.textContent = '';
  supplierForm.reset();

  if (supplier) {
    document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
    document.getElementById('supplierId').value = supplier.id;
    document.getElementById('supplierName').value = supplier.name;
    document.getElementById('supplierContact').value = supplier.contact;
    document.getElementById('supplierEmail').value = supplier.email;
    document.getElementById('supplierPhone').value = supplier.phone;
    document.getElementById('supplierAddress').value = supplier.address;
  } else {
    document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
    document.getElementById('supplierId').value = '';
  }

  supplierModal.classList.add('open');
}

function closeSupplierModal() {
  supplierModal.classList.remove('open');
}

supplierForm.addEventListener('submit', event => {
  event.preventDefault();

  const id = document.getElementById('supplierId').value;
  const name = document.getElementById('supplierName').value.trim();
  const contact = document.getElementById('supplierContact').value.trim();
  const email = document.getElementById('supplierEmail').value.trim();
  const phone = document.getElementById('supplierPhone').value.trim();
  const address = document.getElementById('supplierAddress').value.trim();

  // ----- Validation -----
  if (!name) {
    supplierError.textContent = 'Supplier name is required.';
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    supplierError.textContent = 'Enter a valid email address.';
    return;
  }
  const duplicate = suppliers.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== id);
  if (duplicate) {
    supplierError.textContent = 'A supplier with that name already exists.';
    return;
  }

  // ----- Add or update -----
  if (id) {
    const index = suppliers.findIndex(s => s.id === id);
    suppliers[index] = { ...suppliers[index], name, contact, email, phone, address };
  } else {
    suppliers.push({ id: generateId(), name, contact, email, phone, address });
  }

  // ----- The loop: save, then re-render -----
  saveData('suppliers', suppliers);
  populateSupplierDropdowns();
  renderProducts();          // also refreshes the suppliers table (Step 5a)
  closeSupplierModal();
});

supplierTableBody.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;
  const supplier = suppliers.find(s => s.id === id);

  if (button.dataset.action === 'edit') {
    openSupplierModal(supplier);
  }

  if (button.dataset.action === 'products') {
    viewSupplierProducts(id);
  }

  if (button.dataset.action === 'delete') {
    const linked = products.filter(p => p.supplierId === id);
    const warning = linked.length > 0
      ? `Delete "${supplier.name}"?\n\n${linked.length} product(s) will be left with no supplier.`
      : `Delete "${supplier.name}"?`;

    if (confirm(warning)) {
      // Unlink the products first, so none point to a supplier that no longer exists
      products.forEach(p => {
        if (p.supplierId === id) p.supplierId = '';
      });
      suppliers = suppliers.filter(s => s.id !== id);

      saveData('products', products);
      saveData('suppliers', suppliers);
      populateSupplierDropdowns();
      renderProducts();
    }
  }
});

// Jump to the Products page, filtered to one supplier
function viewSupplierProducts(supplierId) {
  productSearch.value = '';
  categoryFilter.value = 'all';
  document.getElementById('supplierFilter').value = supplierId;
  showPage('products');      // defined in app.js
  renderProducts();
}

document.getElementById('addSupplierBtn').addEventListener('click', () => openSupplierModal());
document.getElementById('supplierCancelBtn').addEventListener('click', closeSupplierModal);

supplierModal.addEventListener('click', event => {
  if (event.target === supplierModal) closeSupplierModal();
});

supplierSearch.addEventListener('input', renderSuppliers);

