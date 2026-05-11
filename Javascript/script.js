/* ============================================= */
/*  GLOBAL STATE                                 */
/* ============================================= */
let scale = 1, translateX = 0, translateY = 0;
let isDragging = false, startX, startY;
let currentIndex = 0, currentGroup = '';
let groupedImages = {};

/* DOM refs */
let modal, zoomWrapper, popupImg, closeBtn, prevBtn, nextBtn;
let modalCaption = null;

/* Utility */
const $ = (s, r = document) => r.querySelector(s);

/* ============================================= */
/*  FLIPPABLE                                    */
/* ============================================= */
function flipImage(el) {
  el.classList.toggle('flipped');
}

/* ============================================= */
/*  INITIALISE                                   */
/* ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  // modal refs
  modal = $('.modal');
  modalCaption = $('.modal-caption', modal);
  zoomWrapper = $('.zoom-wrapper', modal);
  popupImg = $('img', zoomWrapper);
  closeBtn = $('.close', modal);
  prevBtn = $('.nav-arrow.prev', modal);
  nextBtn = $('.nav-arrow.next', modal);

  // BUILD groupedImages (one entry per data-group)
  document.querySelectorAll('.zoom-group').forEach(groupEl => {
    const groupName = groupEl.dataset.group;
    // RESET (important)
    groupedImages[groupName] = [];
    Array.from(groupEl.children).forEach(zoomDiv => {
      const img = zoomDiv.querySelector("img");
      if (img) {
        groupedImages[groupName].push({
          src: img.src,
          alt: img.alt || '',
          caption: img.dataset.caption || img.alt || ''
        });
      }
    });
  });

  // DEBUG: Log first 2 groups sample
  console.log('DEBUG groupedImages sample:', JSON.stringify(
    Object.fromEntries(Object.entries(groupedImages).slice(0, 2)),
    null, 2
  ));


  // SHOW ONLY FIRST thumbnail of each group
  // NOTE: Do NOT add another addEventListener here — the inline onclick on each
  // first-image in the HTML already calls openModalByIndex. Adding a second
  // listener here would cause openModalByIndex to fire TWICE per click, which
  // makes navigation appear to skip every other image.
  Object.entries(groupedImages).forEach(([group, imgs]) => {
    const containers = document.querySelectorAll(`.zoom-group[data-group="${group}"] .zoom`);
    containers.forEach((c, i) => {
      if (i === 0) {
        c.classList.add('visible');
        // NO extra click listener here — handled by inline onclick in HTML
      } else {
        c.classList.add('hidden');
      }
    });
  });

  // navigation arrow buttons
  // NOTE: The HTML arrows already have inline onclick="changeImage(±1)" so we
  // must NOT add addEventListener here as well — that would double-fire every
  // arrow click and skip images. Same for the close button (inline closePop()).
  // All three are handled exclusively via inline onclick in museum.html.

  // click outside / ESC  — handles both image AND video modals
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Video modal: close on backdrop click
  const videoModal = document.getElementById('videoModal');
  videoModal?.addEventListener('click', e => { if (e.target === videoModal) closeVideoModal(); });

  // ESC closes whichever modal is open
  // ArrowLeft / ArrowRight navigate images when the image modal is open
  window.addEventListener('keydown', e => {
    const imageModalOpen = modal && modal.style.display === 'flex';
    // Re-query videoModal by ID each time so we always get the current display state
    // (openVideoModal uses a local variable, so the outer `videoModal` ref may be stale)
    const vmEl = document.getElementById('videoModal');
    const videoModalOpen = vmEl && vmEl.style.display === 'flex';

    if (e.key === 'Escape') {
      if (videoModalOpen) {
        closeVideoModal();
      } else if (imageModalOpen) {
        closeModal();
      }
    } else if (imageModalOpen && !videoModalOpen) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); changeImage(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); changeImage(1);  }
    }
  });

  // Keyboard (Enter / Space) activation for video-box thumbnail cards
  document.querySelectorAll('.video-box').forEach(box => {
    box.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        box.click();
      }
    });
  });

  // zoom & pan
  if (zoomWrapper && popupImg) {
    zoomWrapper.style.cursor = 'grab';

    zoomWrapper.addEventListener('wheel', e => {
      e.preventDefault();
      // Scroll ONLY zooms — it does NOT navigate images.
      // Combining both in the same handler caused changeImage() to run on every
      // scroll tick, making navigation appear to skip images when scrolling.
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale = Math.min(Math.max(scale + delta, 1), 5);
      updateTransform();
    });

    zoomWrapper.addEventListener('mousedown', e => {
      if (scale <= 1) return;
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      zoomWrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      if (zoomWrapper) zoomWrapper.style.cursor = 'grab';
    });
  }

  updateArrows();
});

/* ============================================= */
/*  CORE FUNCTIONS                               */
/* ============================================= */

function updateCaption() {
  if (!modalCaption) return;
  const items = groupedImages[currentGroup];
  if (!items || !items[currentIndex]) {
    modalCaption.textContent = '';
    return;
  }
  modalCaption.textContent = items[currentIndex].caption || items[currentIndex].alt || 'Untitled';
}

function openModalByIndex(groupName, idx) {
  const items = groupedImages[groupName];
  if (!items?.length || !modal || !popupImg) return;

  console.log(`DEBUG openModal: group=${groupName}, idx=${idx}, total=${items?.length || 0}`);

  currentGroup = groupName;
  currentIndex = Math.max(0, Math.min(idx, items.length - 1));

  // Thumbnail strip
  buildThumbStrip();
  setActiveThumb();

  const targetSrc = items[currentIndex].src;
  const targetAlt = items[currentIndex].alt;
  popupImg.alt = targetAlt;
  popupImg.style.opacity = '0.5';
  // Clear old handlers before assigning src to avoid stale callbacks
  popupImg.onload = null;
  popupImg.onerror = null;
  setTimeout(() => {
    popupImg.onload = () => { console.log('DEBUG img load OK:', targetSrc); popupImg.style.opacity = '1'; };
    popupImg.onerror = () => console.log('DEBUG img LOAD ERROR:', targetSrc);
    if (popupImg.src === targetSrc) {
      // src unchanged — browser won't fire onload again; force it
      popupImg.style.opacity = '1';
    } else {
      popupImg.src = targetSrc;
    }
  }, 50);
  modal.style.display = 'flex';
  resetZoom();
  updateArrows();
  updateCaption();
}

/**
 * openModalAuto(img)
 * -------------------
 * Called via onclick="openModalAuto(this)" on any image inside a .zoom-group.
 * Dynamically determines the correct group name and the clicked image's index
 * within that group — no hardcoded numbers needed in the HTML.
 *
 * How it works:
 *   1. Walk up from the <img> to its parent .zoom-group.
 *   2. Read the group name from data-group.
 *   3. Find all <img> elements inside that group and locate the clicked one.
 *   4. Call openModalByIndex with the correct index.
 */
function openModalAuto(img) {
  const groupEl = img.closest('.zoom-group');
  if (!groupEl) return;

  const groupName = groupEl.dataset.group;
  const allImgs   = Array.from(groupEl.querySelectorAll('.zoom img'));
  const idx       = allImgs.indexOf(img);

  if (idx === -1) return; // safety guard
  openModalByIndex(groupName, idx);
}

function changeImage(dir) {
  const items = groupedImages[currentGroup];
  if (!items) return;
  const oldIndex = currentIndex;
  currentIndex = (currentIndex + dir + items.length) % items.length;

  // Update thumbnail highlight immediately.
  setActiveThumb();

  const targetSrc = items[currentIndex].src;
  const targetAlt = items[currentIndex].alt;
  console.log(`DEBUG changeImage: dir=${dir}, oldIdx=${oldIndex}, newIdx=${currentIndex}, total=${items.length}, src="${targetSrc}"`);
  popupImg.alt = targetAlt;
  popupImg.style.opacity = '0.5';
  // Clear old handlers before assigning src to avoid stale callbacks
  popupImg.onload = null;
  popupImg.onerror = null;
  setTimeout(() => {
    popupImg.onload = () => { console.log('DEBUG img load OK:', targetSrc); popupImg.style.opacity = '1'; };
    popupImg.onerror = () => console.log('DEBUG img LOAD ERROR:', targetSrc);
    if (popupImg.src === targetSrc) {
      // src unchanged — browser won't re-fire onload; show image directly
      popupImg.style.opacity = '1';
    } else {
      popupImg.src = targetSrc;
    }
  }, 50);
  resetZoom();
  updateArrows();
  updateCaption();
}

function closeModal() {
  if (!modal) return;
  modal.style.display = 'none';
  popupImg.src = '';
  currentGroup = '';
  resetZoom();
}

function resetZoom() {
  scale = 1; translateX = 0; translateY = 0; isDragging = false;
  if (zoomWrapper) zoomWrapper.style.cursor = 'grab';
  updateTransform();
}

function updateTransform() {
  if (!popupImg) return;
  popupImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function updateArrows() {
  const count = groupedImages[currentGroup]?.length || 0;
  const show = count > 1;
  if (prevBtn) prevBtn.style.display = show ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = show ? 'block' : 'none';
}

function getThumbStripInner() {
  if (!modal) return null;
  return document.getElementById('thumbStrip');
}

function buildThumbStrip() {
  const items = groupedImages[currentGroup];
  const stripInner = getThumbStripInner();
  if (!stripInner || !items?.length) return;

  // Clear and rebuild to reflect the active group.
  stripInner.innerHTML = '';

  items.forEach((it, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb-btn';
    btn.setAttribute('aria-label', `View image ${idx + 1} of ${items.length}`);

    const img = document.createElement('img');
    img.src = it.src;
    img.alt = it.alt || it.caption || `Image ${idx + 1}`;
    img.loading = 'lazy';

    btn.appendChild(img);

    btn.addEventListener('click', () => {
      if (!groupedImages[currentGroup]) return;
      currentIndex = idx;
      setActiveThumb();
      // Sync with main image instantly (same logic as changeImage but no dir wrap).
      const targetSrc = groupedImages[currentGroup][currentIndex].src;
      const targetAlt = groupedImages[currentGroup][currentIndex].alt;
      popupImg.alt = targetAlt;
      popupImg.style.opacity = '0.5';

      popupImg.onload = null;
      popupImg.onerror = null;
      setTimeout(() => {
        popupImg.onload = () => { popupImg.style.opacity = '1'; };
        popupImg.onerror = () => {};
        if (popupImg.src === targetSrc) {
          popupImg.style.opacity = '1';
        } else {
          popupImg.src = targetSrc;
        }
      }, 0);

      resetZoom();
      updateCaption();
      updateArrows();
    });

    stripInner.appendChild(btn);
  });
}

function setActiveThumb() {
  const stripInner = getThumbStripInner();
  if (!stripInner) return;

  const buttons = stripInner.querySelectorAll('.thumb-btn');
  buttons.forEach((b, i) => {
    if (i === currentIndex) b.classList.add('is-active');
    else b.classList.remove('is-active');
  });
}

// Scoped Tabs for each section
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.box-container[data-section]').forEach(sectionEl => {
    const tabs = sectionEl.querySelectorAll('.list-group-item');
    const tabPanes = sectionEl.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', function (e) {
        e.preventDefault();

        // Remove active class from tabs in this section only
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to the clicked tab
        this.classList.add('active');

        // Hide tab panes in this section only
        tabPanes.forEach(pane => pane.classList.remove('active'));
        // Show the corresponding tab pane
        const target = sectionEl.querySelector(this.getAttribute('href'));
        if (target) target.classList.add('active');
      });
    });
  });
});

// Single image popup (for backward compatibility)
function openPopup(img) {
  if (!img.dataset.caption) img.dataset.caption = img.alt || 'Image';
  openModalByIndex('single', 0); // Use dummy group, single image
  popupImg.src = img.src;
  modalCaption.textContent = img.dataset.caption;
  modal.style.display = 'flex';
}

/* ============================================= */
/*  VIDEO MODAL                                   */
/* ============================================= */

/**
 * Opens the video modal with a standard YouTube embed.
 * The video plays directly on the website inside the modal.
 *
 * Clicking the YouTube logo inside the player is built-in YouTube
 * behaviour — it naturally opens the watch page in a new tab.
 * No custom redirect logic is needed or wanted here.
 *
 * @param {string} videoId  - YouTube video ID  (e.g. 'Hfzfo8r0L5w')
 * @param {string} [title]  - Optional title shown below the player
 */
function openVideoModal(videoId, title) {
  const modal   = document.getElementById('videoModal');
  const iframe  = document.getElementById('popupVideo');
  const titleEl = document.getElementById('videoModalTitle');

  if (!modal || !iframe) return;

  // Use the plain YouTube embed URL — exactly what YouTube's own
  // "Share → Embed" code gives you. No autoplay so it works on
  // both local file:// and hosted servers without being blocked.
  iframe.src = `https://www.youtube.com/embed/${videoId}`;

  if (titleEl) titleEl.textContent = title || '';

  // Show the modal (triggers CSS fade-in animation)
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Closes the video modal and stops the video immediately.
 * Clearing iframe.src is the most reliable cross-browser way to
 * stop a YouTube embed without needing the IFrame API.
 */
function closeVideoModal() {
  const modal   = document.getElementById('videoModal');
  const iframe  = document.getElementById('popupVideo');
  const titleEl = document.getElementById('videoModalTitle');

  if (!modal) return;

  modal.style.display = 'none';

  // Clear src → stops video & audio immediately (no bleed-through)
  if (iframe) iframe.src = '';
  if (titleEl) titleEl.textContent = '';

  // Restore page scroll
  document.body.style.overflow = '';
}

// ── Legacy aliases ─────────────────────────────────────────────────────────
function openVideoPopup(iframeEl) {
  const src = (iframeEl && iframeEl.src) ? iframeEl.src : '';
  const m   = src.match(/embed\/([^?&]+)/);
  openVideoModal(m ? m[1] : src, '');
}
function closeVideoPopup() { closeVideoModal(); }
function closePop() { closeModal(); }

