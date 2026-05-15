// ══════════════════════════════════════════════
//  CINÉRECOM — script.js (FINAL FIXED v2)
//  Fix: Hero Banner + Duplicate functions + Selectors
// ══════════════════════════════════════════════

const API_BASE_URL = "http://127.0.0.1:8000";

// Placeholder images theo genre (dùng khi poster không load được)
const GENRE_PLACEHOLDERS = {
  'Action': 'https://placehold.co/300x450/1a0a0a/FF6B6B?text=Action&font=roboto',
  'Comedy': 'https://placehold.co/300x450/1a1500/FFE66D?text=Comedy&font=roboto',
  'Drama': 'https://placehold.co/300x450/12121a/4ECDC4?text=Drama&font=roboto',
  'Horror': 'https://placehold.co/300x450/0d0010/FF006E?text=Horror&font=roboto',
  'Sci-Fi': 'https://placehold.co/300x450/0a0a2e/8338EC?text=SciFi&font=roboto',
  'Romance': 'https://placehold.co/300x450/1a0015/FB5607?text=Romance&font=roboto',
  'Animation': 'https://placehold.co/300x450/1a1a2e/FFBE0B?text=Animation&font=roboto',
  'Adventure': 'https://placehold.co/300x450/0a1a0a/38EC83?text=Adventure&font=roboto',
  'Thriller': 'https://placehold.co/300x450/1a0a1a/EC3883?text=Thriller&font=roboto',
  'default': 'https://placehold.co/300x450/1c1c28/FFFFFF?text=Movie&font=roboto'
};

const GENRES = [
  {id:'action',     label:'Action',     emoji:'💥'},
  {id:'adventure',  label:'Adventure',  emoji:'🗺️'},
  {id:'animation',  label:'Animation',  emoji:'🎨'},
  {id:'children',   label:'Children',   emoji:'🧸'},
  {id:'comedy',     label:'Comedy',     emoji:'😂'},
  {id:'crime',      label:'Crime',      emoji:'🔍'},
  {id:'documentary',label:'Documentary',emoji:'🎥'},
  {id:'drama',      label:'Drama',      emoji:'🎭'},
  {id:'fantasy',    label:'Fantasy',    emoji:'🧙'},
  {id:'film-noir',  label:'Film-Noir',  emoji:'🕯️'},
  {id:'horror',     label:'Horror',     emoji:'😱'},
  {id:'imax',       label:'IMAX',       emoji:'📽️'},
  {id:'musical',    label:'Musical',    emoji:'🎵'},
  {id:'mystery',    label:'Mystery',    emoji:'🔎'},
  {id:'romance',    label:'Romance',    emoji:'💕'},
  {id:'sci-fi',     label:'Sci-Fi',     emoji:'🚀'},
  {id:'thriller',   label:'Thriller',   emoji:'⚡'},
  {id:'war',        label:'War',        emoji:'⚔️'},
  {id:'western',    label:'Western',    emoji:'🤠'},
];

// ── State 
let currentUser = null;
let selectedGenres = [];
let regStep = 1;


//  PAGE NAVIGATION

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
  document.getElementById('user-menu')?.classList.remove('open');
  document.getElementById('search-bar-wrap')?.classList.remove('open');
}

// ── Modal (login / register) ─────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal2(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function overlayClose(e, id) {
  if (e.target === document.getElementById(id)) {
    closeModal2(id);
  }
}


//  LOGIN

function switchLoginTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.getElementById('login-tab-' + tab)?.classList.add('active');
}

function validateLoginId() {
  const raw = document.getElementById('login-userid').value;
  const v = parseInt(raw);
  const valid = raw !== '' && v >= 1 && v <= 6040;
  const btn = document.getElementById('btn-login-id');
  const err = document.getElementById('login-id-error');
  if (btn) btn.disabled = !valid;
  if (err) err.style.display = (raw !== '' && !valid) ? 'block' : 'none';
}

async function handleOldUserLogin() {
  const userId = parseInt(document.getElementById('login-userid').value);
  if (!(userId >= 1 && userId <= 6040)) return;

  const btn = document.getElementById('btn-login-id');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>Đang đăng nhập...</span>';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE_URL}/recommend/old-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, top_n: 10 }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    currentUser = {
      id: data.user_id,
      name: `User #${data.user_id}`,
      email: '',
      isNew: false,
      genres: [],
      recommendations: data.items || []
    };
  } catch (err) {
    console.warn('Old user login fallback:', err);
    currentUser = {
      id: userId,
      name: `User #${userId}`,
      email: '',
      isNew: false,
      genres: [],
      recommendations: []
    };
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
  
  closeModal2('modal-login');
  showPage('page-app');
  enterApp();
}

function handleGuestLogin() {
  currentUser = {
    id: 0,
    name: 'Khách',
    email: '',
    isNew: false,
    genres: [],
    recommendations: []
  };
  closeModal2('modal-login');
  showPage('page-app');
  enterApp();
}

function handleEmailLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-email-error');
  
  if (!email || !pass) {
    if (errEl) {
      errEl.textContent = 'Vui lòng điền đầy đủ email và mật khẩu';
      errEl.style.display = 'block';
    }
    return;
  }
  if (errEl) errEl.style.display = 'none';
  
  currentUser = {
    name: email.split('@')[0],
    email: email,
    isNew: false,
    genres: [],
    recommendations: []
  };
  closeModal2('modal-login');
  showPage('page-app');
  enterApp();
}


//  REGISTER

function initRegGenreGrid() {
  const grid = document.getElementById('reg-genre-grid');
  if (!grid) return;
  grid.innerHTML = GENRES.map(g => 
    `<div class="genre-pill" id="rgp-${g.id}" onclick="toggleRegGenre('${g.id}')">
      <span class="emoji">${g.emoji}</span>${g.label}
    </div>`
  ).join('');
}

function toggleRegGenre(id) {
  const el = document.getElementById('rgp-' + id);
  if (!el) return;
  if (selectedGenres.includes(id)) {
    selectedGenres = selectedGenres.filter(g => g !== id);
    el.classList.remove('selected');
  } else {
    selectedGenres.push(id);
    el.classList.add('selected');
  }
  const countEl = document.getElementById('reg-count');
  if (countEl) countEl.textContent = selectedGenres.length;
}

function goRegStep(step) {
  if (step === 3 && selectedGenres.length < 3) {
    const err = document.getElementById('genre-reg-error');
    if (err) err.style.display = 'block';
    return;
  }
  const err = document.getElementById('genre-reg-error');
  if (err) err.style.display = 'none';
  
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById('step-dot-' + i);
    if (dot) {
      dot.classList.toggle('active', i <= step);
      dot.classList.toggle('done', i < step);
    }
    if (i < 3) {
      const line = document.getElementById('step-line-' + i);
      if (line) line.classList.toggle('active', i < step);
    }
  }
  
  document.querySelectorAll('.reg-step').forEach(s => s.classList.remove('active'));
  document.getElementById('reg-step-' + step)?.classList.add('active');
  regStep = step;
  
  if (step === 3) {
    const tags = document.getElementById('reg-genre-tags');
    if (tags) {
      tags.innerHTML = selectedGenres.map(id => {
        const g = GENRES.find(x => x.id === id);
        return `<span class="genre-tag-sm">${g.emoji} ${g.label}</span>`;
      }).join('');
    }
  }
}

async function handleNewUserRegister() {
  const name = (document.getElementById('reg-firstname')?.value || 'Khách').trim();
  const email = document.getElementById('reg-email')?.value || '';
  
  try {
    const res = await fetch(`${API_BASE_URL}/recommend/new-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genres: selectedGenres, top_n: 10, alpha: 0.7 })
    });
    const data = await res.json();
    currentUser = {
      name: name,
      email: email,
      isNew: true,
      genres: selectedGenres,
      recommendations: data.items || []
    };
  } catch (err) {
    console.warn('New user register fallback:', err);
    currentUser = {
      name: name,
      email: email,
      isNew: true,
      genres: selectedGenres,
      recommendations: []
    };
  }
  closeModal2('modal-register');
  showPage('page-app');
  enterApp();
}


//  APP / DASHBOARD

function enterApp() {
  if (!currentUser) return;
  
  const initials = (currentUser.name || 'U').charAt(0).toUpperCase();
  const avatar = document.getElementById('app-avatar');
  const menuName = document.getElementById('menu-name');
  const menuEmail = document.getElementById('menu-email');
  
  if (avatar) avatar.textContent = initials;
  if (menuName) menuName.textContent = currentUser.name || 'Người dùng';
  if (menuEmail) menuEmail.textContent = currentUser.email || `ID: ${currentUser.id || '—'}`;

  const filterRow = document.getElementById('genre-filter-row');
  if (filterRow) {
    const genres = currentUser.genres?.length ? currentUser.genres : GENRES.slice(0, 5).map(g => g.id);
    filterRow.innerHTML = genres.map((id, i) => {
      const g = GENRES.find(x => x.id === id) || { label: id, emoji: '🎬' };
      return `<button class="genre-filter-btn ${i === 0 ? 'active' : ''}" onclick="filterByGenre('${id}', this)">
        ${g.emoji} ${g.label}
      </button>`;
    }).join('');
  }

  showPage('page-app');

  if (currentUser.isNew) {
    loadRecommendNewUser();
  } else {
    loadRecommendOldUser();
  }
  loadTrending();
  loadNewReleases();
}

// Skeleton helper
function showSkeletons(rowId, count = 5) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = Array(count).fill(`
    <div class="movie-thumb skeleton">
      <div class="thumb-poster skeleton-box"></div>
      <div class="thumb-info">
        <div class="skeleton-line w70"></div>
        <div class="skeleton-line w50"></div>
      </div>
    </div>`).join('');
}

// Gợi ý USER MỚI 
async function loadRecommendNewUser() {
    const row = document.getElementById('row-recommended');
    const hint = document.getElementById('rec-hint');
    if (!row) return;
    showSkeletons('row-recommended');
    if (hint) hint.style.display = 'none';
    try {
        const res = await fetch(`${API_BASE_URL}/recommend/new-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ genres: currentUser.genres, top_n: 10, alpha: 0.7 })
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const movies = data.items || [];
        if (movies.length === 0) throw new Error('empty');
        
        //  CẬP NHẬT HERO VỚI TOP 1
        if (movies.length > 0) {
            updateHeroWithTopRecommendation(movies[0]);
        }
        
        row.innerHTML = movies.map(m => movieThumbHTML(m)).join('');
    } catch (err) {
        console.warn('Load new user recs failed:', err);
        row.innerHTML = '';
        if (hint) {
            hint.textContent = 'Chưa có gợi ý. Kết nối backend để tải gợi ý từ AI.';
            hint.style.display = 'block';
        }
    }
}

//  Gợi ý USER CŨ 
async function loadRecommendOldUser() {
    const row = document.getElementById('row-recommended');
    const hint = document.getElementById('rec-hint');
    if (!row) return;
    showSkeletons('row-recommended');
    if (hint) hint.style.display = 'none';
    try {
        const res = await fetch(`${API_BASE_URL}/recommend/old-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, top_n: 10 })
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const movies = data.items || [];
        if (movies.length === 0) throw new Error('empty');
        
        // CẬP NHẬT HERO VỚI TOP 1
        if (movies.length > 0) {
            updateHeroWithTopRecommendation(movies[0]);
        }
        
        row.innerHTML = movies.map(m => movieThumbHTML(m)).join('');
    } catch (err) {
        console.warn('Load old user recs failed:', err);
        row.innerHTML = '';
        if (hint) {
            hint.textContent = 'Chưa có gợi ý. Kết nối backend để tải gợi ý từ AI.';
            hint.style.display = 'block';
        }
    }
}

//  Trending 
async function loadTrending() {
  const row = document.getElementById('row-trending');
  if (!row) return;
  
  showSkeletons('row-trending', 6);
  try {
    const res = await fetch(`${API_BASE_URL}/movies?limit=10&offset=0`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const movies = Array.isArray(data) ? data : (data.items || []);
    if (movies.length === 0) throw new Error('empty');
    row.innerHTML = movies.map((m, i) => movieThumbHTML(m, i + 1)).join('');
  } catch (err) {
    console.warn('Load trending failed:', err);
    row.innerHTML = [
      {emoji:'💥', genre:'Action'}, {emoji:'🚀', genre:'Sci-Fi'},
      {emoji:'😱', genre:'Horror'}, {emoji:'🔍', genre:'Crime'},
      {emoji:'🧙', genre:'Fantasy'}, {emoji:'🎭', genre:'Drama'}
    ].map((p, i) => `
      <div class="movie-thumb">
        <div class="thumb-poster" style="background:${genreGradient(p.genre)}">
          <span class="thumb-emoji">${p.emoji}</span>
          <div class="thumb-rank">${i + 1}</div>
        </div>
        <div class="thumb-info">
          <p class="thumb-title">Tên phim sẽ ở đây</p>
          <p class="thumb-meta">${p.genre} · 2024</p>
        </div>
      </div>`).join('');
  }
}

// New releases
async function loadNewReleases() {
  const grid = document.getElementById('row-new');
  if (!grid) return;
  
  try {
    const res = await fetch(`${API_BASE_URL}/movies?limit=8&offset=10`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const movies = Array.isArray(data) ? data : (data.items || []);
    if (movies.length === 0) throw new Error('empty');
    grid.innerHTML = movies.map(m => movieGridHTML(m)).join('');
  } catch (err) {
    console.warn('Load new releases failed:', err);
  }
}
//  MOVIE CARD BUILDERS — FIX POSTER IMAGES


function isValidPosterUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

function getPlaceholderByGenre(genres) {
  if (!genres) return GENRE_PLACEHOLDERS.default;
  const genresStr = String(genres).toLowerCase();
  for (const [genre, url] of Object.entries(GENRE_PLACEHOLDERS)) {
    if (genre !== 'default' && genresStr.includes(genre.toLowerCase())) {
      return url;
    }
  }
  return GENRE_PLACEHOLDERS.default;
}

function movieThumbHTML(m, rank) {
  const posterUrl = m.poster_url?.trim();
  const hasValidPoster = isValidPosterUrl(posterUrl);
  const fallbackUrl = getPlaceholderByGenre(m.genres);
  
  const score = m.score ? `<span class="thumb-score">★ ${(m.score * 5).toFixed(1)}</span>` : '';
  const rankBadge = rank ? `<div class="thumb-rank">${rank}</div>` : '';

  const posterContent = hasValidPoster
    ? `<img src="${posterUrl}" 
            alt="${(m.title || '').replace(/"/g, '&quot;')}" 
            class="thumb-img" 
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackUrl}'; this.classList.add('thumb-img--fallback')">
       <span class="thumb-emoji thumb-emoji--fallback" style="display:none">${genreEmoji(m.genres)}</span>`
    : `<img src="${fallbackUrl}" 
            alt="${(m.title || '').replace(/"/g, '&quot;')}" 
            class="thumb-img thumb-img--placeholder"
            loading="lazy">
       <span class="thumb-emoji thumb-emoji--fallback" style="display:none">${genreEmoji(m.genres)}</span>`;

  return `
    <div class="movie-thumb" onclick='openMovieModal(${safeJSON(m)})'>
      <div class="thumb-poster" style="background:transparent">
        ${posterContent}
        ${rankBadge}
        ${score}
      </div>
      <div class="thumb-info">
        <p class="thumb-title">${m.title || m.movie_title || 'Không rõ'}</p>
        <p class="thumb-meta">${m.genres || m.movie_genres || '—'}</p>
      </div>
    </div>`;
}

function movieGridHTML(m) {
  const posterUrl = m.poster_url?.trim();
  const hasValidPoster = isValidPosterUrl(posterUrl);
  const fallbackUrl = getPlaceholderByGenre(m.genres);
  
  const title = m.title || m.movie_title || 'Không rõ';
  const genres = m.genres || m.movie_genres || '—';

  const posterContent = hasValidPoster
    ? `<img src="${posterUrl}" 
            alt="${title.replace(/"/g, '&quot;')}" 
            class="grid-img" 
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackUrl}'; this.classList.add('grid-img--fallback')">
       <span class="grid-emoji-fallback" style="display:none">${genreEmoji(genres)}</span>
       <div class="grid-overlay"><button class="play-mini">▶</button></div>`
    : `<img src="${fallbackUrl}" 
            alt="${title.replace(/"/g, '&quot;')}" 
            class="grid-img grid-img--placeholder"
            loading="lazy">
       <span class="grid-emoji-fallback" style="display:none">${genreEmoji(genres)}</span>
       <div class="grid-overlay"><button class="play-mini">▶</button></div>`;

  return `
    <div class="grid-card" onclick='openMovieModal(${safeJSON(m)})'>
      <div class="grid-poster" style="background:transparent">
        ${posterContent}
      </div>
      <div class="grid-info">
        <p class="grid-title">${title}</p>
        <p class="grid-meta">${genres}</p>
      </div>
    </div>`;
}

function safeJSON(obj) {
  return JSON.stringify(obj)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Helpers
function genreEmoji(genres) {
  if (!genres) return '🎬';
  const map = {
    Action:'💥', Comedy:'😂', Drama:'🎭', Horror:'😱', Romance:'💕',
    'Sci-Fi':'🚀', Thriller:'⚡', Animation:'🎨', Crime:'🔍', Fantasy:'🧙',
    Adventure:'🗺️', Musical:'🎵', Mystery:'🔎', Documentary:'🎥', War:'⚔️'
  };
  for (const [k, v] of Object.entries(map)) {
    if (String(genres).includes(k)) return v;
  }
  return '🎬';
}

function genreGradient(genres) {
  if (!genres) return 'linear-gradient(135deg,#1a1a2e,#16213e)';
  const g = String(genres);
  if (g.includes('Action'))  return 'linear-gradient(135deg,#1a0a0a,#3d1515)';
  if (g.includes('Sci-Fi'))  return 'linear-gradient(135deg,#0a0a2e,#0d1b4a)';
  if (g.includes('Comedy'))  return 'linear-gradient(135deg,#1a1500,#2d2500)';
  if (g.includes('Horror'))  return 'linear-gradient(135deg,#0d0010,#1a0020)';
  if (g.includes('Romance')) return 'linear-gradient(135deg,#1a0015,#300025)';
  return 'linear-gradient(135deg,#12121a,#1c1c28)';
}


async function filterByGenre(genreId, btn) {
  document.querySelectorAll('.genre-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const row = document.getElementById('row-by-genre');
  if (!row) return;
  
  row.innerHTML = '<div class="movie-thumb skeleton"><div class="thumb-poster skeleton-box"></div></div>'.repeat(4);
  try {
    const res = await fetch(`${API_BASE_URL}/movies?genre=${encodeURIComponent(genreId)}&limit=10`);
    const data = await res.json();
    const movies = Array.isArray(data) ? data : (data.items || []);
    if (movies.length === 0) throw new Error('empty');
    row.innerHTML = movies.map(m => movieThumbHTML(m)).join('');
  } catch (err) {
    console.warn('Filter by genre failed:', err);
    row.innerHTML = `<p style="color:var(--muted);font-size:12px;padding:1rem">
      Kết nối API để lọc theo thể loại <strong>${genreId}</strong></p>`;
  }
}


let searchTimer = null;
function toggleSearch() {
  const wrap = document.getElementById('search-bar-wrap');
  if (wrap) {
    wrap.classList.toggle('open');
    if (wrap.classList.contains('open')) {
      document.querySelector('.search-bar')?.focus();
    }
  }
}

function handleSearch(query) {
  clearTimeout(searchTimer);
  if (!query.trim()) return;
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      const movies = Array.isArray(data) ? data : (data.items || []);
      const row = document.getElementById('row-recommended');
      const hint = document.getElementById('rec-hint');
      if (row) row.innerHTML = movies.map(m => movieThumbHTML(m)).join('');
      if (hint) hint.style.display = 'none';
    } catch (err) {
      console.warn('Search failed:', err);
    }
  }, 400);
}


function switchTab(tab, el) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
}

function toggleUserMenu() {
  document.getElementById('user-menu')?.classList.toggle('open');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.app-user')) {
    document.getElementById('user-menu')?.classList.remove('open');
  }
});


function openMovieModal(movie) {
  if (typeof movie === 'string') {
    try {
      movie = JSON.parse(movie
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&'));
    } catch (err) {
      console.error('Parse modal data failed:', err);
      return;
    }
  }

  const title = movie.title || movie.movie_title || 'Không rõ';
  const genres = movie.genres || movie.movie_genres || '—';
  const poster = movie.poster_url?.trim();
  const emojiEl = document.getElementById('modal-emoji');
  
  if (!emojiEl) return;
  
  if (emojiEl.tagName === 'IMG') {
    emojiEl.outerHTML = `<span id="modal-emoji" style="font-size:60px">🎬</span>`;
  }
  
  if (isValidPosterUrl(poster)) {
    const fallbackUrl = getPlaceholderByGenre(genres);
    const img = document.createElement('img');
    img.id = 'modal-emoji';
    img.src = poster;
    img.alt = title;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:0';
    img.onerror = function() {
      this.onerror = null;
      this.src = fallbackUrl;
      this.classList.add('modal-img--fallback');
    };
    emojiEl.replaceWith(img);
  } else {
    const placeholderUrl = getPlaceholderByGenre(genres);
    const img = document.createElement('img');
    img.id = 'modal-emoji';
    img.src = placeholderUrl;
    img.alt = title;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:0';
    emojiEl.replaceWith(img);
  }
  
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-rating').textContent = movie.score ? `★ ${(movie.score * 5).toFixed(1)}` : '★ —';
  document.getElementById('modal-year').textContent = movie.year || '—';
  document.getElementById('modal-genres').textContent = genres;
  document.getElementById('modal-desc').textContent = movie.description || 'Mô tả phim sẽ hiển thị sau khi kết nối database.';
  
  document.getElementById('movie-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMovieModal() {
  const modal = document.getElementById('movie-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  const el = document.getElementById('modal-emoji');
  if (el && el.tagName === 'IMG') {
    el.outerHTML = `<span id="modal-emoji" style="font-size:60px">🎬</span>`;
  }
}

function closeModal(e) {
  if (e.target === document.getElementById('movie-modal')) {
    closeMovieModal();
  }
}


function handleLogout() {
  currentUser = null;
  selectedGenres = [];
  regStep = 1;
  
  document.querySelectorAll('.reg-step').forEach(s => s.classList.remove('active'));
  document.getElementById('reg-step-1')?.classList.add('active');
  
  for (let i = 1; i <= 3; i++) {
    document.getElementById('step-dot-' + i)?.classList.remove('active', 'done');
    if (i < 3) document.getElementById('step-line-' + i)?.classList.remove('active');
  }
  document.getElementById('step-dot-1')?.classList.add('active');
  document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('selected'));
  document.getElementById('reg-count').textContent = '0';
  
  showPage('page-landing');
}

// ══════════════════════════════════════════════
//  UTIL — render bất kỳ mảng phim vào row/grid
// ══════════════════════════════════════════════
function renderMovieRow(movies, rowId, useGrid = false) {
  const el = document.getElementById(rowId);
  if (!el) return;
  if (!movies?.length) {
    el.innerHTML = `<p style="color:var(--muted);font-size:12px;padding:1rem">Không có phim.</p>`;
    return;
  }
  el.innerHTML = movies.map(m => useGrid ? movieGridHTML(m) : movieThumbHTML(m)).join('');
}

// ══════════════════════════════════════════════
//  HERO BANNER UPDATE — FIX SELECTORS
// ══════════════════════════════════════════════
function updateHeroWithTopRecommendation(movie) {
    if (!movie) return;
    
    // 1. Tiêu đề & Mô tả
    const titleEl = document.getElementById('hero-title');
    const descEl = document.getElementById('hero-desc');
    if (titleEl) titleEl.textContent = movie.title || movie.movie_title || 'Phim Đề Xuất';
    if (descEl) descEl.textContent = movie.description || `Bộ phim ${movie.genres || movie.movie_genres || 'hấp dẫn'} đang chờ bạn khám phá. Nhấn "Xem ngay" để thêm vào danh sách.`;

    // 2. Meta thông tin (Rating, Năm, Thời lượng, Thể loại)
    const metaContainer = document.querySelector('.hero-movie-meta');
    if (metaContainer) {
        // Cập nhật rating
        const ratingEl = metaContainer.querySelector('.hero-rating');
        if (ratingEl) ratingEl.textContent = movie.score ? `★ ${(movie.score * 5).toFixed(1)}` : '★ —';

        // Cập nhật năm & thời lượng (span thứ 2 và 3 trong container, không có class riêng)
        const infoSpans = metaContainer.querySelectorAll('span:not(.hero-genre-tag):not(.hero-rating)');
        if (infoSpans.length >= 2) {
            infoSpans[0].textContent = movie.year || '—';
            infoSpans[1].textContent = movie.runtime || movie.duration || '— phút';
        }

        // Xóa genre cũ, thêm genre mới (tối đa 2 tag)
        metaContainer.querySelectorAll('.hero-genre-tag').forEach(el => el.remove());
        const genres = (movie.genres || movie.movie_genres || '').split('|').filter(g => g.trim());
        genres.slice(0, 2).forEach(g => {
            const tag = document.createElement('span');
            tag.className = 'hero-genre-tag';
            tag.textContent = g.trim();
            metaContainer.appendChild(tag);
        });
    }

    // 3. Background Poster
    const bgEl = document.querySelector('.hero-banner-bg');
    const placeholderEl = document.querySelector('.hero-banner-placeholder');
    const posterUrl = movie.poster_url?.trim();
    const fallbackUrl = getPlaceholderByGenre(movie.genres || movie.movie_genres);
    const finalUrl = isValidPosterUrl(posterUrl) ? posterUrl : fallbackUrl;

    if (bgEl) {
        bgEl.style.backgroundImage = `url('${finalUrl}')`;
        bgEl.style.backgroundSize = 'cover';
        bgEl.style.backgroundPosition = 'center';
    }
    if (placeholderEl) placeholderEl.style.display = 'none'; // Ẩn emoji mặc định

    // 4. Gán sự kiện nút bấm
    const watchBtn = document.querySelector('.btn-play');
    if (watchBtn) watchBtn.onclick = () => openMovieModal(movie);
    
    const infoBtn = document.querySelector('.btn-info');
    if (infoBtn) infoBtn.onclick = () => openMovieModal(movie);
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initRegGenreGrid();
  loadLandingTrending();
});

// Load trending movies cho landing page
async function loadLandingTrending() {
  const container = document.getElementById('landing-trending');
  if (!container) return;
  
  try {
    const res = await fetch(`${API_BASE_URL}/movies?limit=8&offset=0`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const movies = Array.isArray(data) ? data : (data.items || []);
    
    if (movies.length === 0) throw new Error('empty');
    
    container.innerHTML = movies.map((m, index) => {
      const hasPoster = m.poster_url && m.poster_url.startsWith('http');
      const posterUrl = hasPoster ? m.poster_url : getPlaceholderByGenre(m.genres);
      const title = m.title || m.movie_title || 'Không rõ';
      const genres = m.genres || m.movie_genres || '—';
      
      return `
        <div class="trending-card" onclick="openMovieModal(${safeJSON(m)})">
          <div class="trending-rank">${index + 1}</div>
          <img src="${posterUrl}" 
               alt="${title}" 
               class="trending-poster"
               loading="lazy"
               onerror="this.src='https://placehold.co/200x300/1a1a2e/FFFFFF?text=Movie'">
          <div class="trending-overlay">
            <h3 class="trending-title">${title}</h3>
            <p class="trending-genre">${genres}</p>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.warn('Load landing trending failed:', err);
    container.innerHTML = `
      <p style="color: var(--muted); text-align: center; width: 100%;">
        Không thể tải phim thịnh hành. Vui lòng thử lại sau.
      </p>
    `;
  }
}