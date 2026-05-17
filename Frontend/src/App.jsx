import React, { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const DEBUG_API = true;

const GENRE_PLACEHOLDERS = {
  Action: 'https://placehold.co/300x450/1a0a0a/FF6B6B?text=Action&font=roboto',
  Comedy: 'https://placehold.co/300x450/1a1500/FFE66D?text=Comedy&font=roboto',
  Drama: 'https://placehold.co/300x450/12121a/4ECDC4?text=Drama&font=roboto',
  Horror: 'https://placehold.co/300x450/0d0010/FF006E?text=Horror&font=roboto',
  'Sci-Fi': 'https://placehold.co/300x450/0a0a2e/8338EC?text=SciFi&font=roboto',
  Romance: 'https://placehold.co/300x450/1a0015/FB5607?text=Romance&font=roboto',
  Animation: 'https://placehold.co/300x450/1a1a2e/FFBE0B?text=Animation&font=roboto',
  Adventure: 'https://placehold.co/300x450/0a1a0a/38EC83?text=Adventure&font=roboto',
  Thriller: 'https://placehold.co/300x450/1a0a1a/EC3883?text=Thriller&font=roboto',
  default: 'https://placehold.co/300x450/1c1c28/FFFFFF?text=Movie&font=roboto'
};

const GENRES = [
  { id: 'action', label: 'Action', emoji: '💥' },
  { id: 'adventure', label: 'Adventure', emoji: '🗺️' },
  { id: 'animation', label: 'Animation', emoji: '🎨' },
  { id: 'children', label: 'Children', emoji: '🧸' },
  { id: 'comedy', label: 'Comedy', emoji: '😂' },
  { id: 'crime', label: 'Crime', emoji: '🔍' },
  { id: 'documentary', label: 'Documentary', emoji: '🎥' },
  { id: 'drama', label: 'Drama', emoji: '🎭' },
  { id: 'fantasy', label: 'Fantasy', emoji: '🧙' },
  { id: 'film-noir', label: 'Film-Noir', emoji: '🕯️' },
  { id: 'horror', label: 'Horror', emoji: '😱' },
  { id: 'imax', label: 'IMAX', emoji: '📽️' },
  { id: 'musical', label: 'Musical', emoji: '🎵' },
  { id: 'mystery', label: 'Mystery', emoji: '🔎' },
  { id: 'romance', label: 'Romance', emoji: '💕' },
  { id: 'sci-fi', label: 'Sci-Fi', emoji: '🚀' },
  { id: 'thriller', label: 'Thriller', emoji: '⚡' },
  { id: 'war', label: 'War', emoji: '⚔️' },
  { id: 'western', label: 'Western', emoji: '🤠' }
];

function genreById(id) {
  return GENRES.find((g) => g.id === id) || { id, label: id, emoji: '🎬' };
}

function isValidPosterUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

function getPlaceholderByGenre(genres) {
  if (!genres) return GENRE_PLACEHOLDERS.default;
  const lower = String(genres).toLowerCase();
  for (const [genre, url] of Object.entries(GENRE_PLACEHOLDERS)) {
    if (genre !== 'default' && lower.includes(genre.toLowerCase())) return url;
  }
  return GENRE_PLACEHOLDERS.default;
}

function genreEmoji(genres) {
  if (!genres) return '🎬';
  const map = {
    Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '😱', Romance: '💕',
    'Sci-Fi': '🚀', Thriller: '⚡', Animation: '🎨', Crime: '🔍', Fantasy: '🧙',
    Adventure: '🗺️', Musical: '🎵', Mystery: '🔎', Documentary: '🎥', War: '⚔️'
  };
  for (const [k, v] of Object.entries(map)) {
    if (String(genres).includes(k)) return v;
  }
  return '🎬';
}

function movieTitle(movie) {
  return movie?.title || movie?.movie_title || 'Không rõ';
}

function movieGenres(movie) {
  return movie?.genres || movie?.movie_genres || '—';
}

function displayScore(score) {
  if (score === undefined || score === null || Number.isNaN(Number(score))) return '★ —';
  const value = Number(score);
  const normalized = value <= 1 ? value * 5 : value;
  return `★ ${normalized.toFixed(1)}`;
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  if (DEBUG_API) console.log('[API REQUEST]', url, options);

  const res = await fetch(url, options);
  const text = await res.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (DEBUG_API) console.log('[API RESPONSE]', res.status, data);

  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }

  return data;
}

function SkeletonRow({ count = 5 }) {
  return Array.from({ length: count }).map((_, index) => (
    <div className="movie-thumb skeleton" key={index}>
      <div className="thumb-poster skeleton-box" />
      <div className="thumb-info">
        <div className="skeleton-line w70" />
        <div className="skeleton-line w50" />
      </div>
    </div>
  ));
}

function MovieThumb({ movie, rank, onOpen }) {
  const genres = movieGenres(movie);
  const posterUrl = movie?.poster_url?.trim();
  const finalPoster = isValidPosterUrl(posterUrl) ? posterUrl : getPlaceholderByGenre(genres);

  return (
    <div className="movie-thumb" onClick={() => onOpen(movie)}>
      <div className="thumb-poster" style={{ background: 'transparent' }}>
        <img
          src={finalPoster}
          alt={movieTitle(movie)}
          className={`thumb-img ${isValidPosterUrl(posterUrl) ? '' : 'thumb-img--placeholder'}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = getPlaceholderByGenre(genres);
            event.currentTarget.classList.add('thumb-img--fallback');
          }}
        />
        {rank ? <div className="thumb-rank">{rank}</div> : null}
        {movie?.score ? <span className="thumb-score">{displayScore(movie.score)}</span> : null}
      </div>
      <div className="thumb-info">
        <p className="thumb-title">{movieTitle(movie)}</p>
        <p className="thumb-meta">{genres}</p>
      </div>
    </div>
  );
}

function MovieGridCard({ movie, onOpen }) {
  const genres = movieGenres(movie);
  const posterUrl = movie?.poster_url?.trim();
  const finalPoster = isValidPosterUrl(posterUrl) ? posterUrl : getPlaceholderByGenre(genres);

  return (
    <div className="grid-card" onClick={() => onOpen(movie)}>
      <div className="grid-poster" style={{ background: 'transparent' }}>
        <img
          src={finalPoster}
          alt={movieTitle(movie)}
          className={`grid-img ${isValidPosterUrl(posterUrl) ? '' : 'grid-img--placeholder'}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = getPlaceholderByGenre(genres);
            event.currentTarget.classList.add('grid-img--fallback');
          }}
        />
        <div className="grid-overlay"><button className="play-mini">▶</button></div>
      </div>
      <div className="grid-info">
        <p className="grid-title">{movieTitle(movie)}</p>
        <p className="grid-meta">{genres}</p>
      </div>
    </div>
  );
}

function MovieModal({ movie, onClose, onAddFavorite, onRateMovie }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSelectedRating(0);
    setMessage('');
  }, [movie?.movie_id]);

  if (!movie) return null;

  const title = movieTitle(movie);
  const genres = movieGenres(movie);
  const posterUrl = movie?.poster_url?.trim();
  const finalPoster = isValidPosterUrl(posterUrl) ? posterUrl : getPlaceholderByGenre(genres);

  async function handleAddFavoriteClick() {
    if (!onAddFavorite) return;

    setSavingFavorite(true);
    setMessage('');

    try {
      await onAddFavorite(movie);
      setMessage('Đã thêm phim vào danh sách yêu thích.');
    } catch (err) {
      setMessage(err.message || 'Không thể thêm phim vào danh sách.');
    } finally {
      setSavingFavorite(false);
    }
  }

  async function handleSaveRatingClick() {
    if (!selectedRating) {
      setMessage('Vui lòng chọn số sao trước khi lưu đánh giá.');
      return;
    }

    if (!onRateMovie) return;

    setSavingRating(true);
    setMessage('');

    try {
      await onRateMovie(movie, selectedRating);
      setMessage(`Đã lưu đánh giá ${selectedRating} sao.`);
    } catch (err) {
      setMessage(err.message || 'Không thể lưu đánh giá.');
    } finally {
      setSavingRating(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={(event) => event.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-poster">
          <img
            id="modal-emoji"
            src={finalPoster}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getPlaceholderByGenre(genres);
            }}
          />
        </div>
        <div className="modal-info">
          <h3>{title}</h3>
          <div className="modal-meta">
            <span>{displayScore(movie.score)}</span>
            <span>{movie.release_year || movie.year || '—'}</span>
            <span>{genres}</span>
          </div>
          <p className="modal-desc">{movie.description || 'Mô tả phim sẽ hiển thị sau khi kết nối database.'}</p>

          <div
            className="rating-box"
            style={{
              marginTop: 14,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)'
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.82 }}>Đánh giá phim này</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    color: star <= selectedRating ? '#ffd166' : 'rgba(255,255,255,0.35)',
                    fontSize: 26,
                    lineHeight: 1,
                    padding: '2px 1px'
                  }}
                  aria-label={`${star} sao`}
                >
                  ★
                </button>
              ))}
              <button
                className="btn-info"
                type="button"
                disabled={savingRating}
                onClick={handleSaveRatingClick}
                style={{ marginLeft: 8 }}
              >
                {savingRating ? 'Đang lưu...' : 'Lưu đánh giá'}
              </button>
            </div>
          </div>

          {message ? (
            <p style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>{message}</p>
          ) : null}

          <div className="modal-actions">
            <button className="btn-play">▶ Xem ngay</button>
            <button
              className="btn-add-list"
              type="button"
              disabled={savingFavorite}
              onClick={handleAddFavoriteClick}
            >
              {savingFavorite ? 'Đang thêm...' : '+ Danh sách'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage({ setPage }) {
  return (
    <div id="page-landing" className="page active">
      <div className="landing-bg">
        <div className="bg-film-strip" />
        <div className="bg-overlay" />
      </div>
      <nav className="landing-nav">
        <div className="logo-mark">🎬 <span>CINÉRECOM</span></div>
        <div className="nav-actions">
          <button className="btn-primary-sm" onClick={() => setPage('register')}>Bắt đầu</button>
        </div>
      </nav>
      <div className="landing-hero">
        <p className="hero-eyebrow">Trải nghiệm điện ảnh cá nhân hoá</p>
        <h1 className="hero-title">Phim dành <em>riêng</em><br />cho bạn.</h1>
        <p className="hero-sub">Hệ thống AI phân tích gu xem phim và đề xuất những bộ phim bạn chưa biết mình yêu thích.</p>
        <div className="hero-cta">
          <button className="btn-primary-lg" onClick={() => setPage('register')}>Tạo tài khoản miễn phí</button>
          <button className="btn-outline-lg" onClick={() => setPage('login')}>Đăng nhập</button>
        </div>
        <div className="hero-stats">
          <div className="stat"><span>6,000+</span>Người dùng</div>
          <div className="stat-div" />
          <div className="stat"><span>10K+</span>Bộ phim</div>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ setPage, setCurrentUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password
        })
      });

      const user = data.user;

      setCurrentUser({
        id: user.id,
        name: user.username || normalizedEmail.split('@')[0],
        email: user.email,
        isNew: Number(user.id) > 6040,
        genres: [],
        recommendations: []
      });

      setPage('app');
    } catch (err) {
      console.error('Login failed:', err);
      setError('Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="page-login" className="page active">
      <div className="auth-bg">
        <div className="auth-bg-blur b1" />
        <div className="auth-bg-blur b2" />
      </div>

      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo" onClick={() => setPage('landing')}>
            🎬 <span>CINÉRECOM</span>
          </div>

          <h2 className="auth-title">Chào mừng trở lại</h2>
          <p className="auth-sub">Đăng nhập bằng tài khoản đã đăng ký</p>

          <div className="tab-content active">
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                placeholder="u12@gmail.com hoặc email của bạn"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              />
            </div>

            <div className="field">
              <label>Mật khẩu</label>
              <input
                className="input"
                type="password"
                value={password}
                placeholder="Nhập mật khẩu"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              />
            </div>

            <div className="field-row">
              <label className="checkbox-label">
                <input type="checkbox" /> Ghi nhớ đăng nhập
              </label>
              <a className="link-sm">Quên mật khẩu?</a>
            </div>

            <button
              className="btn-primary-full"
              disabled={loading}
              onClick={handleEmailLogin}
            >
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>

          {error ? (
            <p className="field-error" style={{ display: 'block', textAlign: 'center' }}>
              {error}
            </p>
          ) : null}

          <div className="auth-divider"><span>hoặc</span></div>

          <p className="auth-switch">
            Chưa có tài khoản? <a onClick={() => setPage('register')}>Đăng ký ngay</a>
          </p>

          <p className="auth-switch" style={{ fontSize: 11, opacity: 0.7 }}>
            User demo: u12@gmail.com / 12
          </p>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ setPage, setCurrentUser }) {
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedGenreLabels = selectedGenres.map((id) => genreById(id).label);

  function toggleGenre(id) {
    setSelectedGenres((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  }

  function goStep(nextStep) {
  const normalizedEmail = email.trim().toLowerCase();

  if (nextStep === 2) {
    if (!normalizedEmail || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setError('Email không hợp lệ');
      return;
    }
  }

  if (nextStep === 3 && selectedGenres.length < 3) {
    setError('Vui lòng chọn ít nhất 3 thể loại');
    return;
  }

  setError('');
  setStep(nextStep);
}

  async function handleRegister() {
    const name = `${lastName} ${firstName}`.trim() || email.split('@')[0] || 'Người dùng mới';
    const normalizedEmail = email.trim().toLowerCase();

    setLoading(true);
    setError('');

    try {
      const registerData = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name,
          email: normalizedEmail,
          password
        })
      });

      const user = registerData.user;

      let recommendations = [];

      try {
        const recData = await apiFetch('/recommend/new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genres: selectedGenreLabels,
            top_n: 10,
            alpha: 0.7
          })
        });

        recommendations = recData.items || [];
      } catch (recErr) {
        console.warn('Register OK but recommendation failed:', recErr);
      }

      setCurrentUser({
        id: user.id,
        name: user.username || name,
        email: user.email,
        isNew: true,
        genres: selectedGenres,
        recommendations
      });

      setPage('app');
    } catch (err) {
      console.error('Register failed:', err);
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="page-register" className="page active">
      <div className="auth-bg"><div className="auth-bg-blur b1" style={{ '--c1': 200, '--c2': 140 }} /><div className="auth-bg-blur b2" style={{ '--c1': 280, '--c2': 30 }} /></div>
      <div className="auth-wrap">
        <div className="auth-card wide">
          <div className="auth-logo" onClick={() => setPage('landing')}>🎬 <span>CINÉRECOM</span></div>

          <div className="steps">
            {[1, 2, 3].map((number) => (
              <React.Fragment key={number}>
                <div className={`step ${number <= step ? 'active' : ''} ${number < step ? 'done' : ''}`}><span>{number}</span></div>
                {number < 3 ? <div className={`step-line ${number < step ? 'active' : ''}`} /> : null}
              </React.Fragment>
            ))}
          </div>
          <div className="steps-labels"><span>Thông tin</span><span>Sở thích</span><span>Hoàn tất</span></div>

          {step === 1 ? (
            <div className="reg-step active">
              <h2 className="auth-title">Tạo tài khoản</h2>
              <p className="auth-sub">Bắt đầu hành trình điện ảnh cá nhân hoá</p>
              <div className="field-row-2">
                <div className="field"><label>Họ</label><input className="input" value={lastName} placeholder="Nguyễn" onChange={(e) => setLastName(e.target.value)} /></div>
                <div className="field"><label>Tên</label><input className="input" value={firstName} placeholder="Văn A" onChange={(e) => setFirstName(e.target.value)} /></div>
              </div>
              <div className="field"><label>Email</label><input className="input" type="email" value={email} placeholder="ten@email.com" onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="field"><label>Mật khẩu</label><input className="input" type="password" value={password} placeholder="Ít nhất 8 ký tự" onChange={(e) => setPassword(e.target.value)} /></div>
              <button className="btn-primary-full" onClick={() => goStep(2)}><span>Tiếp theo</span><span className="btn-arrow">→</span></button>
              <p className="auth-switch">Đã có tài khoản? <a onClick={() => setPage('login')}>Đăng nhập</a></p>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="reg-step active">
              <h2 className="auth-title">Gu điện ảnh của bạn</h2>
              <p className="auth-sub">Chọn ít nhất 3 thể loại để hệ thống hiểu bạn hơn</p>
              <div className="genre-grid">
                {GENRES.map((genre) => (
                  <div key={genre.id} className={`genre-pill ${selectedGenres.includes(genre.id) ? 'selected' : ''}`} onClick={() => toggleGenre(genre.id)}>
                    <span className="emoji">{genre.emoji}</span>{genre.label}
                  </div>
                ))}
              </div>
              <p className="genre-count">Đã chọn: <span>{selectedGenres.length}</span> thể loại</p>
              {error ? <p className="field-error" style={{ display: 'block', textAlign: 'center' }}>{error}</p> : null}
              <div className="step-btns">
                <button className="btn-ghost-sm" onClick={() => goStep(1)}>← Quay lại</button>
                <button className="btn-primary-full" style={{ flex: 1 }} onClick={() => goStep(3)}><span>Tiếp theo</span><span className="btn-arrow">→</span></button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="reg-step active">
              <div className="success-icon">🎬</div>
              <h2 className="auth-title">Sẵn sàng rồi!</h2>
              <p className="auth-sub">Tài khoản của bạn đã được tạo. Hệ thống AI đang phân tích sở thích của bạn...</p>
              <div className="genre-tags">
                {selectedGenres.map((id) => {
                  const genre = genreById(id);
                  return <span className="genre-tag-sm" key={id}>{genre.emoji} {genre.label}</span>;
                })}
              </div>
              {error ? <p className="field-error" style={{ display: 'block', textAlign: 'center' }}>{error}</p> : null}
              <button className="btn-primary-full" disabled={loading} onClick={handleRegister}>
                <span>{loading ? 'Đang đăng ký...' : 'Tạo tài khoản và vào xem phim'}</span>
                <span className="btn-arrow">🍿</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AppPage({ currentUser, setCurrentUser, setPage }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recommended, setRecommended] = useState(currentUser?.recommendations || []);
  const [activeView, setActiveView] = useState('home');
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [trending, setTrending] = useState([]);
  const [newMovies, setNewMovies] = useState([]);
  const [genreMovies, setGenreMovies] = useState([]);
  const [activeGenre, setActiveGenre] = useState('');
  const [hint, setHint] = useState('Đang tải gợi ý từ AI...');
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [modalMovie, setModalMovie] = useState(null);

  const userGenres = useMemo(() => {
    return currentUser?.genres?.length ? currentUser.genres : GENRES.slice(0, 5).map((g) => g.id);
  }, [currentUser]);

  const heroMovie = recommended?.[0] || trending?.[0] || null;

  const loadRecommendations = useCallback(async () => {
    if (!currentUser) return;

    setLoadingRecommended(true);
    setHint('Đang tải gợi ý từ AI...');

    try {
      const data = await apiFetch('/recommend/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          top_n: 10,
          genres: userGenres.map((id) => genreById(id).label),
          alpha: 0.7
        })
      });

      const movies = data.items || [];

      setRecommended(movies);

      if (movies.length > 0) {
        if (data.mode === 'old-user-svd') {
          setHint('');
        } else if (data.mode === 'few-rating-hybrid') {
          setHint('');
        } else if (data.mode === 'cold-start-genres') {
          setHint('');
        } else {
          setHint('');
        }
      } else {
        setHint('Chưa có gợi ý phù hợp.');
      }

    } catch (err) {
      console.warn('Load smart recommendations failed:', err);

      setRecommended([]);
      setHint(`Lỗi tải gợi ý: ${err.message}`);
    } finally {
      setLoadingRecommended(false);
    }
  }, [currentUser, userGenres]);

  const loadMovies = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const [top, latest] = await Promise.all([
        apiFetch('/movies?limit=10&offset=0'),
        apiFetch('/movies?limit=8&offset=10')
      ]);
      setTrending(Array.isArray(top) ? top : top.items || []);
      setNewMovies(Array.isArray(latest) ? latest : latest.items || []);
    } catch (err) {
      console.warn('Load movies failed:', err);
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
    loadMovies();
  }, [loadRecommendations, loadMovies]);

  useEffect(() => {
    if (!activeGenre && userGenres.length) setActiveGenre(userGenres[0]);
  }, [activeGenre, userGenres]);

  useEffect(() => {
    if (!activeGenre) return;
    const label = genreById(activeGenre).label.toLowerCase();
    const source = [...trending, ...newMovies, ...recommended];
    const filtered = source.filter((movie) => String(movieGenres(movie)).toLowerCase().includes(label));
    setGenreMovies(filtered.length ? filtered : source.slice(0, 6));
  }, [activeGenre, trending, newMovies, recommended]);
  
  async function handleSearch(query) {
    const value = query.trim();

    if (!value) {
      setHint('');
      loadRecommendations();
      return;
    }

    try {
      setLoadingRecommended(true);
      setHint(`Đang tìm phim: "${value}"...`);

      const data = await apiFetch(`/movies/search?q=${encodeURIComponent(value)}&limit=20`);
      const movies = Array.isArray(data) ? data : data.items || [];

      setRecommended(movies);
      setHint(
        movies.length
          ? `Kết quả tìm kiếm cho: "${value}"`
          : 'Không tìm thấy phim phù hợp.'
      );
    } catch (err) {
      console.warn('Search failed:', err);
      setRecommended([]);
      setHint(`Lỗi tìm kiếm phim: ${err.message}`);
    } finally {
      setLoadingRecommended(false);
    }
  }

  function getMovieId(movie) {
    return movie?.movie_id || movie?.MovieId || movie?.id;
  }

  async function handleAddFavorite(movie) {
    if (!currentUser?.id) {
      throw new Error('Bạn cần đăng nhập trước khi thêm phim vào danh sách.');
    }

    const movieId = getMovieId(movie);

    if (!movieId) {
      throw new Error('Không tìm thấy movie_id của phim.');
    }

    await apiFetch('/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        movie_id: movieId
      })
    });
    if (activeView === 'favorites') {
      await loadFavorites();
    }
  }

  async function handleRateMovie(movie, rating) {
    if (!currentUser?.id) {
      throw new Error('Bạn cần đăng nhập trước khi đánh giá phim.');
    }

    const movieId = getMovieId(movie);

    if (!movieId) {
      throw new Error('Không tìm thấy movie_id của phim.');
    }

    await apiFetch('/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        movie_id: movieId,
        rating
      })
    });

    await loadRecommendations();
  }

  async function loadFavorites() {
    if (!currentUser?.id) return;

    setLoadingFavorites(true);

    try {
      const data = await apiFetch(`/users/${currentUser.id}/favorites`);

      const movies = Array.isArray(data) ? data : data.items || [];
      setFavorites(movies);
    } catch (err) {
      console.error('Load favorites failed:', err);
      setFavorites([]);
      alert(`Không tải được danh sách yêu thích: ${err.message}`);
    } finally {
      setLoadingFavorites(false);
    }
  }

  async function openFavoritesView() {
    setActiveView('favorites');
    await loadFavorites();
  }

  const initials = (currentUser?.name || 'U').charAt(0).toUpperCase();
  const heroGenres = movieGenres(heroMovie).split('|').filter(Boolean).slice(0, 2);
  const heroPoster = heroMovie ? (isValidPosterUrl(heroMovie.poster_url) ? heroMovie.poster_url : getPlaceholderByGenre(movieGenres(heroMovie))) : '';

  return (
    <div id="page-app" className="page active">
      <header className="app-nav">
        <div className="app-logo">🎬 <span>CINÉRECOM</span></div>
        <nav className="app-links">
          <a
            className={`nav-link ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => setActiveView('home')}
          >
            Trang chủ
          </a>

          <a
            className={`nav-link ${activeView === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveView('discover')}
          >
            Khám phá
          </a>

          <a
            className={`nav-link ${activeView === 'favorites' ? 'active' : ''}`}
            onClick={openFavoritesView}
          >
            Danh sách
          </a>
        </nav>
        <div className="app-user">
          <div className="search-btn" onClick={() => setSearchOpen((prev) => !prev)}>🔍</div>
          <div className="user-avatar" onClick={() => setUserMenuOpen((prev) => !prev)}>{initials}</div>
          <div className={`user-menu ${userMenuOpen ? 'open' : ''}`}>
            <div className="user-menu-info"><p>{currentUser?.name || 'Người dùng'}</p><p className="menu-email">{currentUser?.email || `ID: ${currentUser?.id || '—'}`}</p></div>
            <div className="menu-div" />
            <a>📋 Danh sách của tôi</a>
            <a>⚙️ Cài đặt</a>
            <div className="menu-div" />
            <a className="menu-logout" onClick={() => { setCurrentUser(null); setPage('landing'); }}>← Đăng xuất</a>
          </div>
        </div>
      </header>

      <div className={`search-bar-wrap ${searchOpen ? 'open' : ''}`}>
        <input
          type="text"
          className="search-bar"
          placeholder="Tìm phim theo tên..."
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <main className="app-main">
        {activeView === 'favorites' ? (
          <section className="movie-section">
            <div className="section-header">
              <h3 className="section-title-app">Danh sách yêu thích của tôi</h3>
              <span className="section-view-all">
                {favorites.length} phim
              </span>
            </div>

            {loadingFavorites ? (
              <div className="movies-scroll">
                <SkeletonRow count={6} />
              </div>
            ) : favorites.length > 0 ? (
              <div className="movies-grid">
                {favorites.map((movie) => (
                  <MovieGridCard
                    key={`${movie.movie_id}-favorite`}
                    movie={movie}
                    onOpen={setModalMovie}
                  />
                ))}
              </div>
            ) : (
              <p className="loading-hint">
                Bạn chưa thêm phim nào vào danh sách yêu thích.
              </p>
            )}
          </section>
        ) : (
          <>
            <section className="hero-banner">
              <div
                className="hero-banner-bg"
                style={heroMovie ? {
                  backgroundImage: `url('${heroPoster}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!heroMovie ? (
                  <div className="hero-banner-placeholder">
                    <span className="hero-poster-emoji">🎬</span>
                  </div>
                ) : null}
                <div className="hero-banner-overlay" />
              </div>

              <div className="hero-banner-content">
                <div className="hero-badge">✦ GỢI Ý CHO BẠN</div>
                <h2 className="hero-movie-title">
                  {heroMovie ? movieTitle(heroMovie) : 'Tên Bộ Phim Nổi Bật'}
                </h2>

                <div className="hero-movie-meta">
                  <span className="hero-rating">
                    {heroMovie ? displayScore(heroMovie.score) : '★ 8.5'}
                  </span>
                  <span>{heroMovie?.year || heroMovie?.release_year || '—'}</span>
                  <span>{heroMovie?.runtime || heroMovie?.duration || '— phút'}</span>
                  {heroGenres.map((genre) => (
                    <span className="hero-genre-tag" key={genre}>{genre}</span>
                  ))}
                </div>

                <p className="hero-desc">
                  {heroMovie
                    ? `Bộ phim ${movieGenres(heroMovie)} đang chờ bạn khám phá. Nhấn "Xem ngay" để xem thông tin.`
                    : 'Mô tả ngắn về bộ phim sẽ hiển thị ở đây sau khi kết nối database.'}
                </p>

                <div className="hero-actions">
                  <button className="btn-play" onClick={() => heroMovie && setModalMovie(heroMovie)}>
                    ▶ Xem ngay
                  </button>
                  <button className="btn-info" onClick={() => heroMovie && setModalMovie(heroMovie)}>
                    ℹ Thông tin
                  </button>
                  <button
                    className="btn-add-list"
                    onClick={() => heroMovie && handleAddFavorite(heroMovie)}
                  >
                    + Danh sách
                  </button>
                </div>
              </div>
            </section>

            <section className="movie-section">
              <div className="section-header">
                <h3 className="section-title-app">Gợi ý riêng cho bạn</h3>
                <span className="section-view-all">Xem tất cả →</span>
              </div>
              <div className="movies-scroll">
                {loadingRecommended ? (
                  <SkeletonRow />
                ) : (
                  recommended.map((movie) => (
                    <MovieThumb
                      key={`${movie.movie_id}-${movieTitle(movie)}`}
                      movie={movie}
                      onOpen={setModalMovie}
                    />
                  ))
                )}
              </div>
              {hint ? <p className="loading-hint">{hint}</p> : null}
            </section>

            <section className="movie-section">
              <div className="section-header">
                <h3 className="section-title-app">Đang thịnh hành</h3>
                <span className="section-view-all">Xem tất cả →</span>
              </div>
              <div className="movies-scroll">
                {loadingTrending ? (
                  <SkeletonRow count={6} />
                ) : (
                  trending.map((movie, index) => (
                    <MovieThumb
                      key={`${movie.movie_id}-trending`}
                      movie={movie}
                      rank={index + 1}
                      onOpen={setModalMovie}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="movie-section">
              <div className="section-header">
                <h3 className="section-title-app">Theo thể loại yêu thích</h3>
              </div>
              <div className="genre-filter-row">
                {userGenres.map((id) => {
                  const genre = genreById(id);
                  return (
                    <button
                      key={id}
                      className={`genre-filter-btn ${activeGenre === id ? 'active' : ''}`}
                      onClick={() => setActiveGenre(id)}
                    >
                      {genre.emoji} {genre.label}
                    </button>
                  );
                })}
              </div>
              <div className="movies-scroll">
                {genreMovies.map((movie) => (
                  <MovieThumb
                    key={`${movie.movie_id}-genre`}
                    movie={movie}
                    onOpen={setModalMovie}
                  />
                ))}
              </div>
            </section>

            <section className="movie-section">
              <div className="section-header">
                <h3 className="section-title-app">Mới nhất</h3>
                <span className="section-view-all">Xem tất cả →</span>
              </div>
              <div className="movies-grid">
                {newMovies.map((movie) => (
                  <MovieGridCard
                    key={`${movie.movie_id}-new`}
                    movie={movie}
                    onOpen={setModalMovie}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <MovieModal
        movie={modalMovie}
        onClose={() => setModalMovie(null)}
        onAddFavorite={handleAddFavorite}
        onRateMovie={handleRateMovie}
      />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    window.quickTestAPI = async () => {
      console.log('===== QUICK API TEST =====');
      try {
        console.log('GET /movies OK:', await apiFetch('/movies?limit=5&offset=0'));
      } catch (err) {
        console.error('GET /movies FAILED:', err.message);
      }
      try {
        console.log('POST /recommend/new-user OK:', await apiFetch('/recommend/new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genres: ['Action', 'Drama'], top_n: 5, alpha: 0.7 })
        }));
      } catch (err) {
        console.error('POST /recommend/new-user FAILED:', err.message);
      }
      try {
        console.log('POST /recommend/old-user OK:', await apiFetch('/recommend/old-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 1, top_n: 5 })
        }));
      } catch (err) {
        console.error('POST /recommend/old-user FAILED:', err.message);
      }
      console.log('===== END QUICK API TEST =====');
    };
  }, []);

  if (page === 'login') return <LoginPage setPage={setPage} setCurrentUser={setCurrentUser} />;
  if (page === 'register') return <RegisterPage setPage={setPage} setCurrentUser={setCurrentUser} />;
  if (page === 'app' && currentUser) return <AppPage currentUser={currentUser} setCurrentUser={setCurrentUser} setPage={setPage} />;
  return <LandingPage setPage={setPage} />;
}
