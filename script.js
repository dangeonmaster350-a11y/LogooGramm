// ========== ДАННЫЕ ==========
let currentUser = null;
let currentChat = null;
let allUsers = [];
let userChats = [];
let stories = [];
let premiumUsers = [];
let broadcastChannel = null;

// ========== ЗАГРУЗКА ==========
function loadData() {
    const storedUsers = localStorage.getItem('lg_users');
    if (storedUsers) allUsers = JSON.parse(storedUsers);
    else allUsers = [];
    
    const storedPremium = localStorage.getItem('lg_premium');
    if (storedPremium) premiumUsers = JSON.parse(storedPremium);
    else premiumUsers = [];
    
    const storedStories = localStorage.getItem('lg_stories');
    if (storedStories) stories = JSON.parse(storedStories);
    else stories = [];
    
    const savedUser = localStorage.getItem('lg_currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (!allUsers.find(u => u.id === currentUser.id)) {
            allUsers.push(currentUser);
            saveUsers();
        }
    }
}

function saveUsers() { localStorage.setItem('lg_users', JSON.stringify(allUsers)); }
function savePremium() { localStorage.setItem('lg_premium', JSON.stringify(premiumUsers)); }
function saveStories() { localStorage.setItem('lg_stories', JSON.stringify(stories)); }
function saveCurrentUser() { localStorage.setItem('lg_currentUser', JSON.stringify(currentUser)); }

function hasPremium(userId) {
    const p = premiumUsers.find(p => p.userId === userId);
    if (!p) return false;
    if (p.expiresAt < Date.now()) {
        premiumUsers = premiumUsers.filter(p => p.userId !== userId);
        savePremium();
        return false;
    }
    return true;
}

// ========== BROADCAST ==========
function setupBroadcast() {
    if (broadcastChannel) broadcastChannel.close();
    broadcastChannel = new BroadcastChannel('lg_live');
    
    broadcastChannel.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'message' && data.to === currentUser?.id) {
            const key = getChatKey(data.from, data.to);
            const msgs = getMessages(key);
            msgs.push({ id: data.mid, text: data.text, senderId: data.from, time: data.time });
            saveMessages(key, msgs);
            if (currentChat && currentChat.id === data.from) renderMessages();
            renderChats();
            const sender = allUsers.find(u => u.id === data.from);
            if (sender && document.hidden) new Notification(sender.name, { body: data.text });
        }
        if (data.type === 'story') {
            stories.push(data.story);
            saveStories();
            if (document.getElementById('storiesPage').classList.contains('active')) renderStories();
        }
    };
}

// ========== АВТОРИЗАЦИЯ ==========
function setupAuth() {
    if (currentUser) {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        updateUI();
        renderChats();
        renderUsers();
        renderStories();
        setupBroadcast();
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
        return;
    }
    
    document.getElementById('registerBtn').onclick = () => {
        const nick = document.getElementById('regNickname').value.trim().toLowerCase();
        const name = document.getElementById('regName').value.trim();
        if (!nick || !name) return alert('Заполните все поля');
        if (allUsers.find(u => u.nickname === nick)) return alert('Ник занят');
        
        currentUser = { id: 'u_' + Date.now(), nickname: nick, name: name, avatar: '👤', bio: '' };
        allUsers.push(currentUser);
        saveUsers();
        saveCurrentUser();
        
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        updateUI();
        renderChats();
        renderUsers();
        renderStories();
        setupBroadcast();
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    };
}

function updateUI() {
    document.getElementById('menuName').innerText = currentUser.name;
    document.getElementById('menuNick').innerText = '@' + currentUser.nickname;
    document.getElementById('menuAvatar').innerText = currentUser.avatar;
    document.getElementById('profileAvatar').innerText = currentUser.avatar;
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileNick').value = currentUser.nickname;
    document.getElementById('profileBio').value = currentUser.bio || '';
    document.getElementById('menuPremiumBadge').style.display = hasPremium(currentUser.id) ? 'inline-block' : 'none';
}

// ========== МЕНЮ ==========
function setupMenu() {
    document.getElementById('menuBtn').onclick = () => {
        document.getElementById('sideMenu').classList.add('open');
        document.getElementById('menuOverlay').classList.add('show');
    };
    document.getElementById('menuOverlay').onclick = () => {
        document.getElementById('sideMenu').classList.remove('open');
        document.getElementById('menuOverlay').classList.remove('show');
    };
    document.querySelectorAll('.menu-list-item[data-tab]').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
            document.getElementById(tab + 'Page').classList.add('active');
            document.getElementById('sideMenu').classList.remove('open');
            document.getElementById('menuOverlay').classList.remove('show');
            if (tab === 'stories') renderStories();
            if (tab === 'users') renderUsers();
        };
    });
    document.getElementById('openProfileMenuItem').onclick = () => {
        document.getElementById('profileModal').classList.add('show');
        closeMenu();
    };
    document.getElementById('openPremiumMenuItem').onclick = () => {
        document.getElementById('premiumModal').classList.add('show');
        closeMenu();
    };
    document.getElementById('logoutBtn').onclick = () => {
        if (confirm('Выйти?')) {
            localStorage.removeItem('lg_currentUser');
            if (broadcastChannel) broadcastChannel.close();
            location.reload();
        }
    };
    function closeMenu() {
        document.getElementById('sideMenu').classList.remove('open');
        document.getElementById('menuOverlay').classList.remove('show');
    }
}

// ========== ПРОФИЛЬ ==========
function setupProfile() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('profileModal').classList.remove('show');
            document.getElementById('premiumModal').classList.remove('show');
            document.getElementById('storyAddModal').classList.remove('show');
        };
    });
    document.getElementById('saveProfileBtn').onclick = () => {
        const newName = document.getElementById('profileName').value;
        const newNick = document.getElementById('profileNick').value.trim().toLowerCase();
        if (newNick !== currentUser.nickname && allUsers.find(u => u.nickname === newNick && u.id !== currentUser.id)) {
            return alert('Ник занят');
        }
        currentUser.name = newName;
        currentUser.nickname = newNick;
        currentUser.bio = document.getElementById('profileBio').value;
        const userInList = allUsers.find(u => u.id === currentUser.id);
        if (userInList) { userInList.name = newName; userInList.nickname = newNick; userInList.bio = currentUser.bio; }
        saveUsers();
        saveCurrentUser();
        updateUI();
        renderChats();
        renderUsers();
        document.getElementById('profileModal').classList.remove('show');
        alert('Профиль обновлён');
    };
}

// ========== PREMIUM ==========
function setupPremium() {
    document.querySelectorAll('.plan-buy').forEach(btn => {
        btn.onclick = (e) => {
            const plan = e.target.closest('.plan');
            const months = parseInt(plan.dataset.months);
            let price = months === 1 ? 100 : months === 3 ? 300 : 700;
            if (confirm(`Купить Premium на ${months} мес. за ${price}₽?`)) {
                const existing = premiumUsers.find(p => p.userId === currentUser.id);
                if (existing) existing.expiresAt += months * 30 * 24 * 60 * 60 * 1000;
                else premiumUsers.push({ userId: currentUser.id, expiresAt: Date.now() + months * 30 * 24 * 60 * 60 * 1000 });
                savePremium();
                updateUI();
                alert('Premium оформлен!');
                document.getElementById('premiumModal').classList.remove('show');
            }
        };
    });
}

// ========== ПОИСК ==========
function setupSearch() {
    document.getElementById('searchBtn').onclick = () => {
        document.getElementById('searchPanel').classList.add('show');
        document.getElementById('searchInput').focus();
    };
    document.getElementById('closeSearchBtn').onclick = () => {
        document.getElementById('searchPanel').classList.remove('show');
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
    };
    document.getElementById('searchInput').oninput = () => {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const results = document.getElementById('searchResults');
        if (query.length < 1) { results.innerHTML = ''; return; }
        const matches = allUsers.filter(u => u.id !== currentUser.id && (u.nickname.includes(query) || u.name.toLowerCase().includes(query)));
        if (matches.length === 0) { results.innerHTML = '<div class="empty-state">😕 Никого не найдено</div>'; return; }
        results.innerHTML = matches.map(u => `
            <div class="search-result-item" data-id="${u.id}">
                <div class="search-result-info">
                    <div class="search-result-avatar">${u.avatar || '👤'}</div>
                    <div>
                        <div class="search-result-name">${u.name}</div>
                        <div class="search-result-nick">@${u.nickname}</div>
                    </div>
                </div>
                <button class="write-to-btn" data-id="${u.id}">✉️ Написать</button>
            </div>
        `).join('');
        document.querySelectorAll('.write-to-btn, .search-result-item').forEach(el => {
            el.onclick = (e) => {
                const id = el.dataset.id;
                const user = allUsers.find(u => u.id === id);
                if (user) {
                    document.getElementById('searchPanel').classList.remove('show');
                    openChat(user);
                }
            };
        });
    };
}

// ========== ЧАТЫ ==========
function getChatKey(id1, id2) { return `chat_${[id1, id2].sort().join('_')}`; }
function getMessages(key) { const m = localStorage.getItem(key); return m ? JSON.parse(m) : []; }
function saveMessages(key, msgs) { localStorage.setItem(key, JSON.stringify(msgs)); }

function renderChats() {
    const container = document.getElementById('chatsList');
    const others = allUsers.filter(u => u.id !== currentUser?.id);
    if (others.length === 0) { container.innerHTML = '<div class="empty-state">🔍 Нажмите на поиск, чтобы найти собеседника</div>'; return; }
    const chats = others.map(u => {
        const key = getChatKey(currentUser.id, u.id);
        const msgs = getMessages(key);
        const last = msgs[msgs.length - 1];
        return { user: u, lastMsg: last, time: last ? last.time : 0 };
    }).sort((a,b) => b.time - a.time);
    container.innerHTML = chats.map(({user, lastMsg}) => `
        <div class="chat-item" data-id="${user.id}">
            <div class="chat-avatar">${user.avatar || '👤'}</div>
            <div class="chat-info">
                <div class="chat-name">${user.name} ${hasPremium(user.id) ? '⭐' : ''}</div>
                <div class="chat-preview">${lastMsg ? (lastMsg.senderId === currentUser.id ? `Вы: ${lastMsg.text}` : lastMsg.text) : 'Нет сообщений'}</div>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.chat-item').forEach(el => {
        el.onclick = () => { const user = allUsers.find(u => u.id === el.dataset.id); if (user) openChat(user); };
    });
}

function renderUsers() {
    const container = document.getElementById('usersList');
    const others = allUsers.filter(u => u.id !== currentUser?.id);
    if (others.length === 0) { container.innerHTML = '<div class="empty-state">👥 Здесь появятся другие пользователи</div>'; return; }
    container.innerHTML = others.map(u => `
        <div class="user-item" data-id="${u.id}">
            <div class="user-avatar">${u.avatar || '👤'}</div>
            <div class="user-info">
                <div class="user-name">${u.name} ${hasPremium(u.id) ? '⭐' : ''}</div>
                <div class="user-nick">@${u.nickname}</div>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.user-item').forEach(el => {
        el.onclick = () => { const user = allUsers.find(u => u.id === el.dataset.id); if (user) openChat(user); };
    });
}

function openChat(user) {
    currentChat = user;
    document.getElementById('chatUserName').innerText = user.name;
    document.getElementById('chatUserNick').innerText = '@' + user.nickname;
    document.getElementById('chatPremium').innerHTML = hasPremium(user.id) ? '⭐ Premium' : '';
    document.getElementById('chatWindow').classList.add('show');
    renderMessages();
}

function renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!currentChat) return;
    const key = getChatKey(currentUser.id, currentChat.id);
    const msgs = getMessages(key);
    if (msgs.length === 0) { container.innerHTML = '<div class="empty-state">💬 Напишите первое сообщение</div>'; return; }
    container.innerHTML = msgs.map(m => `
        <div class="message ${m.senderId === currentUser.id ? 'message-out' : 'message-in'}">
            <div class="message-text">${escapeHtml(m.text)}</div>
            <div class="message-time">${new Date(m.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    const msg = { id: Date.now(), text: text, senderId: currentUser.id, time: Date.now() };
    const key = getChatKey(currentUser.id, currentChat.id);
    const msgs = getMessages(key);
    msgs.push(msg);
    saveMessages(key, msgs);
    if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'message', from: currentUser.id, to: currentChat.id, mid: msg.id, text: text, time: msg.time });
    }
    input.value = '';
    renderMessages();
    renderChats();
}

function setupChat() {
    document.getElementById('closeChatBtn').onclick = () => {
        document.getElementById('chatWindow').classList.remove('show');
        currentChat = null;
    };
    document.getElementById('sendMessageBtn').onclick = sendMessage;
    document.getElementById('messageInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
}

// ========== СТОРИС ==========
function setupStories() {
    document.getElementById('addStoryBtn').onclick = () => document.getElementById('storyAddModal').classList.add('show');
    document.getElementById('storyTextInput').oninput = () => {
        document.getElementById('previewStoryText').innerText = document.getElementById('storyTextInput').value || 'Текст истории';
    };
    document.getElementById('storyColorInput').onchange = () => {
        document.getElementById('storyPreview').style.background = document.getElementById('storyColorInput').value;
    };
    document.getElementById('publishStoryBtn').onclick = () => {
        const text = document.getElementById('storyTextInput').value;
        if (!text) return alert('Введите текст');
        const story = {
            id: Date.now(), userId: currentUser.id, userName: currentUser.name,
            userAvatar: currentUser.avatar, text: text,
            bgColor: document.getElementById('storyColorInput').value, time: Date.now()
        };
        stories.push(story);
        saveStories();
        if (broadcastChannel) broadcastChannel.postMessage({ type: 'story', story: story });
        document.getElementById('storyAddModal').classList.remove('show');
        document.getElementById('storyTextInput').value = '';
        renderStories();
        alert('История опубликована!');
    };
    document.querySelector('.close-viewer').onclick = () => document.getElementById('storyViewer').classList.remove('show');
}

function renderStories() {
    const container = document.getElementById('storiesList');
    const sorted = [...stories].sort((a,b) => b.time - a.time);
    if (sorted.length === 0) { container.innerHTML = '<div class="empty-state">📸 Нет историй. Добавьте первую!</div>'; return; }
    container.innerHTML = sorted.map(s => `
        <div class="story-card" data-id="${s.id}">
            <div class="story-author">
                <div class="story-author-avatar">${s.userAvatar || '👤'}</div>
                <div>
                    <div class="story-author-name">${s.userName}</div>
                    <div class="story-text-preview">${s.text.substring(0, 50)}${s.text.length > 50 ? '...' : ''}</div>
                </div>
            </div>
            <div class="story-time">${formatTime(s.time)}</div>
        </div>
    `).join('');
    document.querySelectorAll('.story-card').forEach(el => {
        el.onclick = () => {
            const story = stories.find(s => s.id == el.dataset.id);
            if (story) {
                document.getElementById('storyViewerContent').style.background = story.bgColor;
                document.getElementById('viewerStoryText').innerText = story.text;
                document.getElementById('viewerStoryInfo').innerHTML = `${story.userName} • ${new Date(story.time).toLocaleString()}`;
                document.getElementById('storyViewer').classList.add('show');
            }
        };
    });
}

function formatTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'только что';
    if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ч`;
    return `${Math.floor(h / 24)} д`;
}

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// ========== ЗАПУСК ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupAuth();
    setupMenu();
    setupProfile();
    setupPremium();
    setupSearch();
    setupChat();
    setupStories();
});
