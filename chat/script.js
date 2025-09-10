const API_BASE = "https://backend-oik0.onrender.com";
let selectedFiles = [];

let user_id = localStorage.getItem("user_id");
if (!user_id) {
  user_id = "u-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
  localStorage.setItem("user_id", user_id);
}

document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    setInterval(loadNotes, 60000);
});
document.getElementById('submit-note').addEventListener('click', async function(event) {
    event.preventDefault();
    const noteInput = document.getElementById('note-input');
    noteInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    const noteText = noteInput.value.trim();
    if (noteText || selectedFiles.length > 0) {
        const noteId = Date.now();
        const timestamp = new Date().getTime();
        const mediaFiles = await Promise.all(selectedFiles.map(async file => {
            const base64 = await fileToBase64(file);
            return {
                type: file.type,
                data: base64
            };
        }));
        saveNoteToAPI(noteText, mediaFiles, noteId, timestamp);
        noteInput.value = '';
        selectedFiles = [];
        document.getElementById('media-preview').innerHTML = '';
    }
});

async function saveNoteToAPI(noteText, mediaFiles, noteId, timestamp) {
    try {
        const mediaURLs = await Promise.all(selectedFiles.map(async file => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Lỗi tải lên media');
            }

            const data = await response.json();
            return { url: data.url, type: file.type };
        }));

        const response = await fetch(`${API_BASE}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: noteText,
                media: mediaURLs,
                id: noteId,
                timestamp: timestamp
            })
        });

        if (!response.ok) {
            throw new Error('Lưu ghi chú không thành công');
        }

        const data = await response.json();
        console.log('Ghi chú đã được lưu:', data);
        addNoteToDisplay(noteText, mediaURLs, noteId, timestamp);

    } catch (error) {
        console.error('Lỗi khi lưu ghi chú:', error);
    }
}


async function loadNotes() {
    try {
        const response = await fetch(`${API_BASE}/api/notes`);  
        const notes = await response.json();
        
        const currentTime = Date.now();
        const validNotes = notes.filter(note => {
            const age = currentTime - note.timestamp;
            return age <= (48 * 60 * 60 * 1000); 
        });
        validNotes.sort((a, b) => b.timestamp - a.timestamp);
        
        const notesDisplay = document.querySelector('.notes-display');
        notesDisplay.innerHTML = '';
        validNotes.forEach(note => {
            addNoteToDisplay(note.text, note.media || [], note.id, note.timestamp);
            loadReplies(note.id);
            loadReactions(note.id);
        });
    } catch (error) {
        console.error('Error loading notes from API:', error);
    }
}

function addNoteToDisplay(noteText, mediaFiles, noteId, timestamp) {
    const noteDisplay = document.createElement('div');
    noteDisplay.classList.add('note');
    noteDisplay.dataset.noteId = noteId;
    noteDisplay.dataset.timestamp = timestamp;
    const date = new Date(timestamp);
    const formattedTime = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
    let mediaHTML = '';
    if (mediaFiles && mediaFiles.length > 0) {
        mediaFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                mediaHTML += `<img src="${file.url}" alt="Image">`;
            } else if (file.type.startsWith('video/')) {
                mediaHTML += `<video controls src="${file.url}"></video>`;
            }
        });
    }
    noteDisplay.innerHTML = `
        <div class="anonymous-tag">Anonymous</div>
        <div class="note-content">${noteText.replace(/\n/g, '<br>')}</div>
        <div class="media-content">${mediaHTML}</div>
        <div class="note-footer">
            <div class="note-info">    
                <span class="note-time">${formattedTime}</span>
                <div class="note-actions">
                    <div class="reactions"></div>
                    <button class="add-reaction"><i class="far fa-smile"></i></button>
                    <button class="reply-button"><i class="fas fa-reply"></i></button>
                    <div class="reaction-picker"></div>
                </div>
            </div>
        </div>
        <div class="reply-form">
            <textarea class="reply-input" placeholder="Viết phản hồi của bạn..."></textarea>
            <div class="reply-actions">
                <button class="reply-submit">Gửi</button>
                <button class="reply-cancel">Hủy</button>
            </div>
        </div>
        <div class="replies"></div>
    `;
    const notesDisplay = document.querySelector('.notes-display');
    notesDisplay.insertBefore(noteDisplay, notesDisplay.firstChild);

    const notes = Array.from(notesDisplay.children);
    notes.sort((a, b) => parseInt(b.dataset.timestamp) - parseInt(a.dataset.timestamp));

    notesDisplay.innerHTML = '';
    notes.forEach(note => {
        notesDisplay.appendChild(note);
    });

    initializeNoteFeatures(noteDisplay, noteId); 
}

function initializeNoteFeatures(noteDisplay, noteId) {
    const reactionPicker = noteDisplay.querySelector('.reaction-picker');
    emojiList.forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'emoji-btn';
        button.textContent = emoji;
        button.onclick = () => handleReactionClick(noteId, emoji, user_id);
        reactionPicker.appendChild(button);
    });

    
    const addReactionBtn = noteDisplay.querySelector('.add-reaction');
    addReactionBtn.onclick = (e) => {
        e.stopPropagation();
        const picker = noteDisplay.querySelector('.reaction-picker');
        picker.style.display = picker.style.display === 'grid' ? 'none' : 'grid';
    };
    const replyButton = noteDisplay.querySelector('.reply-button');
    const replyForm = noteDisplay.querySelector('.reply-form');
    const replyInput = noteDisplay.querySelector('.reply-input');
    const replySubmit = noteDisplay.querySelector('.reply-submit');
    const replyCancel = noteDisplay.querySelector('.reply-cancel');

    replyButton.onclick = () => {
        replyForm.style.display = 'block';
        replyInput.focus();
    };

    replyCancel.onclick = () => {
        replyForm.style.display = 'none';
        replyInput.value = '';
    };

    replySubmit.onclick = () => {
        const replyText = replyInput.value.trim();
        if (replyText) {
            addReply(noteId, replyText);
            replyInput.value = '';
            replyForm.style.display = 'none';
        }
    };

}


const noteInput = document.getElementById('note-input');
noteInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});


noteInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('submit-note').click();
    }
});

document.getElementById('image-input').addEventListener('change', handleFileSelect);
document.getElementById('video-input').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            selectedFiles.push(file);
            displayPreview(file);
        }
    });
}

function displayPreview(file) {
    const preview = document.getElementById('media-preview');
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        previewItem.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        previewItem.appendChild(video);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => {
        selectedFiles = selectedFiles.filter(f => f !== file);
        previewItem.remove();
    };

    previewItem.appendChild(removeBtn);
    preview.appendChild(previewItem);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

const emojiList = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
    '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
    '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
    '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', 
    '😌', '😍',  '🥰', '😘', '😗', '😙', '😚', '😋',
    '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
    '🤩','🥳','🙂‍↕️','😏','😒','🙂‍↔️','😞','😔','😟',
    '😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭',
    '😮‍💨','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱',
    '😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶',
    '😶‍🌫️','😐','😑','😬','🙄','😯','😦','😧','😮','😲',
    '😴','🤤','😪','😵','😵','🤐','🥴','🤢','🤮','🤧',
    '😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺',
    '🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃', 
    '👋','🤚','🖐️','✋','🖖','👌','✌️','🤞','🖕',
    '🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎',
    '✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏',
    '✍️','💪','🦵','🦶','👂','👃','👀','👁️','🧠','🦷',
    '🦴','👅','👄',

    '💋','💌','💘','💝','💖','💗','💓','💞','💕','💟',
    '❣️','💔','❤️','🧡','💛','💚','💙','💜','🖤',
    '💯','💢','💥','💫','💦','💨','🕳️','🌟','✨',
    '🔥','🌈','🎉','🎊','🎈',

    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
    '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔',
    '🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺',
    '🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜',
    '🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑',
    '🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈',
    '🐊','🐅','🐆','🦓','🦍','🐘','🦛','🦏','🐪',
    '🐫','🦒','🦘','🐂','🐃','🐄','🐎',

    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
    '🏓','🏸','🥊','🥋','🥅','⛳','⛸️','🎣','🎽',
    '🎿','🛷','🥌','🎯','🎮','🎲','🧩','♟️',

    '🎼','🎵','🎶','🎤','🎧','🎷','🎸','🎹','🎺','🎻',
    '🥁','🎬','🎨','🖌️','🖍️',

    '🚗','🚕','🚌','🚎','🏎️','🚓','🚑','🚒','🚚','🚛',
    '🚜','🚲','🛴','🛵','🏍️','✈️','🛫','🛬','🚀',
    '🛸','🚢','⚓','⛵','🚤','🛶',

    '☀️','🌤️','⛅','🌥️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️',
    '☃️','⛄','🌬️','💨','🌪️','🌫️','🌈','☔','💧','🌊',

    '🏳️','🏴','🏁','🚩',  

    '🗽','🗼','🗿','🏰','🏯','⛩️','🕌','🕍','⛪',
    '🕋','🛤️','🌉','🌁','🗻','⛰️','🏔️','🗾','🏝️','🏜️',
    '🌋','🏟️','🎡','🎢','🎠',

];

const emojiPicker = document.getElementById('emoji-picker');
emojiList.forEach(emoji => {
    const button = document.createElement('button');
    button.className = 'emoji-btn';
    button.textContent = emoji;
    button.onclick = () => {
        const noteInput = document.getElementById('note-input');
        noteInput.value += emoji;
        noteInput.focus();
        emojiPicker.style.display = 'none';
    };
    emojiPicker.appendChild(button);
});

const emojiToggle = document.getElementById('emoji-toggle');
if (emojiToggle){
    emojiToggle.onclick = () => {
        const currentDisplay = emojiPicker.style.display;
        emojiPicker.style.display = currentDisplay === 'grid' ? 'none' : 'grid';
    };
}


document.addEventListener('DOMContentLoaded', () => {
    const emojiToggle = document.getElementById('emoji-toggle');
    if (emojiToggle) {
        emojiToggle.onclick = () => {
            const emojiPicker = document.getElementById('emoji-picker');
            const currentDisplay = emojiPicker.style.display;
            emojiPicker.style.display = currentDisplay === 'grid' ? 'none' : 'grid';
        };
    }
});


async function addReply(noteId, replyText) {
    try {
        const note = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!note) return;

        const response = await fetch(`${API_BASE}/api/replies/${noteId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: replyText,
                timestamp: Date.now() 
            })
        });

        const data = await response.json();
        
        const replyButton = note.querySelector('.reply-button');
        if (replyButton) {
            const currentText = replyButton.textContent.trim();
            const currentCount = parseInt(currentText) || 0;
            replyButton.innerHTML = `<i class="fas fa-reply"></i> ${currentCount + 1}`;
        }

        loadReplies(noteId); 
        
    } catch (error) {
        console.error('Error adding reply:', error);
    }
}


async function loadReplies(noteId) {
    try {
        const response = await fetch(`${API_BASE}/api/replies/${noteId}`);
        const replies = await response.json();
        const note = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!note) return;

        const repliesContainer = note.querySelector('.replies');
        repliesContainer.innerHTML = '';

        const replyCount = replies.length;
        const replyButton = note.querySelector('.reply-button');
        if (replyButton) {
            replyButton.innerHTML = `<i class="fas fa-reply"></i> ${replyCount}`;
        }

        replies.forEach(reply => {
            const date = new Date(reply.timestamp);
            const formattedTime = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;

            const replyElement = document.createElement('div');
            replyElement.className = 'reply';
            replyElement.innerHTML = `
                <div class="reply-header">
                    <span class="anonymous-tag">Anonymous</span>
                    <span class="reply-time">${formattedTime}</span>
                </div>
                <div class="reply-content">${reply.text}</div>
            `;
            repliesContainer.appendChild(replyElement);
        });
        
    } catch (error) {
        console.error('Error loading replies:', error);
    }
}

// ---------- Reactions: improved, per-emoji handling ----------

// Tải reactions (gửi user_id để backend trả về flag 'me')
async function loadReactions(noteId) {
    try {
        const response = await fetch(`${API_BASE}/api/reactions/${noteId}?user_id=${encodeURIComponent(user_id)}`);
        if (!response.ok) throw new Error('Failed to load reactions');

        const reactions = await response.json();
        const note = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!note) return;

        const reactionsContainer = note.querySelector('.reactions');
        reactionsContainer.innerHTML = '';

        // reactions expected: [{ emoji, count, me }]
        reactions.forEach(reaction => {
            const count = reaction.count || 0;
            const reactionBtn = document.createElement('button'); // button for accessibility
            reactionBtn.type = 'button';
            reactionBtn.className = 'reaction';
            if (reaction.me) reactionBtn.classList.add('my-reaction');

            reactionBtn.innerHTML = `${reaction.emoji} <span class="reaction-count">${count}</span>`;
            // click toggles (POST toggles server-side)
            reactionBtn.addEventListener('click', () => toggleReaction(noteId, reaction.emoji, reactionBtn));
            reactionsContainer.appendChild(reactionBtn);
        });
    } catch (error) {
        console.error('Error loading reactions:', error);
    }
}

// Toggle reaction with optimistic UI
async function toggleReaction(noteId, emoji, element) {
    // find count span
    const countSpan = element.querySelector('.reaction-count');
    let count = parseInt(countSpan ? countSpan.textContent : '0') || 0;
    const wasMine = element.classList.contains('my-reaction');

    // optimistic update
    if (wasMine) {
        element.classList.remove('my-reaction');
        count = Math.max(0, count - 1);
    } else {
        element.classList.add('my-reaction');
        count = count + 1;
    }
    if (countSpan) countSpan.textContent = count;

    // send toggle request (backend should toggle based on existing user reaction)
    try {
        const res = await fetch(`${API_BASE}/api/reactions/${noteId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji, user_id })
        });

        if (!res.ok) {
            // Revert optimistic if server fails
            console.error('Failed to toggle reaction:', await res.text());
            if (wasMine) {
                element.classList.add('my-reaction');
                count = count + 1;
            } else {
                element.classList.remove('my-reaction');
                count = Math.max(0, count - 1);
            }
            if (countSpan) countSpan.textContent = count;
            return;
        }

        // sync with server to get canonical counts + me flags
        await loadReactions(noteId);

    } catch (err) {
        console.error('Error toggling reaction:', err);
        // revert optimistic
        if (wasMine) {
            element.classList.add('my-reaction');
            count = count + 1;
        } else {
            element.classList.remove('my-reaction');
            count = Math.max(0, count - 1);
        }
        if (countSpan) countSpan.textContent = count;
    }
}

// Khi khởi tạo reaction picker cho mỗi note (thay cái cũ)
function initializeNoteFeatures(noteDisplay, noteId) {
    const reactionPicker = noteDisplay.querySelector('.reaction-picker');
    reactionPicker.innerHTML = ''; // đảm bảo rỗng trước khi thêm
    emojiList.forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'emoji-btn';
        button.textContent = emoji;
        // Khi user chọn emoji từ picker -> toggle (POST) ngay
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReaction(noteId, emoji, createOrFindTempReactionButton(noteDisplay, emoji));
        });
        reactionPicker.appendChild(button);
    });

    // ... keep the rest of initializeNoteFeatures (reply, picker toggle, etc)
    const addReactionBtn = noteDisplay.querySelector('.add-reaction');
    addReactionBtn.onclick = (e) => {
        e.stopPropagation();
        const picker = noteDisplay.querySelector('.reaction-picker');
        picker.style.display = picker.style.display === 'grid' ? 'none' : 'grid';
    };

    // reply handlers follow unchanged (copy existing code)
    const replyButton = noteDisplay.querySelector('.reply-button');
    const replyForm = noteDisplay.querySelector('.reply-form');
    const replyInput = noteDisplay.querySelector('.reply-input');
    const replySubmit = noteDisplay.querySelector('.reply-submit');
    const replyCancel = noteDisplay.querySelector('.reply-cancel');

    replyButton.onclick = () => {
        replyForm.style.display = 'block';
        replyInput.focus();
    };

    replyCancel.onclick = () => {
        replyForm.style.display = 'none';
        replyInput.value = '';
    };

    replySubmit.onclick = () => {
        const replyText = replyInput.value.trim();
        if (replyText) {
            addReply(noteId, replyText);
            replyInput.value = '';
            replyForm.style.display = 'none';
        }
    };
}

// Helper: when user clicks an emoji in picker we may not yet have a reaction button in DOM.
// Create a temporary reaction button element (not inserted) so toggleReaction can update UI instantly.
// After toggling we call loadReactions(noteId) to rebuild canonical DOM.
function createOrFindTempReactionButton(noteDisplay, emoji) {
    const reactionsContainer = noteDisplay.querySelector('.reactions');
    let existing = Array.from(reactionsContainer.children).find(el => el.textContent && el.textContent.includes(emoji));
    if (existing) return existing;

    // create a temporary element (not appended) with required structure
    const temp = document.createElement('button');
    temp.type = 'button';
    temp.className = 'reaction';
    temp.innerHTML = `${emoji} <span class="reaction-count">0</span>`;
    return temp;
}


document.addEventListener('click', (e) => {
    const reactionPickers = document.querySelectorAll('.reaction-picker');
    reactionPickers.forEach(picker => {
        if (!picker.contains(e.target) && !e.target.closest('.add-reaction')) {
            picker.style.display = 'none';
        }
    });
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey && document.activeElement.classList.contains('reply-input')) {
        event.preventDefault();
        const replyForm = event.target.closest('.reply-form');
        const submitButton = replyForm.querySelector('.reply-submit');
        submitButton.click();
    }
});
setInterval(loadNotes, 60000);