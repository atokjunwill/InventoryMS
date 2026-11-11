// ---------- Grab elements ----------
const movementTableBody = document.getElementById('movementTableBody');
const movementFilter = document.getElementById('movementFilter');
const stockModal = document.getElementById('stockModal');
const stockForm = document.getElementById('stockForm');
const stockError = document.getElementById('stockError');

// ---------- Render the movement history ----------
function renderMovements() {
  const type = movementFilter.value;
  const list = stockMovements.filter(m => type === 'all' || m.type === type);

  if (list.length === 0) {
    movementTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">No stock movements yet.</td></tr>';
    return;
  }

  movementTableBody.innerHTML = list.map(m => `
    <tr>
      <td>${formatDate(m.date)}</td>
      <td>${escapeHTML(m.productName)}</td>
      <td>
        <span class="badge ${m.type === 'in' ? 'badge-in' : 'badge-out'}">
          ${m.type === 'in' ? 'Stock In' : 'Stock Out'}
        </span>
      </td>
      <td>${m.type === 'in' ? '+' : '-'}${m.quantity}</td>
      <td>${m.before} → ${m.after}</td>
      <td>${escapeHTML(m.reason)}</td>
    </tr>
  `).join('');
}

// ---------- Summary cards ----------
function updateStockSummary() {
  const counts = { in: 0, low: 0, out: 0 };

  products.forEach(p => {
    counts[getStockStatus(p).key]++;
  });

  document.getElementById('countIn').textContent = counts.in;
  document.getElementById('countLow').textContent = counts.low;
  document.getElementById('countOut').textContent = counts.out;
}

// ---------- Open and close the stock modal ----------
function openStockModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  stockForm.reset();
  stockError.textContent = '';
  document.getElementById('stockProductId').value = product.id;
  document.getElementById('stockProductInfo').textContent =
    `${product.name} (${product.sku}), current stock: ${product.stock}`;

  stockModal.classList.add('open');
}

function closeStockModal() {
  stockModal.classList.remove('open');
}

// ---------- Submit the adjustment ----------
stockForm.addEventListener('submit', event => {
  event.preventDefault();

  const id = document.getElementById('stockProductId').value;
  const type = document.getElementById('stockType').value;
  const quantity = parseInt(document.getElementById('stockQty').value);
  const reason = document.getElementById('stockReason').value;

  const result = adjustStock(id, type, quantity, reason);

  if (!result.ok) {
    stockError.textContent = result.error;
    return;
  }

  renderProducts();
  renderMovements();
  notifyStockChange(result.product, result.statusBefore, result.statusAfter);
  closeStockModal();
});

// ---------- Wire up the rest ----------
document.getElementById('stockCancelBtn').addEventListener('click', closeStockModal);

stockModal.addEventListener('click', event => {
  if (event.target === stockModal) closeStockModal();
});

movementFilter.addEventListener('change', renderMovements);

// Run once on load
renderMovements();
updateStockSummary();