const API_BASE = "https://backend-oik0.onrender.com";
let selectedFiles = [];

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

async function loadReactions(noteId) {
    try {
        const response = await fetch(`${API_BASE}/api/reactions/${noteId}`);
        if (!response.ok) throw new Error('Failed to load reactions');
        
        const reactions = await response.json();
        const note = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!note) return;

        const reactionsContainer = note.querySelector('.reactions');
        reactionsContainer.innerHTML = '';

        reactions.forEach(reaction => {
            const count = reaction.count || 1;
            const reactionElement = document.createElement('span');
            reactionElement.className = 'reaction';
            reactionElement.innerHTML = `${reaction.emoji} <span class="reaction-count">${count}</span>`;
            reactionElement.onclick = () => handleReactionClick(noteId, reaction.emoji, user_id);
            reactionsContainer.appendChild(reactionElement);
        });

    } catch (error) {
        console.error('Error loading reactions:', error);
    }
}


async function addReaction(noteId, emoji) {
    try {
        const response = await fetch(`${API_BASE}/api/reactions/${noteId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji, user_id })
        });

        if (!response.ok) throw new Error('Failed to add reaction');

        await loadReactions(noteId);

    } catch (error) {
        console.error('Error adding reaction:', error);
    }
}

let clickTimer = null;

async function handleReactionClick(noteId, emoji, user_id) {
    if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;

        try {
            const response = await fetch(`${API_BASE}/api/reactions/${noteId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji, user_id })
            });

            if (!response.ok) throw new Error('Failed to remove reaction');
            await loadReactions(noteId);

        } catch (error) {
            console.error('Error removing reaction:', error);
        }

    } else {
        
        clickTimer = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE}/api/reactions/${noteId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emoji, user_id })
                });

                if (!response.ok) throw new Error('Failed to add reaction');
                await loadReactions(noteId);

            } catch (error) {
                console.error('Error adding reaction:', error);
            }
            clickTimer = null;
        }, 250); 
    }
}

if (!localStorage.getItem('user_id')) {
  const randomId = 'u-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
  localStorage.setItem('user_id', randomId);
}
const user_id = localStorage.getItem('user_id');



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