const bellBtn = document.getElementById('bellBtn');
const bellBadge = document.getElementById('bellBadge');
const bellDropdown = document.getElementById('bellDropdown');
const bellList = document.getElementById('bellList');
const lowStockList = document.getElementById('lowStockList');
const toastContainer = document.getElementById('toastContainer');

function getLowStockProducts() {
  return products
    .filter(p => getStockStatus(p).key !== 'in')
    .sort((a, b) => {
      const ratioA = a.stock / (a.reorderLevel || 1);
      const ratioB = b.stock / (b.reorderLevel || 1);
      return ratioA - ratioB;     // most urgent first
    });
}

function renderLowStockCard() {
  const list = getLowStockProducts().slice(0, 3);   // show the 3 most urgent

  if (list.length === 0) {
    lowStockList.innerHTML = '<p class="dropdown-empty">All products are well stocked.</p>';
    return;
  }

  lowStockList.innerHTML = list.map(p => {
    const status = getStockStatus(p);
    return `
      <div class="low-item">
        <div class="low-item-top">
          <span class="low-item-name">${escapeHTML(p.name)}</span>
          <span class="badge badge-${status.key}">${status.label}</span>
        </div>
        <div class="low-item-sku">SKU: ${escapeHTML(p.sku)}</div>
        <div class="low-item-meta">
          <span class="text-low">Stock: ${p.stock}</span>
          <span class="text-muted">Reorder: ${p.reorderLevel}</span>
        </div>
        <div class="progress">
          <div class="progress-fill fill-${status.key}" style="width: ${getStockPercent(p)}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function updateBell() {
  const list = getLowStockProducts();

  // The red counter
  bellBadge.textContent = list.length > 9 ? '9+' : list.length;
  bellBadge.hidden = list.length === 0;

  // The dropdown list
  if (list.length === 0) {
    bellList.innerHTML = '<p class="dropdown-empty">No alerts right now.</p>';
    return;
  }

  bellList.innerHTML = list.map(p => {
    const status = getStockStatus(p);
    return `
      <div class="dropdown-item" data-goto="products">
        <div>
          ${escapeHTML(p.name)}
          <small>${p.stock} left, reorder at ${p.reorderLevel}</small>
        </div>
        <span class="badge badge-${status.key}">${status.label}</span>
      </div>
    `;
  }).join('');
}

function updateAlerts() {
  updateBell();
  renderLowStockCard();
}

function showToast(message, type = 'warning') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;          // textContent is safe from HTML injection
  toastContainer.appendChild(toast);

  // After 4 seconds: fade out, then remove from the page
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

const statusSeverity = { in: 0, low: 1, out: 2 };

function notifyStockChange(product, statusBefore, statusAfter) {
  // Only warn when things got WORSE (e.g. In Stock → Low, or Low → Out)
  if (statusSeverity[statusAfter.key] <= statusSeverity[statusBefore.key]) return;

  const message = `${product.name} is now ${statusAfter.label.toLowerCase()} ` +
                  `(${product.stock} left, reorder at ${product.reorderLevel}).`;

  showToast(message, statusAfter.key === 'out' ? 'danger' : 'warning');
}

// Open or close the dropdown
bellBtn.addEventListener('click', () => {
  bellDropdown.classList.toggle('open');
});

// Close it when clicking anywhere else
document.addEventListener('click', event => {
  if (!event.target.closest('.bell-wrapper')) {
    bellDropdown.classList.remove('open');
  }
});

// Clicking an alert takes you to the Products page
bellList.addEventListener('click', event => {
  if (event.target.closest('[data-goto]')) {
    bellDropdown.classList.remove('open');
    showPage('products');            // defined in app.js
  }
});

// "View All" on the dashboard card
document.getElementById('viewAllLow').addEventListener('click', event => {
  event.preventDefault();
  showPage('products');
});