// 1. Grab the elements we need
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// 2. Mobile menu: open, close, toggle
function openMenu() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  document.body.classList.add('menu-open');
  menuBtn.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuBtn.setAttribute('aria-expanded', 'false');
}

menuBtn.addEventListener('click', () => {
  if (sidebar.classList.contains('open')) {
    closeMenu();
  } else {
    openMenu();
  }
});

sidebarOverlay.addEventListener('click', closeMenu);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

// If the window grows to desktop size, make sure the menu isn't left half-open
window.matchMedia('(min-width: 901px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

// ---------- Dark mode ----------
const themeBtn = document.getElementById('themeBtn');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.setAttribute('aria-pressed', theme === 'dark');
  themeBtn.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);     // remember the choice
});

// If the visitor never chose, follow their system setting live
systemDark.addEventListener('change', event => {
  if (!localStorage.getItem('theme')) {
    applyTheme(event.matches ? 'dark' : 'light');
  }
});

// Sync the button with the theme the <head> script already picked
applyTheme(document.documentElement.dataset.theme || 'light');

// 3. Show one page and hide the rest (and remember it)
function showPage(pageId) {
  pages.forEach(page => {
    page.classList.toggle('active', page.id === pageId);
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });

  localStorage.setItem('currentPage', pageId);
  closeMenu();                 // NEW: close the mobile menu after navigating
  window.scrollTo(0, 0);       // NEW: start the new page at the top
}

// 4. Listen for clicks on each menu link
navLinks.forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    showPage(link.dataset.page);
  });
});

// 5. Startup: render data first, then show the saved page
populateSupplierDropdowns();
updateCategories();
renderProducts();
renderSales();

const savedPage = localStorage.getItem('currentPage') || 'dashboard';
showPage(savedPage);