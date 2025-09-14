const API_BASE = "https://backend-oik0.onrender.com"; 
let token = localStorage.getItem("music_token") || null;
let isLicensed = localStorage.getItem("licensedAccess") === "1";
let songs = [];
let isPlaying = false;
let searchTimer = null;

const $ = id => document.getElementById(id);

const setMsg = txt => {
  const m = $('messages');
  if (m) m.textContent = txt || '';
};

const fmtTime = (s = 0) => {
  s = Math.floor(s || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2,'0')}`;
};

const safeJson = async (res) => {
  try { return await res.json(); } catch { return null; }
};

function saveToken(t) {
  token = t || null;
  if (token) {
    localStorage.setItem("music_token", token);
    localStorage.setItem("licensedAccess", "1");
    isLicensed = true;
  } else {
    localStorage.removeItem("music_token");
    localStorage.removeItem("licensedAccess");
    isLicensed = false;
  }
}

async function loadLicensedCatalog() {
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/catalog?t=${encodeURIComponent(token)}`);
    if (!res.ok) {
      saveToken(null);
      setMsg("Token không hợp lệ hoặc hết hạn. Vui lòng nhập lại mật khẩu.");
      return false;
    }
    const data = await safeJson(res);
    if (!data || !Array.isArray(data.licensedSongs)) return false;

    songs = [...data.licensedSongs, ...freeSongs];
    return true;
  } catch (err) {
    console.error("loadLicensedCatalog error", err);
    setMsg("Không thể tải kho nhạc bản quyền.");
    return false;
  }
}


document.addEventListener('DOMContentLoaded', async function () {
    const audio = document.getElementById('audio');
    const playButton = document.getElementById('play-button');
    const seekBar = document.querySelector('.seek-bar');
    const usernameInput = document.getElementById('username');
    const songTitleElement = document.getElementById('song-title');
    const avatar = document.getElementById('avatar');
    const avatarInput = document.getElementById('avatar-input');
    const currentTimeSpan = document.getElementById('current-time');
    const totalTimeSpan = document.getElementById('total-time');
    const musicPlayer = document.querySelector('.music-player'); // Get the player element
    const playerContainer = document.querySelector('.player-container'); // Lấy container mới

    // Get all elements that should change color with primary-color
    const controlButtons = document.querySelectorAll('.control-button');
    const searchIcon = document.querySelector('.search-icon');
    const settingsIcon = document.querySelector('.settings-icon');

    // Thêm các biến mới cho avatar placeholder
    const avatarWrapper = document.querySelector('.avatar-wrapper');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');


    const freeSongs = [
        { title: "Bad Apple", artist: "Touhou", src: "music/Bad Apple.mp3" },
        { title: "LAST NIGHT", artist: "BLACKLIONS", src: "music/LAST NIGHT.mp3" }
];
    let currentSongIndex = 0;
    songs = [...freeSongs];
    if (isLicensed && token) {
        await loadLicensedCatalog();
    }
function renderSuggestions(q) {
  const query = (q || '').toLowerCase();
  songSuggestions.innerHTML = '';

  const list = songs.filter(s =>
    s.title.toLowerCase().includes(query) ||
    (s.artist && s.artist.toLowerCase().includes(query))
  );

  if (list.length === 0) {
    const no = document.createElement('div');
    no.className = 'song-item';
    no.textContent = 'Không tìm thấy bài hát.';
    songSuggestions.appendChild(no);
    return;
  }

  list.forEach((s) => {
    const i = songs.indexOf(s);
    const div = document.createElement('div');
    div.className = 'song-item';
    div.textContent = `${s.title}${s.artist ? ' - ' + s.artist : ''}`;
    div.onclick = () => { currentIndex = i; playAtIndex(i); };
    songSuggestions.appendChild(div);
  });

  const badge = $('accessBadge');
  if (badge) badge.textContent = `Chế độ: ${isLicensed ? 'Licensed' : 'Free'}`;
}
});

    // --- Audio Playback Controls ---
    playButton.addEventListener('click', function() {
        if (audio.paused) {
            audio.play();
            playButton.innerHTML = '<i class="fas fa-pause"></i>'; // Change to pause icon
        } else {
            audio.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>'; // Change to play icon
        }
    });

    audio.addEventListener('timeupdate', function() {
        if (!isNaN(audio.duration) && audio.duration > 0) { // Ensure duration is a valid number and not zero
            const progress = (audio.currentTime / audio.duration) * 100;
            seekBar.value = progress;
            seekBar.style.setProperty('--progress', `${progress}%`); // Update CSS variable for fill
            currentTimeSpan.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener('loadedmetadata', function() {
        if (!isNaN(audio.duration) && audio.duration > 0) {
            totalTimeSpan.textContent = formatTime(audio.duration);
            // Update song title from the currently loaded audio
            songTitleElement.textContent = songs[currentSongIndex].title;
        } else {
            totalTimeSpan.textContent = "0:00"; // Handle cases where duration is not available
        }
    });

    audio.addEventListener('ended', function() {
        playButton.innerHTML = '<i class="fas fa-play"></i>'; // Reset to play icon when song ends
        audio.currentTime = 0; // Reset playback to start
        seekBar.value = 0;
        seekBar.style.setProperty('--progress', `0%`);
        // Automatically play next song if available
        if (songs.length > 1) {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            playCurrentSong();
        }
    });

    audio.onerror = function() {
        console.error("Error loading audio:", audio.error);
        alert("Không thể tải bài hát. Vui lòng kiểm tra đường dẫn file hoặc kết nối mạng.");
        playButton.innerHTML = '<i class="fas fa-play"></i>'; // Reset button
    };

    seekBar.addEventListener('input', function() {
        if (!isNaN(audio.duration) && audio.duration > 0) {
            const seekTime = (seekBar.value / 100) * audio.duration;
            audio.currentTime = seekTime;
        }
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --- User Info (Avatar & Username) ---
    avatar.addEventListener('click', function() {
        avatarInput.click(); // Trigger file input click
    });

    // Thêm sự kiện click cho avatar-placeholder
    avatarPlaceholder.addEventListener('click', function() {
        avatarInput.click(); // Trigger file input click
    });

    avatarInput.addEventListener('change', function() {
        const file = avatarInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                avatar.src = e.target.result; // Update avatar image
                localStorage.setItem('userAvatar', e.target.result); // Save to local storage
                updateAvatarDisplay(); // Cập nhật hiển thị sau khi tải ảnh
            }
            reader.readAsDataURL(file);
        }
    });

    usernameInput.addEventListener('change', function() {
        localStorage.setItem('username', usernameInput.value); // Save username to local storage
    });

    // Hàm mới để quản lý hiển thị avatar và placeholder
    function updateAvatarDisplay() {
        const savedAvatar = localStorage.getItem('userAvatar');
        // Kiểm tra nếu không có avatar đã lưu HOẶC avatar là ảnh mặc định (avatar.jpg)
        // Bạn cần đảm bảo 'avatar.jpg' là đường dẫn chính xác đến ảnh mặc định của bạn
        if (!savedAvatar || savedAvatar.includes('avatar.jpg')) {
            avatar.src = 'avatar.jpg'; // Đảm bảo ảnh mặc định được hiển thị
            avatarPlaceholder.classList.add('show'); // Hiển thị placeholder
            avatar.style.opacity = '0'; // Ẩn ảnh avatar đi
        } else {
            avatar.src = savedAvatar;
            avatarPlaceholder.classList.remove('show'); // Ẩn placeholder
            avatar.style.opacity = '1'; // Hiển thị ảnh avatar
        }
    }

    // Load saved user info on startup
    function loadUserInfo() {
        const savedUsername = localStorage.getItem('username');
        if (savedUsername) {
            usernameInput.value = savedUsername;
        }
        updateAvatarDisplay(); // Gọi hàm này để xử lý hiển thị avatar/placeholder khi tải trang
    }
    loadUserInfo();

    // --- Search Functionality ---
    const searchToggle = document.getElementById('search-toggle');
    const searchBox = document.getElementById('search-box');
    const searchInput = document.getElementById('search-input');
    const songSuggestions = document.getElementById('song-suggestions');

    function hideSearch() {
        searchBox.classList.remove('show');
        musicPlayer.classList.remove('blurred'); // Bỏ làm mờ trình phát nhạc
        // Sử dụng timeout để ẩn display: none sau khi animation hoàn tất
        setTimeout(() => {
            searchBox.style.display = 'none';
        }, 300); // Phù hợp với transition-speed trong CSS
    }

    function showSearch() {
        hideSettings(); // Đảm bảo cài đặt đóng khi mở tìm kiếm

        // Lấy vị trí và kích thước của musicPlayer TƯƠNG ĐỐI VỚI playerContainer
        const playerRect = musicPlayer.getBoundingClientRect();
        const containerRect = playerContainer.getBoundingClientRect();

        // Tính toán top và left tương đối với playerContainer
        const topOffset = playerRect.bottom - containerRect.top + 10; // 10px khoảng cách
        const leftOffset = playerRect.left - containerRect.left;

        // Đặt vị trí và kích thước của searchBox
        searchBox.style.width = `${playerRect.width}px`;
        searchBox.style.left = `${leftOffset}px`;
        searchBox.style.top = `${topOffset}px`; 

        searchBox.style.display = 'flex'; // Hiển thị trước để animation hoạt động
        // Force reflow để đảm bảo transition chơi
        searchBox.offsetWidth; 
        searchBox.classList.add('show');
        musicPlayer.classList.add('blurred'); // Làm mờ trình phát nhạc
        searchInput.focus();
        renderSongSuggestions(''); // Show all songs initially
    }

    searchToggle.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent click from closing panel immediately
        if (searchBox.classList.contains('show')) { // If currently visible
            hideSearch();
        } else {
            showSearch();
        }
    });

searchInput.addEventListener('input', () => {
    const raw = searchInput.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        // Nếu gõ /lock thì khoá lại
        if (raw.toLowerCase() === '/lock') {
            saveToken(null);
            songs = [...freeSongs];
            renderSongSuggestions('');
            searchInput.value = '';
            alert('Đã khóa kho nhạc bản quyền.');
            return;
        }

        // Nếu chưa unlock → thử login
        if (!isLicensed && raw.length > 0) {
            try {
                const resp = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: raw })
                });
                if (resp.ok) {
                    const j = await resp.json();
                    if (j && j.token) {
                        saveToken(j.token);
                        searchInput.value = '';
                        alert('Đã mở kho nhạc bản quyền!');
                        const ok = await loadLicensedCatalog();
                        if (ok) renderSongSuggestions('');
                        return;
                    }
                }
            } catch (err) {
                console.error('login error', err);
            }
        }

        // Nếu chỉ là tìm kiếm nhạc
        renderSongSuggestions(raw.toLowerCase());
    }, 300);
});


    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const firstSuggestion = songSuggestions.querySelector('.song-item');
            if (firstSuggestion) {
                firstSuggestion.click(); // Simulate click on the first suggestion
            }
            // hideSearch() is called by the click event on song-item,
            // or we can call it here if no song is selected.
            if (!firstSuggestion) {
                hideSearch();
            }
        }
    });


    // --- Settings Panel Functionality ---
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const colorOptions = document.querySelectorAll('.color-option');
    const customColorPicker = document.getElementById('custom-color-picker');
    const bgOptions = document.querySelectorAll('.bg-option');
    const bgUpload = document.getElementById('bg-upload');
    const bgUploadBtn = document.querySelector('.bg-upload-btn');
    // Removed transparencyCheckbox and blurEffectCheckbox

    function hideSettings() {
        settingsPanel.classList.remove('show');
        musicPlayer.classList.remove('blurred'); // Bỏ làm mờ trình phát nhạc
        // Use a timeout to allow animation to complete before hiding display
        setTimeout(() => {
            settingsPanel.style.display = 'none';
        }, 300); // Match CSS transition duration
    }

    function showSettings() {
        hideSearch(); // Đảm bảo tìm kiếm đóng khi mở cài đặt

        // Lấy vị trí và kích thước của musicPlayer TƯƠNG ĐỐI VỚI playerContainer
        const playerRect = musicPlayer.getBoundingClientRect();
        const containerRect = playerContainer.getBoundingClientRect();

        // Tính toán top và left tương đối với playerContainer
        const topOffset = playerRect.bottom - containerRect.top + 10; // 10px khoảng cách
        const leftOffset = playerRect.left - containerRect.left;

        // Đặt vị trí và kích thước của settingsPanel
        settingsPanel.style.width = `${playerRect.width}px`;
        settingsPanel.style.left = `${leftOffset}px`;
        settingsPanel.style.top = `${topOffset}px`; 

        settingsPanel.style.display = 'flex'; // Hiển thị trước để animation hoạt động
        // Force reflow để đảm bảo transition plays
        settingsPanel.offsetWidth; 
        settingsPanel.classList.add('show');
        musicPlayer.classList.add('blurred'); // Làm mờ trình phát nhạc
    }

    settingsToggle.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent click from closing panel immediately
        if (settingsPanel.classList.contains('show')) { // Check for 'show' class
            hideSettings();
        } else {
            showSettings();
        }
    });

    // Close panels when clicking outside
    document.addEventListener('click', function(e) {
        // Check if the click is outside the music player, search box, and settings panel
        const isClickInsideSearchBox = searchBox.contains(e.target);
        const isClickInsideMusicPlayer = musicPlayer.contains(e.target);
        const isClickInsideSettingsPanel = settingsPanel.contains(e.target);
        const isClickInsidePlayerContainer = playerContainer.contains(e.target); // Kiểm tra click trong container

        // Nếu click không nằm trong bất kỳ phần tử nào trong số này, thì ẩn chúng
        // Hoặc nếu click nằm trong playerContainer nhưng không phải là musicPlayer, searchBox, settingsPanel
        if (!isClickInsideSearchBox && !isClickInsideSettingsPanel && !isClickInsideMusicPlayer) {
            hideSearch();
            hideSettings();
        }
    });

    // Function to update icon colors based on primary color
    function updateIconColors(color) {
        playButton.style.color = color;
        playButton.style.borderColor = color; 
        controlButtons.forEach(button => {
            button.style.color = color;
        });
        searchIcon.style.color = color;
        settingsIcon.style.color = color;
        usernameInput.style.color = color;
        songTitleElement.style.color = color;
    }

    // Color Picker
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            let colorValue;
            if (option.classList.contains('custom-color')) {
                colorValue = customColorPicker.value;
            } else {
                // Get color from data-color attribute or style.backgroundColor
                // Use getComputedStyle for CSS variables
                colorValue = this.dataset.color ? getComputedStyle(document.documentElement).getPropertyValue(this.dataset.color).trim() : this.style.backgroundColor;
            }
            
            document.documentElement.style.setProperty('--primary-color', colorValue);
            localStorage.setItem('primaryColor', colorValue);
            // Also update the border color of the music player and avatar
            musicPlayer.style.borderColor = colorValue;
            avatar.style.borderColor = colorValue;
            updateIconColors(colorValue); // Update icon colors
        });
    });

    customColorPicker.addEventListener('change', function() {
        const customOption = document.querySelector('.color-option.custom-color');
        customOption.style.backgroundColor = this.value;
        customOption.click(); // Simulate click to apply and select
    });

    // Background Selector
    bgUploadBtn.addEventListener('click', () => bgUpload.click());
    
    bgUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const bgURL = URL.createObjectURL(this.files[0]);
            musicPlayer.style.backgroundImage = `url("${bgURL}")`; // Ensure quotes for URL
            localStorage.setItem('playerBackground', `url("${bgURL}")`); // Store with url()
            bgOptions.forEach(b => b.classList.remove('selected')); // Deselect pre-defined backgrounds
        }
    });
    
    bgOptions.forEach(bg => {
        bg.addEventListener('click', function() {
            bgOptions.forEach(b => b.classList.remove('selected'));
            bg.classList.add('selected');
            const bgImage = bg.style.backgroundImage;
            musicPlayer.style.backgroundImage = bgImage;
            localStorage.setItem('playerBackground', bgImage); // Store as is (url("..."))
        });
    });

    // --- Load Saved Settings on Startup ---
    function loadSettings() {
        // Load Primary Color
        const savedPrimaryColor = localStorage.getItem('primaryColor');
        if (savedPrimaryColor) {
            document.documentElement.style.setProperty('--primary-color', savedPrimaryColor);
            musicPlayer.style.borderColor = savedPrimaryColor; // Apply to player border
            avatar.style.borderColor = savedPrimaryColor; // Apply to avatar border
            updateIconColors(savedPrimaryColor); // Apply to icons on load

            let foundColorOption = false;
            colorOptions.forEach(opt => {
                opt.classList.remove('selected');
                // Check if the saved color matches a predefined option or the custom color
                if (opt.dataset.color && getComputedStyle(document.documentElement).getPropertyValue(opt.dataset.color).trim() === savedPrimaryColor) {
                    opt.classList.add('selected');
                    foundColorOption = true;
                }
            });
            // If not a predefined color, check if it's the custom color
            if (!foundColorOption) {
                const customOpt = document.querySelector('.color-option.custom-color');
                customOpt.classList.add('selected');
                customColorPicker.value = savedPrimaryColor;
                customOpt.style.backgroundColor = savedPrimaryColor;
            }
        }

        // Load Background
        const savedBackground = localStorage.getItem('playerBackground');
        if (savedBackground) {
            musicPlayer.style.backgroundImage = savedBackground;
            bgOptions.forEach(b => {
                b.classList.remove('selected');
                if (b.style.backgroundImage === savedBackground) {
                    b.classList.add('selected');
                }
            });
        }
    }
    loadSettings();

    // --- Playlist Navigation (Prev/Next) ---
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    prevButton.addEventListener('click', function() {
        if (songs.length === 0) return;
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        playCurrentSong();
    });

    nextButton.addEventListener('click', function() {
        if (songs.length === 0) return;
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        playCurrentSong();
    });

function playCurrentSong() {
    if (songs.length === 0) {
        songTitleElement.textContent = "Không có bài hát";
        audio.src = "";
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        return;
    }

    const song = songs[currentSongIndex];
    if (!song) return;

    // Nếu là bài bản quyền (có id + token)
    if (song.id && isLicensed && token) {
        audio.src = `${API_BASE}/api/stream/${encodeURIComponent(song.id)}?t=${encodeURIComponent(token)}`;
    }
    // Nếu là nhạc free
    else if (song.src && !song.id) {
        audio.src = song.src;
    }
    // Nếu có src nội bộ và licensed
    else if (song.src && isLicensed && token) {
        audio.src = `${API_BASE}/api/stream-local?path=${encodeURIComponent(song.src)}&t=${encodeURIComponent(token)}`;
    }
    else {
        console.warn("Bài không khả dụng:", song);
        songTitleElement.textContent = "Không thể phát bài này";
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        return;
    }

    // Cập nhật tiêu đề
    songTitleElement.textContent = song.title;

    // Load và phát nhạc
    audio.load();
    audio.play().then(() => {
        playButton.innerHTML = '<i class="fas fa-pause"></i>';
    }).catch(error => {
        console.error("Error playing audio:", error);
        alert("Không thể phát bài hát. Trình duyệt có thể chặn tự động phát hoặc file bị lỗi.");
        playButton.innerHTML = '<i class="fas fa-play"></i>';
    });
}
