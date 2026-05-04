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
const API_BASE_URL = "http://127.0.0.1:8000"; // Thay đổi theo port của bạn


let userType=null, selectedGenres=[], currentUser=null;

// Khởi tạo grid thể loại
document.getElementById('genre-grid').innerHTML = GENRES.map(g =>
    `<div class="genre-pill" id="gp-${g.id}" onclick="toggleGenre('${g.id}')">
    <span class="emoji">${g.emoji}</span>${g.label}
  </div>`
).join('');

function selectType(t){
    userType=t;
    document.getElementById('btn-old').classList.toggle('selected',t==='old');
    document.getElementById('btn-new').classList.toggle('selected',t==='new');
    document.getElementById('old-form').style.display=t==='old'?'block':'none';
    updateContinueBtn();
}

function updateContinueBtn(){
    const btn=document.getElementById('btn-continue');
    if(userType==='new'){btn.disabled=false;return;}
    if(userType==='old'){const v=parseInt(document.getElementById('user-id-input').value);btn.disabled=!(v>=1&&v<=6040);}
    else btn.disabled=true;
}

async function handleContinue() {
    if (userType === 'new') {
        showScreen('screen-genres');
        return;
    }

    const userId = parseInt(document.getElementById('user-id-input').value);
    if (!(userId >= 1 && userId <= 6040)) {
        document.getElementById('id-error').style.display = 'block';
        return;
    }
    document.getElementById('id-error').style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/recommend/old-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, top_n: 10 })
        });

        if (!response.ok) throw new Error('Không tìm thấy người dùng');

        const data = await response.json();
        
        // Cấu trúc lại dữ liệu để hiển thị Dashboard
        currentUser = {
            id: data.user_id,
            name: `User #${data.user_id}`,
            isNew: false,
            recommendations: data.items // Lưu lại phim từ API
        };

        showDashboard();
    } catch (err) {
        alert("Lỗi: " + err.message);
    }
}

function toggleGenre(id){
    const el=document.getElementById('gp-'+id);
    if(selectedGenres.includes(id)){selectedGenres=selectedGenres.filter(g=>g!==id);el.classList.remove('selected');}
    else{selectedGenres.push(id);el.classList.add('selected');}
    document.getElementById('count-display').textContent=selectedGenres.length;
}

async function handleGenreContinue() {
    if (selectedGenres.length < 3) {
        document.getElementById('genre-error').style.display = 'block';
        return;
    }
    document.getElementById('genre-error').style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/recommend/new-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                genres: selectedGenres, 
                top_n: 10,
                alpha: 0.7 
            })
        });

        const data = await response.json();

        currentUser = {
            name: 'Khách mới',
            genres: selectedGenres,
            isNew: true,
            recommendations: data.items // Lưu lại phim từ API
        };

        showDashboard();
    } catch (err) {
        alert("Không thể kết nối API người dùng mới");
    }
}

function showDashboard() {
    // ... Giữ nguyên phần xử lý Avatar và Badge ...

    // Hiển thị phim gợi ý từ API
    const movieRow = document.getElementById('movie-row');
    if (currentUser.recommendations && currentUser.recommendations.length > 0) {
        movieRow.innerHTML = currentUser.recommendations.map(m => `
            <div class="movie-card">
                <div class="poster">🎬</div>
                <div class="movie-info">
                    <div class="movie-title">${m.title}</div>
                    <div class="movie-meta">${m.genres}</div>
                    
                </div>
                
            </div>`).join('');
    } else {
        movieRow.innerHTML = `<p style="text-align:center; color:var(--text-muted)">Không có gợi ý nào.</p>`;
    }

    // Phần Trending có thể giữ nguyên hoặc gọi thêm API khác nếu có
    showScreen('screen-dash');
}

function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goBack(){
    userType=null;selectedGenres=[];currentUser=null;
    document.getElementById('btn-old').classList.remove('selected');
    document.getElementById('btn-new').classList.remove('selected');
    document.getElementById('old-form').style.display='none';
    document.getElementById('user-id-input').value='';
    document.getElementById('btn-continue').disabled=true;
    document.getElementById('genres-display-wrap').style.display='none';
    document.getElementById('count-display').textContent='0';
    document.querySelectorAll('.genre-pill').forEach(p=>p.classList.remove('selected'));
    showScreen('screen-choose');
}