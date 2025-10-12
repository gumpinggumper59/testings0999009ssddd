// =========================
// Socials: DRY approach
// =========================
const SOCIALS = [
  { href: "https://www.instagram.com/shxttyartist", label: "Instagram", icon: "sm-icons/insta.webp" },
  { href: "https://ko-fi.com/shxttyartist", label: "Ko-fi", icon: "sm-icons/ko-fi.webp" },
  { href: "https://youtube.com/@potion_seller?si=RHM_OL6OyCRvuVps", label: "YouTube", icon: "sm-icons/youtube.webp" }
];
function renderSocials(container) {
  container.innerHTML = SOCIALS.map(s =>
    `<a href="${s.href}" aria-label="${s.label}" target="_blank" rel="noopener">
      <img src="${s.icon}" alt="${s.label}" class="social-icon">
    </a>`).join("");
}
renderSocials(document.getElementById('socials-desktop'));
renderSocials(document.getElementById('socials-mobile'));

// =========================
// Tabs Navigation
// =========================
const tabs = [...document.querySelectorAll('.tab')];
const sections = [...document.querySelectorAll('[data-section]')];
function showSection(id) {
  sections.forEach(s => s.hidden = s.id !== id);
  tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.target === id));
}
tabs.forEach(t => t.addEventListener('click', () => showSection(t.dataset.target)));
showSection('home');

// =========================
// Comic Reader
// =========================
const TOTAL_PAGES = 5;
const pages = Array.from({length: TOTAL_PAGES}, (_, i) => ({
  webp: `side-quest-balan/first-part/webp-versions/lost-sword-comic-page-${i+1}.webp`,
  png: `side-quest-balan/first-part/png-versions/lost-sword-comic-page-${i+1}.png`
}));
let currentPageIndex = 1;
const pageIndicator = document.getElementById('page-indicator');
const readerStage = document.getElementById('reader-stage');
function updateReader() {
  const page = pages[currentPageIndex - 1];
  readerStage.innerHTML = `
    <picture>
      <source srcset="${page.webp}" type="image/webp">
      <img class="page" src="${page.png}" alt="comic page ${currentPageIndex}" loading="lazy" decoding="async">
    </picture>
  `;
  pageIndicator.textContent = `Page ${currentPageIndex} / ${TOTAL_PAGES}`;
}
document.getElementById('prev-page').onclick = () => {
  if (currentPageIndex > 1) currentPageIndex--;
  updateReader();
};
document.getElementById('next-page').onclick = () => {
  if (currentPageIndex < TOTAL_PAGES) currentPageIndex++;
  updateReader();
};
["open-comic", "open-comic-btn"].forEach(id => {
  document.getElementById(id).onclick = e => {
    if (e && e.preventDefault) e.preventDefault();
    currentPageIndex = 1;
    showSection('reader');
    updateReader();
  };
});

// =========================
// Highlights of the Week (carousel)
// - GIF support added.
// - Shorter interval (about ~1.5s faster).
// - Robust scheduler using single timeout so pause/resume preserves remaining delay and yields consistent timing.
// - First click expands the panel; second click follows the href.
// =========================
const HIGHLIGHTS = [
  { href: "https://www.instagram.com/p/DPWtoprD9QQ/?img_index=1", webp: "sprites/highlights-rotation/webp-versions/beth-n-gus.webp", png: "sprites/highlights-rotation/png-versions/beth-n-gus.png", alt: "Beth fails" },
  { href: "https://www.instagram.com/kazeneeeee", webp: "sprites/highlights-rotation/webp-versions/kazene-cat-maid.webp", png: "sprites/highlights-rotation/png-versions/kazene-cat-maid.png", alt: "Kazene cat maid" },
  { href: "https://www.instagram.com/p/DPiT9qmAAfx/?img_index=1", gif: "sprites/highlights-rotation/gif-versions/protarn-by-cry.gif", png: "sprites/highlights-rotation/png-versions/protarn-placeholder.png", alt: "Protarn animation" }
];

// Interval: shorter than before (previously 5000ms). Picked ~3500ms (1.5s faster).
const HIGHLIGHT_INTERVAL_MS = 3500;

let highlightIndex = 0;
const highlightsStage = document.getElementById('highlights-stage');
const highlightsPanel = document.getElementById('highlights-panel');

// Scheduler state (single timeout approach)
let highlightTimeoutId = null;
let scheduledAt = null;
let scheduledDelay = HIGHLIGHT_INTERVAL_MS;
let remainingDelay = null;

function preloadHighlightImages(items) {
  items.forEach(it => {
    if (it.webp) { const i = new Image(); i.src = it.webp; }
    if (it.png)  { const i = new Image(); i.src = it.png; }
    if (it.gif)  { const i = new Image(); i.src = it.gif; } // preload gif too
  });
}

// Build DOM for highlights - support webp/png/gif
function renderHighlights(items) {
  if (!highlightsStage) return;
  highlightsStage.innerHTML = items.map((it, idx) => {
    const linkStart = it.href ? `<a class="highlight-link" href="${it.href}" target="_blank" rel="noopener" aria-label="${it.alt || 'Highlight'}">` : '';
    const linkEnd = it.href ? `</a>` : '';

    // Use <picture> if webp is provided, and fall back to gif (animated) or png.
    const fallback = it.gif ? it.gif : (it.png || '');
    const picture = `
      <picture>
        ${it.webp ? `<source srcset="${it.webp}" type="image/webp">` : ''}
        <img src="${fallback}" alt="${it.alt || ''}" loading="lazy" decoding="async">
      </picture>
    `;

    return `
      <div class="highlight-slide" data-idx="${idx}" role="group" aria-roledescription="slide" aria-label="${it.alt || ('Highlight ' + (idx+1))}">
        ${linkStart}
          ${picture}
        ${linkEnd}
      </div>
    `;
  }).join('');
  // Activate first slide
  const first = highlightsStage.querySelector('.highlight-slide[data-idx="0"]');
  if (first) first.classList.add('active');
}

// Advance to next slide (used by scheduler)
function advanceSlide() {
  const slides = highlightsStage.querySelectorAll('.highlight-slide');
  if (!slides || slides.length === 0) return;
  const current = highlightsStage.querySelector('.highlight-slide.active');
  if (current) current.classList.remove('active');
  highlightIndex = (highlightIndex + 1) % slides.length;
  const next = highlightsStage.querySelector(`.highlight-slide[data-idx="${highlightIndex}"]`);
  if (next) next.classList.add('active');
}

// Schedule the next transition using a single timeout.
// If delay is provided, use it; otherwise use HIGHLIGHT_INTERVAL_MS.
function scheduleNextTransition(delay) {
  clearScheduledTransition();
  const d = typeof delay === 'number' ? delay : HIGHLIGHT_INTERVAL_MS;
  scheduledDelay = d;
  scheduledAt = Date.now();
  highlightTimeoutId = setTimeout(() => {
    highlightTimeoutId = null;
    scheduledAt = null;
    scheduledDelay = HIGHLIGHT_INTERVAL_MS;
    remainingDelay = null;
    advanceSlide();
    // schedule the following transition
    scheduleNextTransition(HIGHLIGHT_INTERVAL_MS);
  }, d);
}

function clearScheduledTransition() {
  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
  }
  scheduledAt = null;
}

// Pause cycle but remember remaining time so resume keeps consistent timing
function pauseHighlightsCycle() {
  if (!highlightTimeoutId || !scheduledAt) return;
  const elapsed = Date.now() - scheduledAt;
  remainingDelay = Math.max(0, scheduledDelay - elapsed);
  clearScheduledTransition();
}

// Resume cycle; if remainingDelay exists, use it so timing stays consistent
function resumeHighlightsCycle() {
  // if already scheduled, do nothing
  if (highlightTimeoutId) return;
  const delay = (typeof remainingDelay === 'number' && remainingDelay > 0) ? remainingDelay : HIGHLIGHT_INTERVAL_MS;
  remainingDelay = null;
  scheduleNextTransition(delay);
}

// Stop cycle completely (used when we want no scheduled transitions)
function stopHighlightsCycle() {
  remainingDelay = null;
  clearScheduledTransition();
}

// Pause on hover for desktop - nicer UX (use pause/resume helpers)
highlightsStage.addEventListener && highlightsStage.addEventListener('mouseenter', () => {
  pauseHighlightsCycle();
});
highlightsStage.addEventListener && highlightsStage.addEventListener('mouseleave', () => {
  resumeHighlightsCycle();
});

// Initialize highlights
preloadHighlightImages(HIGHLIGHTS);
renderHighlights(HIGHLIGHTS);
// Start the scheduler (first transition after HIGHLIGHT_INTERVAL_MS)
scheduleNextTransition(HIGHLIGHT_INTERVAL_MS);

// =========================
// Highlights: "expand on first click, follow href on second click" behavior
// =========================
let highlightsExpanded = false;
let expandedIdx = null;

// Click handling on highlights.
// If the clicked element is a highlight link, the first click expands the panel (preventing navigation).
// If the same highlight is clicked again while expanded, allow navigation to proceed to the href (native behavior).
highlightsStage.addEventListener('click', (e) => {
  const slide = e.target.closest('.highlight-slide');
  const link = e.target.closest('.highlight-link');
  if (!slide) return; // not a click on a slide area
  const idx = Number(slide.dataset.idx);

  if (link) {
    if (!highlightsExpanded || expandedIdx !== idx) {
      // First click (or clicked another slide): expand preview and prevent navigation
      e.preventDefault();
      highlightsExpanded = true;
      expandedIdx = idx;
      highlightsPanel.classList.add('expanded');
      highlightsPanel.setAttribute('aria-expanded', 'true');
      // Ensure clicked slide is active/visible
      const current = highlightsStage.querySelector('.highlight-slide.active');
      if (current) current.classList.remove('active');
      slide.classList.add('active');
      highlightIndex = idx;
      // Pause cycling while expanded (preserving remaining delay)
      pauseHighlightsCycle();
      // Focus the link so keyboard users know state changed
      link.focus();
    } else {
      // Second click on the same expanded slide -> allow native navigation (link will open)
      // No special handling needed here.
    }
  } else {
    // If the slide isn't a link (no href), we can still expand it on first click
    if (!highlightsExpanded || expandedIdx !== idx) {
      e.preventDefault && e.preventDefault();
      highlightsExpanded = true;
      expandedIdx = idx;
      highlightsPanel.classList.add('expanded');
      highlightsPanel.setAttribute('aria-expanded', 'true');
      const current = highlightsStage.querySelector('.highlight-slide.active');
      if (current) current.classList.remove('active');
      slide.classList.add('active');
      highlightIndex = idx;
      pauseHighlightsCycle();
    }
  }
});

// Collapse when clicking outside the highlights panel
document.addEventListener('click', (e) => {
  if (!highlightsExpanded) return;
  const isInside = e.target.closest && e.target.closest('#highlights-panel');
  if (!isInside) {
    // Collapse panel
    highlightsExpanded = false;
    expandedIdx = null;
    highlightsPanel.classList.remove('expanded');
    highlightsPanel.setAttribute('aria-expanded', 'false');
    // restore active to current highlightIndex (or 0 if none)
    const slides = highlightsStage.querySelectorAll('.highlight-slide');
    slides.forEach(s => s.classList.remove('active'));
    const restoreIdx = Math.min(Math.max(0, highlightIndex || 0), (slides.length - 1));
    const toShow = highlightsStage.querySelector(`.highlight-slide[data-idx="${restoreIdx}"]`);
    if (toShow) toShow.classList.add('active');
    // resume cycling (will honor remainingDelay saved earlier so timing is consistent)
    resumeHighlightsCycle();
  }
});

// =========================
// Clicker / Happy Coins
// =========================

// ---- Preload all clicker images ----
const balanSprites = {
  default: {
    webp: "sprites/balan-balan-clicker/webp-versions/balan-sprite.webp",
    png: "sprites/balan-balan-clicker/png-versions/balan-sprite.png",
    alt: "balan sprite"
  },
  click: {
    webp: "sprites/balan-balan-clicker/webp-versions/balan-sprite-click.webp",
    png: "sprites/balan-balan-clicker/png-versions/balan-sprite-click.png",
    alt: "balan click"
  },
  milestones: [
    { count: 100, webp: "sprites/balan-balan-clicker/webp-versions/balan-sprite-100.webp", png: "sprites/balan-balan-clicker/png-versions/balan-sprite-100.png", alt: "balan 100" },
    { count: 500, webp: "sprites/balan-balan-clicker/webp-versions/balan-sprite-500.webp", png: "sprites/balan-balan-clicker/png-versions/balan-sprite-500.png", alt: "balan 500" },
    { count: 1000, webp: "sprites/balan-balan-clicker/webp-versions/balan-sprite-1000.webp", png: "sprites/balan-balan-clicker/png-versions/balan-sprite-1000.png", alt: "balan 1000" },
    { count: 3500, webp: "sprites/balan-balan-clicker/webp-versions/balan-sprite-3500.webp", png: "sprites/balan-balan-clicker/png-versions/balan-sprite-3500.png", alt: "balan 3500" },
    { count: 7000, webp: "sprites/balan-balan-clicker/webp-versions/balan-sprite-7000.webp", png: "sprites/balan-balan-clicker/png-versions/balan-sprite-7000.png", alt: "balan 7000" }
  ]
};
// Preload images
function preloadImages(spriteSet) {
  function preloadSingle(src) {
    const img = new window.Image();
    img.src = src;
  }
  preloadSingle(spriteSet.default.webp);
  preloadSingle(spriteSet.default.png);
  preloadSingle(spriteSet.click.webp);
  preloadSingle(spriteSet.click.png);
  spriteSet.milestones.forEach(m => {
    preloadSingle(m.webp);
    preloadSingle(m.png);
  });
}
preloadImages(balanSprites);

// ---- Preload all clicker audio ----
const clickerVoices = {
  random: [
    'voice-acting/balan-balan/brh-numbers/clkr-ah-one.mp3','voice-acting/balan-balan/brh-numbers/clkr-ah-two.mp3','voice-acting/balan-balan/brh-numbers/clkr-ah-three.mp3',
    'voice-acting/balan-balan/brh-numbers/clkr-eh-one.mp3','voice-acting/balan-balan/brh-numbers/clkr-eh-two.mp3','voice-acting/balan-balan/brh-numbers/clkr-eh-three.mp3',
    'voice-acting/balan-balan/brh-numbers/clkr-oh-one.mp3','voice-acting/balan-balan/brh-numbers/clkr-oh-two.mp3','voice-acting/balan-balan/brh-numbers/clkr-oh-three.mp3'
  ],
  fifty: [
    'voice-acting/balan-balan/brh-numbers/clkr-mmn-one.mp3','voice-acting/balan-balan/brh-numbers/clkr-mmn-two.mp3','voice-acting/balan-balan/brh-numbers/clkr-mmn-three.mp3'
  ],
  milestone: [
    'voice-acting/balan-balan/brh-numbers/clkr-balan-one.mp3','voice-acting/balan-balan/brh-numbers/clkr-balan-two.mp3','voice-acting/balan-balan/brh-numbers/clkr-balan-three.mp3'
  ]
};
const audioPool = {};
function preloadAudio(arr, key) {
  audioPool[key] = arr.map(src => {
    const a = new window.Audio(src);
    a.preload = 'auto';
    a.src = src;
    return a;
  });
}
preloadAudio(clickerVoices.random, 'random');
preloadAudio(clickerVoices.fifty, 'fifty');
preloadAudio(clickerVoices.milestone, 'milestone');
// Provide shuffled access
function getShuffled(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function createVoiceShuffler(key) {
  let shuffled = getShuffled(audioPool[key]), idx = 0;
  return () => {
    if (idx >= shuffled.length) { shuffled = getShuffled(audioPool[key]); idx = 0; }
    return shuffled[idx++];
  };
}
const nextRandomVoice = createVoiceShuffler('random');
const nextFiftyVoice = createVoiceShuffler('fifty');
const nextMilestoneVoice = createVoiceShuffler('milestone');

// ---- Clicker state ----
const balanPicture = document.querySelector('.balan-container picture');
const balanWebp = balanPicture.querySelector('source');
const balanImg = balanPicture.querySelector('img');
const clickCountEl = document.getElementById('click-count');
const happyCoinsEl = document.getElementById('happy-coins');
const resetBtn = document.getElementById('reset-clicks');
let clicks = Number(localStorage.getItem('balanClicks')) || 0;
let happyCoins = Number(localStorage.getItem('balanHappyCoins')) || 0;
clickCountEl.textContent = clicks;
happyCoinsEl.textContent = happyCoins;
function updateHappyCoins() {
  happyCoinsEl.textContent = happyCoins;
  localStorage.setItem('balanHappyCoins', happyCoins);
}

// ---- SECRET BUTTON for 10000 clicks ----
const secretBtn = document.getElementById('secret-btn');
function updateSecretButtonVisibility() {
  if (!secretBtn) return;
  if (clicks >= 10000) {
    secretBtn.hidden = false;
    secretBtn.setAttribute('aria-hidden', 'false');
  } else {
    secretBtn.hidden = true;
    secretBtn.setAttribute('aria-hidden', 'true');
  }
}
if (secretBtn) {
  secretBtn.addEventListener('click', (e) => {
    // Open the secret video in a new tab
    e.preventDefault && e.preventDefault();
    // Use a direct video URL relative to the site
    window.open('secret-ending/you-found-me.webm', '_blank', 'noopener');
  });
}

// ---- Sprite logic ----
function setBalanSprite(sprite) {
  balanWebp.srcset = sprite.webp;
  balanImg.src = sprite.png;
  balanImg.alt = sprite.alt;
}
function getMilestoneSprite() {
  let chosen = balanSprites.default;
  for (const m of balanSprites.milestones) if (clicks >= m.count) chosen = m;
  return chosen;
}
function updateBalanSpriteForState(state) {
  // States: "default", "click", "milestone"
  if (state === "click") {
    setBalanSprite(balanSprites.click);
  } else if (state === "milestone") {
    setBalanSprite(getMilestoneSprite());
  } else {
    setBalanSprite(getMilestoneSprite());
  }
}
// Initial sprite
updateBalanSpriteForState("default");

// ---- Audio playback: play from pool for zero delay ----
let isMuted = false;
const muteBtn = document.getElementById('mute-btn');
muteBtn.onclick = () => {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? 'talk!' : 'shut up!';
};
function playVoiceFromPool(audioObj) {
  if (!audioObj || isMuted) return;
  try {
    // Use cloneNode so each can play simultaneously
    const clone = audioObj.cloneNode();
    clone.play();
  } catch (e) {}
}

// ---- Robust image hover/click logic ----
let clickerState = "default"; // "default", "click", "milestone"
let isMouseOver = false;

function showClickSprite() {
  updateBalanSpriteForState("click");
  clickerState = "click";
}
function showMilestoneSprite() {
  updateBalanSpriteForState("milestone");
  clickerState = "milestone";
}
function showDefaultSprite() {
  updateBalanSpriteForState("default");
  clickerState = "default";
}

// On mouseenter: always show click sprite until mouseleave
balanImg.addEventListener('mouseenter', () => {
  isMouseOver = true;
  showClickSprite();
});
balanImg.addEventListener('mouseleave', () => {
  isMouseOver = false;
  showDefaultSprite();
});
balanImg.addEventListener('mousedown', () => {
  // On click, maintain click sprite
  showClickSprite();
});
balanImg.addEventListener('mouseup', () => {
  // Do nothing; only mouseleave reverts sprite
});

// On click: increment, play sound, handle milestone
balanImg.onclick = () => {
  clicks++;
  localStorage.setItem('balanClicks', clicks);
  clickCountEl.textContent = clicks;

  // Check for secret 10000 milestone first
  if (clicks >= 10000) {
    // reveal secret button when reaching 10000 clicks
    updateSecretButtonVisibility();
  }

  let voiceObj = null;
  if (balanSprites.milestones.some(m => clicks === m.count)) {
    voiceObj = nextMilestoneVoice();
    showMilestoneSprite();
  } else if (clicks % 50 === 0) {
    voiceObj = nextFiftyVoice();
    showClickSprite();
  } else {
    voiceObj = nextRandomVoice();
    showClickSprite();
  }
  playVoiceFromPool(voiceObj);
  // Do NOT revert sprite here; only mouseleave does that now
};

// Reset button logic
resetBtn.onclick = () => {
  happyCoins += clicks;
  clicks = 0;
  localStorage.setItem('balanClicks', 0);
  updateHappyCoins();
  clickCountEl.textContent = clicks;
  showDefaultSprite();
  // Hide secret if reset dropped below threshold
  updateSecretButtonVisibility();
};

// Ensure secret button visibility reflects stored clicks on load
updateSecretButtonVisibility();

// =========================
// Shop System (DRY, event delegation)
// =========================
const shopSlots = [
  { ids: ['item1A', 'item1B'] },
  { ids: ['item2A', 'item2B'] },
  { ids: ['item3A', 'item3B'] },
  { ids: ['item4A', 'item4B'] }
];
// CHANGE THIS ARRAY FOR ROTATION!
const shopItems = [
  { id: 'item1A', price: 500, lockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box.webp', unlockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box-unlocked.webp', fullSrc: 'sprites/shop/sellables/lentius.png' },
  { id: 'item2A', price: 200, lockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box.webp', unlockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box-unlocked.webp', fullSrc: 'sprites/shop/sellables/balan-balan-spin.gif' },
  { id: 'item3A', price: 250, lockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box.webp', unlockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box-unlocked.webp', fullSrc: 'sprites/shop/sellables/butterfly-girl-redesign.png' },
  { id: 'item4A', price: 450, lockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box.webp', unlockedSrc: 'sprites/shop/webp-shop-sprites/cardboard-box-unlocked.webp', fullSrc: 'sprites/shop/sellables/nastunye.png' }
];
// Clean up previous week's owned item IDs
shopSlots.forEach((slot, idx) => {
  const currentID = shopItems[idx].id;
  const otherID = slot.ids.find(id => id !== currentID);
  localStorage.removeItem(otherID);
});
function renderShop(items, container) {
  container.innerHTML = items.map(item => {
    const owned = localStorage.getItem(item.id) === 'owned';
    return `
      <div class="shop-item" data-id="${item.id}">
        <div class="shop-image">
          <img 
            id="${item.id}-img"
            class="${owned ? 'shop-unlocked-img' : ''}"
            src="${owned ? item.unlockedSrc : item.lockedSrc}"
            data-fullsrc="${owned ? item.fullSrc : ''}"
            alt="${owned ? 'Unlocked' : 'Locked'}"
          >
        </div>
        <button class="buy-btn" ${owned ? 'disabled' : ''}>
          ${owned ? 'Owned ✅' : `Buy for ${item.price} happy coins`}
        </button>
      </div>
    `;
  }).join('');
}
const shopLeftContainer = document.getElementById('shop-left-container');
const shopRightContainer = document.getElementById('shop-right-container');
renderShop(shopItems.slice(0,2), shopLeftContainer);
renderShop(shopItems.slice(2,4), shopRightContainer);
// Event delegation for buying
function shopBuyHandler(e) {
  if (!e.target.classList.contains('buy-btn')) return;
  const itemDiv = e.target.closest('.shop-item');
  const id = itemDiv.dataset.id;
  const item = shopItems.find(i => i.id === id);
  if (!item || localStorage.getItem(id) === 'owned') return;
  if (happyCoins >= item.price) {
    happyCoins -= item.price;
    updateHappyCoins();
    localStorage.setItem(id, 'owned');
    renderShop(shopItems.slice(0,2), shopLeftContainer);
    renderShop(shopItems.slice(2,4), shopRightContainer);
  } else {
    alert('Not enough Happy Coins!');
  }
}
shopLeftContainer.addEventListener('click', shopBuyHandler);
shopRightContainer.addEventListener('click', shopBuyHandler);

// =========================
// Modal Logic for Shop Full Image
// =========================
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
// Modal open
document.body.addEventListener('click', function(e) {
  if (e.target.classList.contains('shop-unlocked-img')) {
    const fullSrc = e.target.getAttribute('data-fullsrc');
    modalImg.src = fullSrc;
    modalImg.setAttribute('data-fullsrc', fullSrc);
    imageModal.hidden = false;
    e.preventDefault();
  }
});
// Modal: click to open in new tab
modalImg.onclick = function() {
  const fullSrc = modalImg.getAttribute('data-fullsrc');
  if (fullSrc) window.open(fullSrc, '_blank');
};
// Modal close: background click or Escape
imageModal.onclick = function(e) {
  if (e.target === imageModal) {
    imageModal.hidden = true;
    modalImg.src = '';
  }
};
window.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    imageModal.hidden = true;
    modalImg.src = '';
  }
});

