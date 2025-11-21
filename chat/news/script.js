const filterToggle = document.querySelector('.filter-toggle');
const filterSection = document.querySelector('.filter-section');

filterToggle.addEventListener('click', () => {
    filterSection.style.display = filterSection.style.display === 'none' ? 'flex' : 'none';
});

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

const newsForm = document.getElementById('newsForm');
const newsList = document.getElementById('newsList');

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
    fetch('https://backend-1-m5tj.onrender.com/api/news')
        .then(res => res.json())
        .then(data => {
            const currentDate = new Date();
            let filtered = data.filter(news => {
                const newsDate = new Date(news.timestamp);
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
        timestamp: Date.now(),
        images: Array.from(newsItem.querySelectorAll('.news-image')).map(img => img.src),
        comments: [],
        likes: 0,
        author: document.getElementById('newsAuthor').value || 'Ẩn danh'
    };

    let savedNews = JSON.parse(localStorage.getItem('news') || '[]');
    savedNews.push(news);
    localStorage.setItem('news', JSON.stringify(savedNews));
}

function loadNews() {
    const currentDate = new Date();

    fetch('https://backend-oik0.onrender.com/api/news')
        .then(response => response.json())
        .then(data => {

            const filteredNews = data.filter(news => {
                const newsDate = new Date(news.timestamp);
                const diffTime = Math.abs(currentDate - newsDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 3;  
            });
            
            filteredNews.sort((a, b) => b.timestamp - a.timestamp);

            newsList.innerHTML = '';
            filteredNews.forEach(news => {
                const newsItem = createNewsElement(news);
                newsList.appendChild(newsItem, newsList.firstChild);
            });
        })
        .catch(error => {
            console.error('Error fetching news from backend:', error);
        });
}


    
function createNewsElement(news) {
    const newsItem = document.createElement('div');
    newsItem.className = 'news-item';   
    newsItem.dataset.newsId = news.id;

    const imagesArray = Array.isArray(news.images) ? news.images : [];
    let imagesHTML = imagesArray.map(img => `<img src="${img}" class="news-image">`).join('');

    
    newsItem.innerHTML = `
        <div class="news-header">
            <h3 class="news-title">${news.title}</h3>
            <span class="news-date">${new Date(news.timestamp).toLocaleDateString('vi-VN')}</span>
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
        if (content.scrollHeight > 100) {
            readMore.style.display = 'inline-block';
            
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

    fetch('https://backend-1-m5tj.onrender.com/api/news', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('News added:', data);
        if (data && !data.error) {
            const newsItem = createNewsElement(data);
            newsList.prepend(newsItem, newsList.firstChild);

            newsForm.reset();
            selectedFiles = [];
            mediaPreview.innerHTML = "";

            postNews.style.display = 'none';
            overlay.style.display = 'none';
        } else {
            console.error('Lỗi từ backend khi thêm news:', data.error || data);
            alert('Không thể đăng tin, vui lòng thử lại!');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});



window.addEventListener('load', loadNews);
        
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


imageModal.addEventListener('click', function() {
    this.style.display = 'none';
});
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});
