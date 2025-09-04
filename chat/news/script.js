const filterToggle = document.querySelector('.filter-toggle');
const filterSection = document.querySelector('.filter-section');

filterToggle.addEventListener('click', () => {
    filterSection.style.display = filterSection.style.display === 'none' ? 'flex' : 'none';
});


// Xử lý preview ảnh
const newsImage = document.getElementById('newsImage');
const mediaPreview = document.getElementById('mediaPreview');
let selectedFiles = [];

newsImage.addEventListener('change', function(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            selectedFiles.push(file);
            displayPreview(file);
        }
    });
});

function displayPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
                
        const img = document.createElement('img');
        img.src = e.target.result;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-preview';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            selectedFiles = selectedFiles.filter(f => f !== file);
            previewItem.remove();
        };
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        mediaPreview.appendChild(previewItem);
    };
    reader.readAsDataURL(file);
}

// Xử lý đăng tin
const newsForm = document.getElementById('newsForm');
const newsList = document.getElementById('newsList');

// Xử lý filter buttons
const filterButtons = document.querySelectorAll('.filter-button');
filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        const selectedCategory = this.textContent.toLowerCase();
        filterNewsByCategory(selectedCategory);
    });
});

function filterNewsByCategory(category) {
    fetch('https://backend-oik0.onrender.com/api/news')
        .then(res => res.json())
        .then(data => {
            const currentDate = new Date();
            let filtered = data.filter(news => {
                const newsDate = new Date(news.date);
                const diffDays = Math.ceil(Math.abs(currentDate - newsDate) / (1000 * 60 * 60 * 24));
                return diffDays <= 3;
            });

            if (category !== 'tất cả') {
                filtered = filtered.filter(n => n.category.toLowerCase() === category.toLowerCase());
            }

            newsList.innerHTML = '';
            filtered.forEach(news => {
                const item = createNewsElement(news);
                newsList.insertBefore(item, newsList.firstChild);
            });
        });
}

// Xử lý search
const searchBar = document.querySelector('.search-bar');
searchBar.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const newsItems = document.querySelectorAll('.news-item');
        
    newsItems.forEach(item => {
        const title = item.querySelector('.news-title').textContent.toLowerCase();
        const content = item.querySelector('.news-content').textContent.toLowerCase();
            
        if (title.includes(searchTerm) || content.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

function saveNews(newsItem) {
    const news = {
        id: Date.now(),
        title: newsItem.querySelector('.news-title').textContent,
        content: newsItem.querySelector('.news-content').textContent,
        category: document.getElementById('newsCategory').value,
        date: new Date().toISOString(),
        images: Array.from(newsItem.querySelectorAll('.news-image')).map(img => img.src),
        comments: [],
        likes: 0
    };

    let savedNews = JSON.parse(localStorage.getItem('news') || '[]');
    savedNews.push(news);
    localStorage.setItem('news', JSON.stringify(savedNews));
}

function loadNews() {
    const currentDate = new Date();

    // Lấy dữ liệu tin tức từ server
    fetch('https://backend-oik0.onrender.com/api/news')
        .then(response => response.json())
        .then(data => {
            // Lọc các bài viết đã quá 3 ngày
            const filteredNews = data.filter(news => {
                const newsDate = new Date(news.date);
                const diffTime = Math.abs(currentDate - newsDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 3;  // Chỉ lấy các bài viết trong vòng 3 ngày
            });

            // Hiển thị tin đã lọc
            newsList.innerHTML = '';
            filteredNews.forEach(news => {
                const newsItem = createNewsElement(news);
                newsList.insertBefore(newsItem, newsList.firstChild);
            });
        })
        .catch(error => {
            console.error('Error fetching news from backend:', error);
        });
}


    // Function tạo element tin tức
function createNewsElement(news) {
    const newsItem = document.createElement('div');
    newsItem.className = 'news-item';   
    newsItem.dataset.newsId = news.id;

    let imagesHTML = news.images.map(img => `<img src="${img}" class="news-image">`).join('');
    
    newsItem.innerHTML = `
        <div class="news-header">
            <h3 class="news-title">${news.title}</h3>
            <span class="news-date">${new Date(news.date).toLocaleDateString('vi-VN')}</span>
        </div>
        ${imagesHTML}
        <div class="news-content">${news.content}</div>
        <span class="read-more">Xem thêm</span>
        <div class="news-footer">
            <span class="news-author">Đăng bởi: ${news.author}</span>
            <span class="news-category">${news.category}</span>
            </div>
        </div>
    `;
    setTimeout(() => {
        const content = newsItem.querySelector('.news-content');
        const readMore = newsItem.querySelector('.read-more');
        // Kiểm tra nếu nội dung vượt quá chiều cao cho phép
        if (content.scrollHeight > 100) {
            readMore.style.display = 'inline-block';
            
            // Thêm gradient mờ ở cuối nội dung
            content.style.position = 'relative';
            content.style.maskImage = 'linear-gradient(to bottom, black 50%, transparent 100%)';
            content.style.webkitMaskImage = 'linear-gradient(to bottom, black 50%, transparent 100%)';
                
            readMore.addEventListener('click', () => {
                content.classList.toggle('expanded');
                if (content.classList.contains('expanded')) {
                    readMore.textContent = 'Thu gọn';
                    content.style.maskImage = 'none';
                    content.style.webkitMaskImage = 'none';
                } else {
                    readMore.textContent = 'Xem thêm';
                    content.style.maskImage = 'linear-gradient(to bottom, black 50%, transparent 100%)';
                    content.style.webkitMaskImage = 'linear-gradient(to bottom, black 50%, transparent 100%)';
                }
            });
        } else {
            readMore.style.display = 'none';
        }
    }, 100);
    return newsItem;
}

// Cập nhật xử lý form submit
newsForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const category = document.getElementById('newsCategory').value;
    const author = document.getElementById('newsAuthor').value || 'Anonymous';  

    if (!title || !content || !category) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category', category);
    formData.append('author', author);

    selectedFiles.forEach(file => formData.append('images', file));

    // Gửi dữ liệu đến backend
    fetch('https://backend-oik0.onrender.com/api/news', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('News added:', data);
        // Có thể thêm tin mới vào list nếu muốn
        const newsItem = createNewsElement(data);
        newsList.insertBefore(newsItem, newsList.firstChild);
    })
    .catch(error => {
        console.error('Error:', error);
    });
});



   // Load tin khi trang web được mở
window.addEventListener('load', loadNews);
        
    // Kiểm tra và xóa tin cũ mỗi giờ
setInterval(loadNews, 1000 * 60 * 60);

const addButton = document.querySelector('.add-button');
const postNews = document.querySelector('.post-news');
const overlay = document.createElement('div');
overlay.className = 'overlay';
document.body.appendChild(overlay);

addButton.addEventListener('click', () => {
    postNews.style.display = 'block';
    overlay.style.display = 'block';
});

overlay.addEventListener('click', () => {
    postNews.style.display = 'none';
    overlay.style.display = 'none';
});
const imageModal = document.createElement('div');
imageModal.className = 'image-modal';
document.body.appendChild(imageModal);
    // Xử lý click ảnh
document.addEventListener('click', function(e) {
if (e.target.classList.contains('news-image')) {
    const modalImg = document.createElement('img');
        modalImg.src = e.target.src;
        modalImg.className = 'modal-image';
        imageModal.innerHTML = '';
        imageModal.appendChild(modalImg);
        imageModal.style.display = 'block';
    }
});

// Đóng modal khi click
imageModal.addEventListener('click', function() {
    this.style.display = 'none';
});
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});
