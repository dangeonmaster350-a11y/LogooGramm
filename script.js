
// ========== ГЛОБАЛЬНЫЕ ДАННЫЕ ==========
let currentUser = null;
let currentChat = null;
let allUsers = [];
let userChats = [];
let stories = [];
let premiumUsers = []; // ID пользователей с Premium

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadData() {
    const storedUsers = localStorage.getItem('logogramm_users');
    if (storedUsers) {
        allUsers = JSON.parse(storedUsers);
    } else {
        allUsers = [
            { id: 'user1', nickname: 'monke', name: 'Monke', phone: '+79991234567', bio: '🐒 Король обезьян', avatar: '🐒', online: true },
            { id: 'user2', nickname: 'alex', name: 'Алексей', phone: '+79997654321', bio: 'Разработчик', avatar: '👨‍💻', online: false },
            { id: 'user3', nickname: 'maria', name: 'Мария', phone: '+79991112233', bio: 'Дизайнер', avatar: '👩‍🎨', online: false }
        ];
        saveUsers();
    }
    
    // Бесплатный Premium для monke на 1 год
    const storedPremium = localStorage.getItem('logogramm_premium');
    if (storedPremium) {
        premiumUsers = JSON.parse(storedPremium);
    } else {
        // Даём Premium пользователю monke
        const monkeUser = allUsers.find(u => u.nickname === 'monke');
        if (monkeUser) {
            premiumUsers.push({
                userId: monkeUser.id,
                expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 год
            });
        }
        savePremium();
    }
    
    const storedStories = localStorage.getItem('logogramm_stories');
    if (storedStories) {
        stories = JSON.parse(storedStories);
    }
}

function saveUsers() {
    localStorage.setItem('logogramm_users', JSON.stringify(allUsers));
}

function savePremium() {
    localStorage.setItem('logogramm_premium', JSON.stringify(premiumUsers));
}

function saveStories() {
    localStorage.setItem('logogramm_stories', JSON.stringify(stories));
}

// Проверка Premium
function hasPremium(userId) {
    const premium = premiumUsers.find(p => p.userId === userId);
    if (!premium) return false;
    if (premium.expiresAt < Date.now()) {
        premiumUsers = premiumUsers.filter(p => p.userId !== userId);
        savePremium();
        return false;
    }
    return true;
}

// ========== АВТОРИЗАЦИЯ ==========
function setupAuth() {
    document.getElementById('registerBtn').onclick = () => {
        const phone = document.getElementById('phoneInput').value;
        const nickname = document.getElementById('nicknameInput').value.trim();
        const name = document.getElementById('nameInput').value.trim();
        
        if (!phone || !nickname || !name) {
            alert('Заполните все поля');
            return;
        }
        
        let existing = allUsers.find(u => u.nickname === nickname);
        if (existing) {
            alert('Ник уже занят');
            return;
        }
        
        currentUser = {
            id: 'user_' + Date.now(),
            nickname: nickname,
            name: name,
            phone: phone,
            bio: 'Привет! Я в LogoGramm',
            avatar: '👤',
            online: true
        };
        allUsers.push(currentUser);
        saveUsers();
        
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        
        updateUI();
        renderChatsList();
        renderContactsList();
        renderStories();
        
        updateOnlineStatus();
        setInterval(() => updateOnlineStatus(), 30000);
    };
}

function updateUI() {
    document.getElementById('menuName').innerText = currentUser.name;
    document.getElementById('menuNick').innerText = '@' + currentUser.nickname;
    document.getElementById('menuAvatar').innerText = currentUser.avatar;
    document.getElementById('profileDisplayName').innerText = currentUser.name;
    document.getElementById('profileUsername').innerText = '@' + currentUser.nickname;
    document.getElementById('profileBio').innerText = currentUser.bio || '';
    document.getElementById('phoneDisplay').innerText = currentUser.phone;
    
    const hasPremiumStatus = hasPremium(currentUser.id);
    if (hasPremiumStatus) {
        document.getElementById('premiumBadge').style.display = 'inline-block';
        document.getElementById('profilePremiumSection').style.display = 'block';
    } else {
        document.getElementById('premiumBadge').style.display = 'none';
        document.getElementById('profilePremiumSection').style.display = 'block';
    }
}

// ========== МЕНЮ ==========
function setupMenu() {
    document.getElementById('menuToggleBtn').onclick = () => {
        document.getElementById('mobileMenu').classList.add('open');
    };
    
    document.querySelectorAll('.menu-item[data-tab]').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`${tab}Tab`).classList.add('active');
            document.getElementById('mobileMenu').classList.remove('open');
        };
    });
    
    document.getElementById('openProfileFromMenu').onclick = () => {
        document.getElementById('profileModal').classList.add('active');
        document.getElementById('mobileMenu').classList.remove('open');
    };
    
    document.getElementById('openPremiumFromMenu').onclick = () => {
        document.getElementById('premiumModal').classList.add('active');
        document.getElementById('mobileMenu').classList.remove('open');
    };
    
    document.getElementById('logoutBtnMenu').onclick = () => {
        currentUser = null;
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mobileMenu').classList.remove('open');
    };
    
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('mobileMenu');
        if (menu.classList.contains('open') && !menu.contains(e.target) && !document.getElementById('menuToggleBtn').contains(e.target)) {
            menu.classList.remove('open');
        }
    });
}

// ========== ПРОФИЛЬ ==========
function setupProfile() {
    document.querySelectorAll('.close-modal-profile, .close-premium, .close-story').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('profileModal').classList.remove('active');
            document.getElementById('premiumModal').classList.remove('active');
            document.getElementById('storyModal').classList.remove('active');
        };
    });
    
    document.getElementById('editProfileBtn').onclick = () => {
        const newName = prompt('Новое имя:', currentUser.name);
        const newBio = prompt('О себе:', currentUser.bio);
        if (newName) currentUser.name = newName;
        if (newBio) currentUser.bio = newBio;
        updateUI();
        renderChatsList();
    };
    
    document.getElementById('openPremiumFromProfile').onclick = () => {
        document.getElementById('profileModal').classList.remove('active');
        document.getElementById('premiumModal').classList.add('active');
    };
}

// ========== PREMIUM ==========
function setupPremium() {
    // Бесплатный Premium для monke
    const monkeUser = allUsers.find(u => u.nickname === 'monke');
    if (monkeUser && currentUser?.id === monkeUser.id) {
        if (!hasPremium(monkeUser.id)) {
            premiumUsers.push({
                userId: monkeUser.id,
                expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
            });
            savePremium();
            updateUI();
        }
    }
    
    document.querySelectorAll('.plan-card').forEach(card => {
        card.onclick = () => {
            const months = parseInt(card.dataset.months);
            let price = 0;
            if (months === 1) price = 100;
            else if (months === 3) price = 300;
            else price = 700;
            
            if (confirm(`Оформить Logo Premium на ${months} мес. за ${price}₽?`)) {
                const existing = premiumUsers.find(p => p.userId === currentUser.id);
                if (existing) {
                    existing.expiresAt += months * 30 * 24 * 60 * 60 * 1000;
                } else {
                    premiumUsers.push({
                        userId: currentUser.id,
                        expiresAt: Date.now() + months * 30 * 24 * 60 * 60 * 1000
                    });
                }
                savePremium();
                updateUI();
                alert('Premium оформлен! Спасибо за покупку 🎉');
                document.getElementById('premiumModal').classList.remove('active');
            }
        };
    });
}

// ========== СТОРИС ==========
function setupStories() {
    document.getElementById('addStoryBtn').onclick = () => {
        document.getElementById('storyModal').classList.add('active');
    };
    
    document.getElementById('storyText').oninput = () => {
        document.getElementById('previewText').innerText = document.getElementById('storyText').value || 'Текст истории';
    };
    
    document.getElementById('storyBgColor').onchange = () => {
        document.getElementById('storyPreview').style.background = document.getElementById('storyBgColor').value;
    };
    
    document.getElementById('publishStoryBtn').onclick = () => {
        const text = document.getElementById('storyText').value;
        const bgColor = document.getElementById('storyBgColor').value;
        
        if (!text) {
            alert('Введите текст истории');
            return;
        }
        
        stories.push({
            id: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            text: text,
            bgColor: bgColor,
            timestamp: Date.now()
        });
        saveStories();
        renderStories();
        document.getElementById('storyModal').classList.remove('active');
        document.getElementById('storyText').value = '';
    };
}

function renderStories() {
    const container = document.getElementById('storiesList');
    const myStories = stories.filter(s => s.userId === currentUser?.id);
    const otherStories = stories.filter(s => s.userId !== currentUser?.id);
    const allStories = [...myStories, ...otherStories];
    
    if (allStories.length === 0) {
        container.innerHTML = '<div class="placeholder">Нет историй. Добавьте первую!</div>';
        return;
    }
    
    container.innerHTML = allStories.map(story => `
        <div class="story-item" data-story-id="${story.id}">
            <div class="story-author">
                <div class="story-author-avatar">${story.userAvatar || '👤'}</div>
                <div>
                    <div class="story-author-name">${story.userName}</div>
                    <div class="story-text">${story.text.substring(0, 50)}${story.text.length > 50 ? '...' : ''}</div>
                </div>
            </div>
            <div class="story-time">${new Date(story.timestamp).toLocaleTimeString()}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.story-item').forEach(el => {
        el.onclick = () => {
            const storyId = parseInt(el.dataset.storyId);
            const story = stories.find(s => s.id === storyId);
            if (story) {
                document.getElementById('viewerText').innerText = story.text;
                document.getElementById('storyViewerContent').style.background = story.bgColor;
                document.getElementById('storyViewer').style.display = 'flex';
                document.getElementById('viewerInfo').innerHTML = `${story.userName} • ${new Date(story.timestamp).toLocaleString()}`;
            }
        };
    });
    
    document.querySelector('.close-viewer').onclick = () => {
        document.getElementById('storyViewer').style.display = 'none';
    };
}

// ========== ЧАТЫ ==========
function renderChatsList() {
    const container = document.getElementById('chatsList');
    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);
    
    if (otherUsers.length === 0) {
        container.innerHTML = '<div class="placeholder">Нет контактов</div>';
        return;
    }
    
    container.innerHTML = otherUsers.map(user => `
        <div class="chat-item" data-user-id="${user.id}">
            <div class="chat-avatar">${user.avatar || '👤'}</div>
            <div class="chat-info">
                <div class="chat-name">${user.name} ${hasPremium(user.id) ? '⭐' : ''}</div>
                <div class="chat-preview">@${user.nickname}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.chat-item').forEach(el => {
        el.onclick = () => {
            const userId = el.dataset.userId;
            openChat(userId);
        };
    });
}

function renderContactsList() {
    const container = document.getElementById('contactsList');
    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);
    
    container.innerHTML = otherUsers.map(user => `
        <div class="contact-item" data-user-id="${user.id}">
            <div class="contact-avatar">${user.avatar || '👤'}</div>
            <div class="contact-info">
                <div class="contact-name">${user.name}</div>
                <div class="contact-nick">@${user.nickname}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.contact-item').forEach(el => {
        el.onclick = () => {
            const userId = el.dataset.userId;
            openChat(userId);
        };
    });
}

function openChat(userId) {
    const otherUser = allUsers.find(u => u.id === userId);
    if (!otherUser) return;
    
    currentChat = otherUser;
    document.getElementById('chatUserName').innerText = otherUser.name;
    document.getElementById('chatUserStatus').innerHTML = otherUser.online ? '🟢 онлайн' : '⚫ не в сети';
    document.getElementById('chatView').style.display = 'flex';
    document.getElementById('mobileContent').style.display = 'none';
    
    renderMessages();
}

function renderMessages() {
    const container = document.getElementById('messagesArea');
    const chatKey = `chat_${currentUser?.id}_${currentChat?.id}`;
    const stored = localStorage.getItem(chatKey);
    const messages = stored ? JSON.parse(stored) : [];
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="placeholder">Напишите первое сообщение</div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.senderId === currentUser?.id ? 'message-outgoing' : 'message-incoming'}">
            <div class="message-text">${escapeHtml(msg.text)}</div>
            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input.value.trim() || !currentChat) return;
    
    const msg = {
        id: Date.now(),
        text: input.value,
        senderId: currentUser.id,
        timestamp: Date.now()
    };
    
    const chatKey = `chat_${currentUser.id}_${currentChat.id}`;
    const stored = localStorage.getItem(chatKey);
    const messages = stored ? JSON.parse(stored) : [];
    messages.push(msg);
    localStorage.setItem(chatKey, JSON.stringify(messages));
    
    // Сохраняем и для другого пользователя
    const chatKey2 = `chat_${currentChat.id}_${currentUser.id}`;
    const stored2 = localStorage.getItem(chatKey2);
    const messages2 = stored2 ? JSON.parse(stored2) : [];
    messages2.push(msg);
    localStorage.setItem(chatKey2, JSON.stringify(messages2));
    
    input.value = '';
    renderMessages();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== ОНЛАЙН СТАТУС ==========
function updateOnlineStatus() {
    if (!currentUser) return;
    const userInList = allUsers.find(u => u.id === currentUser.id);
    if (userInList) {
        userInList.online = true;
        saveUsers();
    }
}

// ========== ПОИСК ==========
function setupSearch() {
    document.getElementById('searchChats').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => u.id !== currentUser?.id && 
            (u.nickname.toLowerCase().includes(query) || u.name.toLowerCase().includes(query)));
        
        const container = document.getElementById('chatsList');
        container.innerHTML = filtered.map(user => `
            <div class="chat-item" data-user-id="${user.id}">
                <div class="chat-avatar">${user.avatar || '👤'}</div>
                <div class="chat-info">
                    <div class="chat-name">${user.name}</div>
                    <div class="chat-preview">@${user.nickname}</div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.chat-item').forEach(el => {
            el.onclick = () => openChat(el.dataset.userId);
        });
    };
    
    document.getElementById('searchContacts').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => u.id !== currentUser?.id && 
            (u.nickname.toLowerCase().includes(query) || u.name.toLowerCase().includes(query)));
        
        const container = document.getElementById('contactsList');
        container.innerHTML = filtered.map(user => `
            <div class="contact-item" data-user-id="${user.id}">
                <div class="contact-avatar">${user.avatar || '👤'}</div>
                <div class="contact-info">
                    <div class="contact-name">${user.name}</div>
                    <div class="contact-nick">@${user.nickname}</div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.contact-item').forEach(el => {
            el.onclick = () => openChat(el.dataset.userId);
        });
    };
}

// ========== ЗАКРЫТИЕ ЧАТА ==========
function setupChatClose() {
    document.getElementById('closeChatBtn').onclick = () => {
        document.getElementById('chatView').style.display = 'none';
        document.getElementById('mobileContent').style.display = 'block';
        currentChat = null;
    };
    
    document.getElementById('sendMsgBtn').onclick = sendMessage;
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupAuth();
    setupMenu();
    setupProfile();
    setupPremium();
    setupStories();
    setupSearch();
    setupChatClose();
});
