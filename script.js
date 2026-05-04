// ========== ГЛОБАЛЬНЫЕ ДАННЫЕ ==========
let currentUser = null;
let currentChat = null;
let currentView = 'chats';
let tempCode = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;

// Демо-пользователи (для поиска и личных сообщений)
let users = [
    { id: 'user1', name: 'Алексей', username: 'alex', phone: '+79991234567', bio: 'Разработчик', avatar: '👨‍💻', messages: [] },
    { id: 'user2', name: 'Мария', username: 'maria', phone: '+79997654321', bio: 'Дизайнер', avatar: '👩‍🎨', messages: [] },
    { id: 'user3', name: 'Дмитрий', username: 'dima', phone: '+79991112233', bio: 'Менеджер', avatar: '👨‍💼', messages: [] }
];

// Демо-группы
let groups = [
    { id: 'group1', name: 'Разработчики LogoGramm', type: 'group', avatar: '💻', members: [], messages: [] },
    { id: 'group2', name: 'Киноманы', type: 'group', avatar: '🎬', members: [], messages: [] }
];

// Демо-каналы
let channels = [
    { id: 'channel1', name: 'Официальный канал', type: 'channel', avatar: '📢', subscribers: 1500, messages: [] },
    { id: 'channel2', name: 'Новости Tech', type: 'channel', avatar: '🤖', subscribers: 892, messages: [] }
];

// Личные чаты (динамические)
let personalChats = [];

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function generateRandomCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

function saveData() {
    localStorage.setItem('logogramm_users', JSON.stringify(users));
    localStorage.setItem('logogramm_personalChats', JSON.stringify(personalChats));
}

function loadData() {
    const savedUsers = localStorage.getItem('logogramm_users');
    const savedChats = localStorage.getItem('logogramm_personalChats');
    if (savedUsers) users = JSON.parse(savedUsers);
    if (savedChats) personalChats = JSON.parse(savedChats);
}

// ========== АВТОРИЗАЦИЯ ==========
function setupAuth() {
    document.getElementById('sendCodeBtn').onclick = () => {
        const phone = document.getElementById('phoneInput').value;
        if (phone.length < 5) {
            alert('Введите корректный номер');
            return;
        }
        tempCode = generateRandomCode();
        console.log(`🔐 Код: ${tempCode}`);
        alert(`Вам пришел код от Logo gramm: ${tempCode}`);
        document.getElementById('codeSection').style.display = 'block';
    };
    
    document.getElementById('verifyBtn').onclick = () => {
        if (document.getElementById('codeInput').value === tempCode) {
            const fullPhone = document.getElementById('countryCode').value + document.getElementById('phoneInput').value;
            
            // Проверка, существует ли пользователь
            let existingUser = users.find(u => u.phone === fullPhone);
            if (existingUser) {
                currentUser = existingUser;
            } else {
                currentUser = {
                    id: 'user_' + Date.now(),
                    name: 'Новый пользователь',
                    username: 'user' + Math.floor(Math.random() * 1000),
                    phone: fullPhone,
                    bio: 'Привет! Я в LogoGramm',
                    avatar: '👤',
                    messages: []
                };
                users.push(currentUser);
            }
            
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainScreen').style.display = 'flex';
            updateProfileUI();
            renderChatsList();
            saveData();
        } else {
            alert('Неверный код');
        }
    };
}

// ========== ПРОФИЛЬ ==========
function updateProfileUI() {
    if (!currentUser) return;
    document.getElementById('profileName').innerText = currentUser.name;
    document.getElementById('profileUsername').innerText = '@' + currentUser.username;
    document.getElementById('profileAvatar').innerText = currentUser.avatar || '👤';
    document.getElementById('bigAvatar').innerText = currentUser.avatar || '👤';
    document.getElementById('editName').value = currentUser.name;
    document.getElementById('editUsername').value = currentUser.username;
    document.getElementById('editBio').value = currentUser.bio || '';
    document.getElementById('profilePhone').innerText = currentUser.phone;
    document.getElementById('profileId').innerText = currentUser.id;
}

function setupProfile() {
    document.getElementById('openProfileBtn').onclick = () => {
        updateProfileUI();
        document.getElementById('profileModal').classList.add('active');
    };
    
    document.getElementById('saveProfileBtn').onclick = () => {
        currentUser.name = document.getElementById('editName').value;
        currentUser.username = document.getElementById('editUsername').value;
        currentUser.bio = document.getElementById('editBio').value;
        updateProfileUI();
        document.getElementById('profileModal').classList.remove('active');
        renderChatsList();
        saveData();
    };
    
    document.getElementById('logoutBtn').onclick = () => {
        currentUser = null;
        currentChat = null;
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('codeSection').style.display = 'none';
    };
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => document.getElementById('profileModal').classList.remove('active');
    });
}

// ========== ПОИСК ПО ЮЗЕРНЕЙМУ ==========
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('searchResults');
    
    searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase();
        if (query.length < 2) {
            resultsDiv.style.display = 'none';
            return;
        }
        
        const matches = users.filter(u => 
            u.id !== currentUser?.id && 
            (u.username.toLowerCase().includes(query) || u.name.toLowerCase().includes(query))
        );
        
        if (matches.length === 0) {
            resultsDiv.style.display = 'none';
            return;
        }
        
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = matches.map(u => `
            <div class="search-result-item" data-user-id="${u.id}">
                <span>${u.avatar || '👤'}</span>
                <div>
                    <div><strong>${u.name}</strong></div>
                    <div style="font-size: 12px; color: #888;">@${u.username}</div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.search-result-item').forEach(el => {
            el.onclick = () => {
                const userId = el.dataset.userId;
                startPersonalChat(userId);
                resultsDiv.style.display = 'none';
                searchInput.value = '';
            };
        });
    };
    
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });
}

function startPersonalChat(userId) {
    const otherUser = users.find(u => u.id === userId);
    if (!otherUser) return;
    
    // Проверяем, существует ли уже чат
    let chat = personalChats.find(c => 
        (c.user1 === currentUser.id && c.user2 === userId) ||
        (c.user1 === userId && c.user2 === currentUser.id)
    );
    
    if (!chat) {
        chat = {
            id: 'chat_' + Date.now(),
            type: 'personal',
            user1: currentUser.id,
            user2: userId,
            name: otherUser.name,
            avatar: otherUser.avatar,
            username: otherUser.username,
            messages: []
        };
        personalChats.push(chat);
        saveData();
    }
    
    currentChat = chat;
    renderChatsList();
    renderMessages();
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('chatHeader').querySelector('.chat-title').innerText = chat.name;
}

// ========== ОТОБРАЖЕНИЕ ЧАТОВ ==========
function renderChatsList() {
    const container = document.getElementById('chatsList');
    let items = [];
    
    if (currentView === 'chats') {
        items = personalChats.map(chat => ({
            id: chat.id,
            name: chat.name,
            avatar: chat.avatar || '👤',
            preview: chat.messages?.slice(-1)[0]?.text || 'Нет сообщений',
            type: 'personal'
        }));
    } else if (currentView === 'groups') {
        items = groups.map(g => ({
            id: g.id,
            name: g.name,
            avatar: g.avatar,
            preview: g.messages?.slice(-1)[0]?.text || 'Нет сообщений',
            type: 'group'
        }));
    } else if (currentView === 'channels') {
        items = channels.map(c => ({
            id: c.id,
            name: c.name,
            avatar: c.avatar,
            preview: c.messages?.slice(-1)[0]?.text || 'Нет сообщений',
            type: 'channel'
        }));
    }
    
    container.innerHTML = items.map(item => `
        <div class="chat-item" data-chat-id="${item.id}" data-chat-type="${item.type}">
            <div class="chat-avatar">${item.avatar}</div>
            <div class="chat-info">
                <div class="chat-name">${item.name}</div>
                <div class="chat-preview">${item.preview}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.chat-item').forEach(el => {
        el.onclick = () => {
            const id = el.dataset.chatId;
            const type = el.dataset.chatType;
            
            if (type === 'personal') {
                currentChat = personalChats.find(c => c.id === id);
            } else if (type === 'group') {
                currentChat = groups.find(g => g.id === id);
            } else {
                currentChat = channels.find(c => c.id === id);
            }
            
            document.getElementById('chatHeader').querySelector('.chat-title').innerText = currentChat.name;
            document.getElementById('inputArea').style.display = 'flex';
            renderMessages();
            
            // Мобильная адаптация
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        };
    });
}

// ========== ГОЛОСОВЫЕ СООБЩЕНИЯ ==========
async function startVoiceRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        sendVoiceMessage(audioUrl);
        document.getElementById('voiceRecorder').style.display = 'none';
        clearInterval(recordingTimer);
        stream.getTracks().forEach(track => track.stop());
    };
    
    mediaRecorder.start();
    recordingSeconds = 0;
    document.getElementById('recordingTimer').innerText = '0:00';
    document.getElementById('voiceRecorder').style.display = 'block';
    
    recordingTimer = setInterval(() => {
        recordingSeconds++;
        const mins = Math.floor(recordingSeconds / 60);
        const secs = recordingSeconds % 60;
        document.getElementById('recordingTimer').innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

function sendVoiceMessage(audioUrl) {
    if (!currentChat) return;
    
    const msg = {
        id: Date.now(),
        type: 'voice',
        audioUrl: audioUrl,
        text: '🎤 Голосовое сообщение',
        sender: currentUser.name,
        senderId: currentUser.id,
        timestamp: Date.now(),
        reactions: [],
        pinned: false
    };
    
    if (!currentChat.messages) currentChat.messages = [];
    currentChat.messages.push(msg);
    renderMessages();
    saveData();
}

// ========== ОТПРАВКА ТЕКСТОВЫХ СООБЩЕНИЙ ==========
function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input.value.trim() || !currentChat) return;
    
    const msg = {
        id: Date.now(),
        type: 'text',
        text: input.value,
        sender: currentUser.name,
        senderId: currentUser.id,
        timestamp: Date.now(),
        reactions: [],
        pinned: false,
        edited: false
    };
    
    if (!currentChat.messages) currentChat.messages = [];
    currentChat.messages.push(msg);
    input.value = '';
    renderMessages();
    saveData();
}

// ========== ОТОБРАЖЕНИЕ СООБЩЕНИЙ ==========
function renderMessages() {
    const container = document.getElementById('messagesArea');
    if (!currentChat || !currentChat.messages) {
        container.innerHTML = '<div class="placeholder">Нет сообщений</div>';
        return;
    }
    
    const messages = currentChat.messages;
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.senderId === currentUser?.id ? 'message-outgoing' : 'message-incoming'} ${msg.pinned ? 'message-pinned' : ''}" data-msg-id="${msg.id}">
            ${msg.senderId !== currentUser?.id && currentChat.type !== 'personal' ? 
                `<div class="message-sender">${msg.sender}</div>` : ''}
            <div class="message-text">
                ${msg.type === 'voice' ? 
                    `<button class="message-audio" data-audio="${msg.audioUrl}">🎵 Воспроизвести голосовое</button>` : 
                    msg.text}
            </div>
            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            ${msg.reactions && msg.reactions.length ? 
                `<div class="message-reactions">${msg.reactions.map(r => r.emoji).join(' ')}</div>` : ''}
        </div>
    `).join('');
    
    // Обработчики для аудио
    document.querySelectorAll('.message-audio').forEach(btn => {
        btn.onclick = () => {
            const audioUrl = btn.dataset.audio;
            const player = document.getElementById('audioPlayer');
            const audioEl = document.getElementById('audioPlayback');
            audioEl.src = audioUrl;
            player.style.display = 'block';
            audioEl.play();
        };
    });
    
    // Контекстное меню
    document.querySelectorAll('.message').forEach(msgEl => {
        msgEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const msgId = parseInt(msgEl.dataset.msgId);
            const msg = currentChat.messages.find(m => m.id === msgId);
            if (msg && msg.senderId === currentUser?.id) {
                showContextMenu(e.clientX, e.clientY, msgId);
            }
        });
    });
    
    container.scrollTop = container.scrollHeight;
}

// ========== КОНТЕКСТНОЕ МЕНЮ ==========
function showContextMenu(x, y, msgId) {
    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.onclick = () => {
            const action = btn.dataset.action;
            if (action === 'delete') deleteMessage(msgId);
            if (action === 'edit') editMessage(msgId);
            if (action === 'pin') togglePin(msgId);
            menu.style.display = 'none';
        };
    });
    
    document.querySelectorAll('[data-reaction]').forEach(reaction => {
        reaction.onclick = () => {
            addReaction(msgId, reaction.dataset.reaction);
            menu.style.display = 'none';
        };
    });
    
    document.addEventListener('click', function close() {
        menu.style.display = 'none';
        document.removeEventListener('click', close);
    });
}

function deleteMessage(msgId) {
    currentChat.messages = currentChat.messages.filter(m => m.id !== msgId);
    renderMessages();
    saveData();
}

function editMessage(msgId) {
    const msg = currentChat.messages.find(m => m.id === msgId);
    const newText = prompt('Изменить сообщение:', msg.text);
    if (newText) {
        msg.text = newText;
        msg.edited = true;
        renderMessages();
        saveData();
    }
}

function togglePin(msgId) {
    const msg = currentChat.messages.find(m => m.id === msgId);
    msg.pinned = !msg.pinned;
    renderMessages();
    saveData();
}

function addReaction(msgId, emoji) {
    const msg = currentChat.messages.find(m => m.id === msgId);
    if (!msg.reactions) msg.reactions = [];
    msg.reactions.push({ emoji, user: currentUser.name });
    renderMessages();
    saveData();
}

// ========== МОБИЛЬНОЕ МЕНЮ ==========
function setupMobile() {
    const backBtn = document.getElementById('backBtn');
    backBtn.onclick = () => {
        document.getElementById('sidebar').classList.add('open');
    };
    
    // Свайпы
    let touchStart = 0;
    document.addEventListener('touchstart', (e) => {
        touchStart = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
        const touchEnd = e.changedTouches[0].screenX;
        if (touchEnd - touchStart > 80 && currentChat) {
            document.getElementById('sidebar').classList.add('open');
        }
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupAuth();
    setupProfile();
    setupSearch();
    setupMobile();
    
    document.getElementById('sendBtn').onclick = sendMessage;
    document.getElementById('voiceBtn').onclick = startVoiceRecording;
    document.getElementById('stopRecordingBtn').onclick = () => {
        if (mediaRecorder) mediaRecorder.stop();
    };
    document.getElementById('cancelRecordingBtn').onclick = () => {
        if (mediaRecorder) mediaRecorder.stop();
        document.getElementById('voiceRecorder').style.display = 'none';
        clearInterval(recordingTimer);
    };
    document.getElementById('closeAudioBtn').onclick = () => {
        document.getElementById('audioPlayer').style.display = 'none';
    };
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderChatsList();
        };
    });
    
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});