// ---------- Storage helpers ----------
function loadData(key, fallback) {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Small helper to make unique ids
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---------- Sample suppliers ----------
const sampleSuppliers = [
  { id: 'sup1', name: 'Acme Supplies',   contact: 'Maria Santos', email: 'maria@acmesupplies.com', phone: '+63 917 123 4567', address: 'Makati City, Philippines' },
  { id: 'sup2', name: 'TechParts Co.',   contact: 'John Reyes',   email: 'john@techparts.com',     phone: '+63 918 765 4321', address: 'Cebu City, Philippines' },
  { id: 'sup3', name: 'CableWorld Inc.', contact: 'Ana Cruz',     email: 'ana@cableworld.com',     phone: '+63 920 555 0199', address: 'Quezon City, Philippines' }
];

// ---------- Sample products (only used the first time) ----------
const sampleProducts = [
  { id: generateId(), name: 'Laptop Stand Pro',    sku: 'LSP-001', category: 'Accessories', price: 49.99, stock: 5,  reorderLevel: 20, supplierId: 'sup1' },
  { id: generateId(), name: 'Wireless Mouse X',    sku: 'WMX-045', category: 'Electronics', price: 24.5,  stock: 8,  reorderLevel: 25, supplierId: 'sup2' },
  { id: generateId(), name: 'USB-C Cable 2m',      sku: 'USC-200', category: 'Accessories', price: 9.99,  stock: 12, reorderLevel: 50, supplierId: 'sup3' },
  { id: generateId(), name: 'Mechanical Keyboard', sku: 'MKB-310', category: 'Electronics', price: 89,    stock: 60, reorderLevel: 15, supplierId: 'sup2' }
];

let suppliers = loadData('suppliers', sampleSuppliers);

// ---------- Global app data ----------
let products = loadData('products', sampleProducts);

// ---------- Stock movements ----------
let stockMovements = loadData('stockMovements', []);
let sales = loadData('sales', []);

// Decide a product's status by comparing stock and reorder level
function getStockStatus(product) {
  if (product.stock <= 0) return { key: 'out', label: 'Out of Stock' };
  if (product.stock <= product.reorderLevel) return { key: 'low', label: 'Low Stock' };
  return { key: 'in', label: 'In Stock' };
  
}

// How full the progress bar should be (0 to 100)
function getStockPercent(product) {
  if (product.reorderLevel <= 0) return 100;
  return Math.min((product.stock / product.reorderLevel) * 100, 100);
}

// Record one movement in the history (newest first)
function logMovement(product, type, quantity, before, after, reason) {
  stockMovements.unshift({
    id: generateId(),
    productId: product.id,
    productName: product.name,   // saved so history survives if the product is deleted
    type,                        // 'in' or 'out'
    quantity,
    before,
    after,
    reason,
    date: new Date().toISOString()
  });
  saveData('stockMovements', stockMovements);
}

// The ONE function that changes stock. Returns { ok, error }.
function adjustStock(productId, type, quantity, reason) {
  const product = products.find(p => p.id === productId);
  if (!product) return { ok: false, error: 'Product not found.' };

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: 'Quantity must be a whole number greater than 0.' };
  }

  const before = product.stock;
  const after = type === 'in' ? before + quantity : before - quantity;

  if (after < 0) {
    return { ok: false, error: `Not enough stock. Only ${before} available.` };
  }

  const statusBefore = getStockStatus(product);   // NEW: capture before changing
  product.stock = after;
  const statusAfter = getStockStatus(product);    // NEW: capture after changing

  saveData('products', products);
  logMovement(product, type, quantity, before, after, reason);

  return { ok: true, product, statusBefore, statusAfter };   // NEW: return both
}

// Turn a saved date into something readable
function formatDate(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

// Find a supplier's name from an id
function getSupplierName(supplierId) {
  const supplier = suppliers.find(s => s.id === supplierId);
  return supplier ? supplier.name : '—';
}

// Format a number as money: 1234.5 → $1,234.50
function formatMoney(amount) {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Turn a saved date into 'YYYY-MM-DD' in the user's local time
function toDateKey(isoString) {
  const d = new Date(isoString);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// Record a sale and reduce stock. Returns { ok, error, sale, product, statusBefore, statusAfter }
function recordSale(productId, quantity, customer) {
  const product = products.find(p => p.id === productId);
  if (!product) return { ok: false, error: 'Please select a product.' };

  // adjustStock checks the rules AND changes the stock
  const result = adjustStock(productId, 'out', quantity, 'Sale');
  if (!result.ok) return result;

  const sale = {
    id: generateId(),
    productId: product.id,
    productName: product.name,     // snapshot
    sku: product.sku,              // snapshot
    quantity,
    unitPrice: product.price,      // snapshot
    total: Math.round(product.price * quantity * 100) / 100,
    customer: customer || 'Walk-in customer',
    date: new Date().toISOString()
  };

  sales.unshift(sale);             // newest first
  saveData('sales', sales);

  return {
    ok: true,
    sale,
    product,
    statusBefore: result.statusBefore,
    statusAfter: result.statusAfter
  };
}