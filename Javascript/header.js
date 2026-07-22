/**
 * header.js
 * Injects the header HTML directly (no fetch) so it works on file:// locally.
 * Also attaches hamburger-menu event listeners after injection.
 */

(function () {
  const headerElement = document.getElementById('header');
  if (!headerElement) {
    console.warn('No #header element found — header injection skipped.');
    return;
  }

  // ── Inline header HTML ────────────────────────────────────────────────────
  // Using a template literal so the full markup is self-contained in this file.
  // Edit nav links here whenever you need to update the menu.
  headerElement.innerHTML = `
    <div class="container1">
      <header class="header-container">
        <div class="header-container1">

          <img src="images-temp/VM Logo - Copy.jpg" alt="VMGMC Logo" id="Logo">

          <div class="sizes">
            <h1>16Path</h1>
            <p class="no-wrap-text">A VMGMC Initiative</p>
          </div>

          <div class="container">
            <nav class="navbar">
              <div class="menu">
                <div class="head">
                  <button type="button" class="close-menu-btn" aria-label="Close menu">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <ul>
                  <li><a href="museum.html">Museum</a></li>
                  <li><a href="media.html">Media</a></li>
                  <li><a href="vmarchive.html">VM Archive</a></li>
                  <li><a href="spmarchive.html">SPM Archive</a></li>
                  <li><a href="index.html">About Us</a></li>
                </ul>
              </div>

              <div class="header-right">
                <button type="button" class="open-menu-btn" aria-label="Open menu">
                  <span class="line line-1"></span>
                  <span class="line line-2"></span>
                  <span class="line line-3"></span>
                </button>
              </div>
            </nav>
          </div>

        </div>
      </header>
    </div>
  `;
  // ─────────────────────────────────────────────────────────────────────────

  attachHeaderEventListeners();
})();

// ── Hamburger menu event listeners ─────────────────────────────────────────
function attachHeaderEventListeners() {
  const menu        = document.querySelector('.menu');
const openMenuBtn = document.querySelector('.header-right .open-menu-btn') || document.querySelector('.open-menu-btn');

  const closeMenuBtn = document.querySelector('.close-menu-btn');

  if (!menu || !openMenuBtn || !closeMenuBtn) {
    console.warn('Header elements not found — event listeners not attached.');
    return;
  }

  // Open
  openMenuBtn.addEventListener('click', () => {
    menu.classList.add('open');
  });

  // Close via × button
  closeMenuBtn.addEventListener('click', () => {
    menu.classList.remove('open');
  });

  // Close when any nav link is clicked (mobile)
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 840) {
        menu.classList.remove('open');
      }
    });
  });

  // Close when clicking outside the menu
  document.addEventListener('click', (e) => {
    if (
      window.innerWidth <= 840 &&
      !menu.contains(e.target) &&
      !openMenuBtn.contains(e.target)
    ) {
      menu.classList.remove('open');
    }
  });

  // Close on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 840) {
      menu.classList.remove('open');
    }
  });

  // Highlight the active nav link based on current page filename
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  menu.querySelectorAll('a').forEach(link => {
    const linkPage = link.getAttribute('href').split('/').pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });
}
