const salesPeriod = document.getElementById('salesPeriod');

function renderReportSummary() {
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const stockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  document.getElementById('reportProducts').textContent = products.length;
  document.getElementById('reportUnits').textContent = totalUnits.toLocaleString('en-US');
  document.getElementById('reportValue').textContent = formatMoney(stockValue);
  document.getElementById('reportAttention').textContent = getLowStockProducts().length;
}

function renderCategoryReport() {
  const container = document.getElementById('categoryReport');

  if (products.length === 0) {
    container.innerHTML = '<p class="empty-state">No products yet.</p>';
    return;
  }

  // 1. Group: build { Electronics: { value, units }, Accessories: { ... } }
  const totals = {};
  products.forEach(p => {
    if (!totals[p.category]) totals[p.category] = { value: 0, units: 0 };
    totals[p.category].value += p.price * p.stock;
    totals[p.category].units += p.stock;
  });

  // 2. Turn it into a list, biggest first
  const rows = Object.entries(totals).sort((a, b) => b[1].value - a[1].value);
  const max = rows[0][1].value || 1;

  // 3. Draw one bar per category
  container.innerHTML = rows.map(([category, data]) => `
    <div class="hbar-row">
      <div class="hbar-top">
        <span>${escapeHTML(category)} <span class="text-muted">(${data.units} units)</span></span>
        <strong>${formatMoney(data.value)}</strong>
      </div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width: ${(data.value / max) * 100}%"></div>
      </div>
    </div>
  `).join('');
}

function formatDayKey(key) {
  // key looks like '2026-11-05'
  return new Date(key + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

function formatMonthKey(key) {
  // key looks like '2026-11'
  return new Date(key + '-01T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit'
  });
}

function renderSalesTrend() {
  const container = document.getElementById('salesTrend');
  const byMonth = salesPeriod.value === 'month';

  if (sales.length === 0) {
    container.innerHTML = '<p class="empty-state">No sales recorded yet.</p>';
    return;
  }

  // 1. Group sales totals by day ('2026-11-05') or month ('2026-11')
  const totals = {};
  sales.forEach(s => {
    const day = toDateKey(s.date);
    const key = byMonth ? day.slice(0, 7) : day;
    totals[key] = (totals[key] || 0) + s.total;
  });

  // 2. Oldest to newest, keeping only the most recent few
  const limit = byMonth ? 6 : 7;
  const keys = Object.keys(totals).sort().slice(-limit);
  const max = Math.max(...keys.map(k => totals[k]));

  // 3. Draw one column per period
  const columns = keys.map(key => {
    const label = byMonth ? formatMonthKey(key) : formatDayKey(key);
    const height = max > 0 ? (totals[key] / max) * 100 : 0;

    return `
      <div class="chart-col">
        <span class="chart-value">${formatMoney(totals[key])}</span>
        <div class="chart-track">
          <div class="chart-bar" style="height: ${height}%"></div>
        </div>
        <span class="chart-label">${label}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="chart">${columns}</div>
    <p class="chart-note">Showing the last ${keys.length} ${byMonth ? 'month(s)' : 'day(s)'} with sales.</p>
  `;
}

function renderTopSellers() {
  const body = document.getElementById('topSellersBody');

  if (sales.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="empty-state">No sales recorded yet.</td></tr>';
    return;
  }

  // 1. Group by product (using the snapshot name saved in each sale)
  const totals = {};
  sales.forEach(s => {
    if (!totals[s.productId]) {
      totals[s.productId] = { name: s.productName, units: 0, revenue: 0 };
    }
    totals[s.productId].units += s.quantity;
    totals[s.productId].revenue += s.total;
  });

  // 2. Rank by units sold and keep the top 5
  const top = Object.values(totals)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);
  const maxUnits = top[0].units;

  // 3. Draw the rows
  body.innerHTML = top.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHTML(item.name)}</strong></td>
      <td>${item.units}</td>
      <td>${formatMoney(item.revenue)}</td>
      <td class="bar-cell">
        <div class="hbar-track">
          <div class="hbar-fill" style="width: ${(item.units / maxUnits) * 100}%"></div>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderReports() {
  document.getElementById('reportPrintDate').textContent =
    'Generated ' + formatDate(new Date().toISOString());

  renderReportSummary();
  renderCategoryReport();
  renderSalesTrend();
  renderTopSellers();
}

// Turn a list of rows into CSV text
function toCSV(rows) {
  return rows.map(row =>
    row.map(cell => {
      let text = String(cell ?? '');

      // Safety: stop spreadsheets from running text that starts like a formula
      if (typeof cell === 'string' && /^[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      // Wrap in quotes if the text has a comma, quote or line break
      if (/[",\n]/.test(text)) {
        text = '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    }).join(',')
  ).join('\n');
}

// Create a file in memory and make the browser download it
function downloadCSV(filename, rows) {
  const blob = new Blob(['\uFEFF' + toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportInventoryCSV() {
  const rows = [['Name', 'SKU', 'Category', 'Supplier', 'Price', 'Stock', 'Reorder level', 'Status', 'Stock value']];

  products.forEach(p => {
    rows.push([
      p.name,
      p.sku,
      p.category,
      getSupplierName(p.supplierId),
      p.price.toFixed(2),
      p.stock,
      p.reorderLevel,
      getStockStatus(p).label,
      (p.price * p.stock).toFixed(2)
    ]);
  });

  downloadCSV(`inventory-${toDateKey(new Date().toISOString())}.csv`, rows);
  showToast('Inventory CSV downloaded.', 'success');
}

function exportSalesCSV() {
  if (sales.length === 0) {
    showToast('No sales to export yet.', 'warning');
    return;
  }

  const rows = [['Date', 'Product', 'SKU', 'Customer', 'Quantity', 'Unit price', 'Total']];

  sales.forEach(s => {
    rows.push([
      toDateKey(s.date),
      s.productName,
      s.sku,
      s.customer,
      s.quantity,
      s.unitPrice.toFixed(2),
      s.total.toFixed(2)
    ]);
  });

  downloadCSV(`sales-${toDateKey(new Date().toISOString())}.csv`, rows);
  showToast('Sales CSV downloaded.', 'success');
}