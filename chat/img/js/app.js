// DOM Elements
const fileInput = document.getElementById('file-input');
const gallery = document.getElementById('gallery');
const infoModal = document.getElementById('infoModal');
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const imageInfo = document.getElementById('imageInfo');
const closeBtn = document.querySelector('.close-btn');
const submitInfoBtn = document.getElementById('submitInfoBtn');
const closeInfoModal = document.getElementById('closeInfoModal');
let currentImageData;

function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
fileInput.addEventListener('change', handleFileSelect);
closeBtn.addEventListener('click', closeModal);
closeInfoModal.addEventListener('click', closeInfoModalHandler);
submitInfoBtn.addEventListener('click', submitImageInfo);

// Khởi tạo ứng dụng
function initApp() {
    loadImagesFromServer();
    setupModalClose();
}

// Tải danh sách ảnh từ server
function loadImagesFromServer() {
    fetch('https://backend-oik0.onrender.com/api/library/images')
        .then(response => response.json())
        .then(images => {
            gallery.innerHTML = '';
            images.forEach(image => {
                createImageCard(image.url, image.id, image);
            });
        })
        .catch(error => console.error('Lỗi tải ảnh:', error));
}

// Xử lý khi người dùng chọn file
function handleFileSelect(event) {
    const files = event.target.files;
    
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                currentImageData = e.target.result;
                showInfoModal();
            }
            
            reader.readAsDataURL(file);
        }
    }
}

// Tạo thẻ ảnh trong gallery
function createImageCard(imageUrl, imageId, metadata) {
    const container = document.createElement('div');
    container.className = 'image-container';
    container.dataset.imageId = imageId;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.loading = "lazy"; // Tải ảnh lazy load

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteImage(imageId);
    };

    container.appendChild(img);
    container.appendChild(deleteBtn);
    gallery.appendChild(container);

    container.addEventListener('click', () => showImageModal(imageId, metadata));
}

// Hiển thị modal nhập thông tin ảnh
function showInfoModal() {
    infoModal.style.display = "flex";
    document.getElementById('authorInput').value = '';
    document.getElementById('sourceInput').value = '';
    document.getElementById('messageInput').value = '';
}

// Đóng modal nhập thông tin
function closeInfoModalHandler() {
    infoModal.style.display = "none";
    fileInput.value = ''; // Reset file input
}

// Đóng modal xem ảnh
function closeModal() {
    modal.style.display = "none";
}

// Thiết lập sự kiện đóng modal
function setupModalClose() {
    window.addEventListener('click', function(event) {
        if (event.target === modal) modal.style.display = "none";
        if (event.target === infoModal) closeInfoModalHandler();
    });
}

function submitImageInfo() {
    const metadata = {
        author: document.getElementById('authorInput').value || 'Ẩn danh',
        source: document.getElementById('sourceInput').value || 'Không rõ nguồn',
        message: document.getElementById('messageInput').value || '',
    };

    if (!selectedFile) {
        alert("Chưa chọn ảnh!");
        return;
    }

    closeInfoModalHandler();

    uploadImageToServer(selectedFile, metadata)
        .then(data => {
            createImageCard(data.url, data.id, data);

            document.getElementById('authorInput').value = '';
            document.getElementById('sourceInput').value = '';
            document.getElementById('messageInput').value = '';
            document.getElementById('fileInput').value = '';
            selectedFile = null;
        })
        .catch(error => {
            console.error('Lỗi tải lên ảnh:', error);
            alert('Có lỗi xảy ra khi tải ảnh lên');
        });
}



async function uploadImageToServer(file, metadata) {
    const formData = new FormData();
    formData.append("image", file); 
    formData.append("author", metadata.author);
    formData.append("source", metadata.source);
    formData.append("message", metadata.message);

    const res = await fetch("https://backend-oik0.onrender.com/api/library/upload", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    return res.json();
}

// Xóa ảnh
async function deleteImage(imageId) {
    try {
        const response = await fetch(`https://backend-oik0.onrender.com/api/library/images/${imageId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            document.querySelector(`.image-container[data-image-id="${imageId}"]`)?.remove();
        } else {
            console.error('Lỗi khi xóa ảnh');
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

// Hiển thị modal ảnh
function showImageModal(imageId, metadata) {
    const imageContainer = document.querySelector(`.image-container[data-image-id="${imageId}"]`);
    const imgSrc = imageContainer?.querySelector('img')?.src;
    
    if (imgSrc) {
        modalImage.src = imgSrc;
        renderImageInfo(metadata);
        modal.style.display = "block";
    }
}

// Hiển thị thông tin ảnh trong modal
function renderImageInfo(metadata) {
    imageInfo.innerHTML = `
        <div class="info-item">
            <div class="info-label">Tác giả:</div>
            <div class="info-value">${metadata.author || "Ẩn danh"}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Ngày tải lên:</div>
            <div class="info-value">${new Date(metadata.timestamp).toLocaleString()}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Nguồn:</div>
            <div class="info-value">${metadata.source || "Không rõ nguồn"}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Ghi chú:</div>
            <div class="info-value">${metadata.message || "Không có ghi chú"}</div>
        </div>
    `;
}

// Chuyển đổi Data URL thành Blob
function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

// Ngăn chặn click phải
document.addEventListener("contextmenu", function(e) {
    e.preventDefault();
});
