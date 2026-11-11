const saleTableBody = document.getElementById('saleTableBody');
const saleSearch = document.getElementById('saleSearch');
const saleFrom = document.getElementById('saleFrom');
const saleTo = document.getElementById('saleTo');
const saleModal = document.getElementById('saleModal');
const saleForm = document.getElementById('saleForm');
const saleError = document.getElementById('saleError');
const saleProduct = document.getElementById('saleProduct');
const saleQty = document.getElementById('saleQty');

function getFilteredSales() {
  const search = saleSearch.value.toLowerCase();
  const from = saleFrom.value;     // 'YYYY-MM-DD' or ''
  const to = saleTo.value;

  return sales.filter(s => {
    const matchesSearch =
      s.productName.toLowerCase().includes(search) ||
      s.customer.toLowerCase().includes(search);

    const day = toDateKey(s.date);
    const afterFrom = !from || day >= from;
    const beforeTo = !to || day <= to;

    return matchesSearch && afterFrom && beforeTo;
  });
}

function renderSales() {
  const list = getFilteredSales();

  // ----- Summary cards (they follow the filters) -----
  const revenue = list.reduce((sum, s) => sum + s.total, 0);
  const units = list.reduce((sum, s) => sum + s.quantity, 0);

  document.getElementById('saleRevenue').textContent = formatMoney(revenue);
  document.getElementById('saleCount').textContent = list.length;
  document.getElementById('saleUnits').textContent = units;

  // ----- Table -----
  if (list.length === 0) {
    saleTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">No sales found.</td></tr>';
    return;
  }

  saleTableBody.innerHTML = list.map(s => `
    <tr>
      <td>${formatDate(s.date)}</td>
      <td>
        <strong>${escapeHTML(s.productName)}</strong><br>
        <span class="cell-muted">${escapeHTML(s.sku)}</span>
      </td>
      <td>${escapeHTML(s.customer)}</td>
      <td>${s.quantity}</td>
      <td>${formatMoney(s.unitPrice)}</td>
      <td><strong>${formatMoney(s.total)}</strong></td>
    </tr>
  `).join('');
}

function populateSaleProducts() {
  // Only products that can actually be sold
  const available = products
    .filter(p => p.stock > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  saleProduct.innerHTML =
    '<option value="">Select a product...</option>' +
    available.map(p =>
      `<option value="${p.id}">${escapeHTML(p.name)} (${p.stock} in stock)</option>`
    ).join('');
}

function updateSalePreview() {
  const product = products.find(p => p.id === saleProduct.value);
  const qty = parseInt(saleQty.value) || 0;

  if (!product) {
    document.getElementById('salePreviewPrice').textContent = '—';
    document.getElementById('salePreviewStock').textContent = '—';
    document.getElementById('salePreviewTotal').textContent = formatMoney(0);
    return;
  }

  document.getElementById('salePreviewPrice').textContent = formatMoney(product.price);
  document.getElementById('salePreviewStock').textContent = `${product.stock} units`;
  document.getElementById('salePreviewTotal').textContent = formatMoney(product.price * qty);
}

function openSaleModal() {
  saleForm.reset();
  saleQty.value = 1;
  saleError.textContent = '';
  populateSaleProducts();
  updateSalePreview();

  if (saleProduct.options.length === 1) {      // only the placeholder is there
    saleError.textContent = 'No products are in stock to sell.';
  }

  saleModal.classList.add('open');
}

function closeSaleModal() {
  saleModal.classList.remove('open');
}

saleForm.addEventListener('submit', event => {
  event.preventDefault();

  const productId = saleProduct.value;
  const quantity = parseInt(saleQty.value);
  const customer = document.getElementById('saleCustomer').value.trim();

  if (!productId) {
    saleError.textContent = 'Please select a product.';
    return;
  }

  const result = recordSale(productId, quantity, customer);

  if (!result.ok) {
    saleError.textContent = result.error;
    return;
  }

  // ----- Refresh everything the sale touched -----
  renderProducts();      // stock, badges, bell, dashboard card
  renderMovements();     // the new "Sale" entry
  renderSales();

  showToast(
    `Sale recorded: ${result.sale.quantity} × ${result.sale.productName} (${formatMoney(result.sale.total)})`,
    'success'
  );
  notifyStockChange(result.product, result.statusBefore, result.statusAfter);

  closeSaleModal();
});

document.getElementById('addSaleBtn').addEventListener('click', openSaleModal);
document.getElementById('saleCancelBtn').addEventListener('click', closeSaleModal);

saleModal.addEventListener('click', event => {
  if (event.target === saleModal) closeSaleModal();
});

// Live preview inside the modal
saleProduct.addEventListener('change', updateSalePreview);
saleQty.addEventListener('input', updateSalePreview);

// Filters
saleSearch.addEventListener('input', renderSales);
saleFrom.addEventListener('change', renderSales);
saleTo.addEventListener('change', renderSales);

document.getElementById('saleClearBtn').addEventListener('click', () => {
  saleSearch.value = '';
  saleFrom.value = '';
  saleTo.value = '';
  renderSales();
});