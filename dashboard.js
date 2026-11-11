// Add up the 'total' of a list of sales
function sumSales(list) {
  return list.reduce((sum, s) => sum + s.total, 0);
}

// Get the sales that happened in one month. monthKey looks like '2026-11'
function salesInMonth(monthKey) {
  return sales.filter(s => toDateKey(s.date).slice(0, 7) === monthKey);
}

// Turn a date into text like '2 hours ago'
function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);

  if (seconds < 60) return 'Just now';

  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];

  for (const [name, size] of units) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      if (name === 'day' && count >= 30) {
        return new Date(isoString).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
      }
      return `${count} ${name}${count === 1 ? '' : 's'} ago`;
    }
  }
}

// Compare this month with last month and fill in a badge
function setTrend(elementId, current, previous) {
  const badge = document.getElementById(elementId);

  // Nothing to compare against
  if (previous === 0) {
    badge.textContent = current > 0 ? 'New' : '—';
    badge.className = 'trend ' + (current > 0 ? 'trend-up' : 'trend-flat');
    return;
  }

  const change = Math.round(((current - previous) / previous) * 100);
  const arrow = change > 0 ? '↑ ' : change < 0 ? '↓ ' : '';
  const sign = change > 0 ? '+' : '';

  badge.textContent = `${arrow}${sign}${change}%`;
  badge.className = 'trend ' +
    (change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'trend-flat');
}

function renderDashboardStats() {
  // Work out this month's and last month's keys, like '2026-11' and '2026-10'
  const now = new Date();
  const thisMonth = toDateKey(now.toISOString()).slice(0, 7);
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = toDateKey(lastDate.toISOString()).slice(0, 7);

  const salesNow = salesInMonth(thisMonth);
  const salesBefore = salesInMonth(lastMonth);

  const revenueNow = sumSales(salesNow);
  const revenueBefore = sumSales(salesBefore);

  // Total products
  document.getElementById('dashProducts').textContent = products.length;
  const badge = document.getElementById('dashProductsBadge');
  badge.textContent = `${suppliers.length} ${suppliers.length === 1 ? 'supplier' : 'suppliers'}`;

  // Monthly revenue and sales count
  document.getElementById('dashRevenue').textContent = formatMoney(revenueNow);
  setTrend('dashRevenueTrend', revenueNow, revenueBefore);

  document.getElementById('dashSales').textContent = salesNow.length;
  setTrend('dashSalesTrend', salesNow.length, salesBefore.length);

  // Low stock items
  const low = getLowStockProducts();
  const outCount = low.filter(p => getStockStatus(p).key === 'out').length;

  document.getElementById('dashLow').textContent = low.length;

  const lowBadge = document.getElementById('dashLowBadge');
  if (low.length === 0) {
    lowBadge.textContent = 'All good';
    lowBadge.className = 'trend trend-up';
  } else {
    lowBadge.textContent = outCount > 0 ? `${outCount} out of stock` : 'Needs reorder';
    lowBadge.className = 'trend trend-down';
  }
}

function getRecentActivity(limit = 6) {
  // Sales become activity items
  const saleItems = sales.map(s => ({
    date: s.date,
    label: 'Sale',
    name: s.productName,
    sub: s.customer,
    amount: formatMoney(s.total),
    badge: 'Sold',
    badgeClass: 'badge-in',
    goto: 'sales'
  }));

  // Stock movements become activity items.
  // Skip the ones caused by a sale, because the sale is already in the list.
  const stockItems = stockMovements
    .filter(m => m.reason !== 'Sale')
    .map(m => ({
      date: m.date,
      label: 'Stock',
      name: m.productName,
      sub: m.reason,
      amount: `${m.quantity} ${m.quantity === 1 ? 'unit' : 'units'}`,
      badge: m.type === 'in' ? 'Added' : 'Removed',
      badgeClass: m.type === 'in' ? 'badge-in' : 'badge-out',
      goto: 'movements'
    }));

  // Merge, newest first, keep only the first few
  return [...saleItems, ...stockItems]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

function renderActivity() {
  const container = document.getElementById('activityList');
  const items = getRecentActivity();

  if (items.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No activity yet. Record a sale or adjust stock to see it here.</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="activity-item" data-goto="${item.goto}">
      <div class="activity-main">
        <div class="activity-title">${item.label} <strong>${escapeHTML(item.name)}</strong></div>
        <div class="activity-sub">${escapeHTML(item.sub)}</div>
      </div>
      <div class="activity-right">
        <div class="activity-amount">${item.amount}</div>
        <div class="activity-meta">
          <span class="badge ${item.badgeClass}">${item.badge}</span>
          <span>${timeAgo(item.date)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderDashboard() {
  renderDashboardStats();
  renderActivity();
}

// Clicking an activity row opens the matching page
document.getElementById('activityList').addEventListener('click', event => {
  const row = event.target.closest('[data-goto]');
  if (row) showPage(row.dataset.goto);     // showPage is defined in app.js
});