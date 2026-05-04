// ========== ГЛОБАЛЬНЫЕ ДАННЫЕ ==========
let currentUser = null;
let currentChat = null;
let allUsers = [];
let stories = [];
let premiumUsers = [];
let broadcastChannel = null;

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadData() {
    // Загружаем пользователей
    const storedUsers = localStorage.getItem('logogramm_users');
    if (storedUsers) {
        allUsers = JSON.parse(storedUsers);
    } else {
        allUsers = [];
    }
    
    // Загружаем Premium
    const storedPremium = localStorage.getItem('logogramm_premium');
    if (storedPremium) {
        premiumUsers = JSON.parse(storedPremium);
    } else {
        premiumUsers = [];
    }
    
    // Загружаем сторис
    const storedStories = localStorage.getItem('logogramm_stories');
    if (storedStories) {
        stories = JSON.parse(storedStories);
    } else {
        stories = [];
    }
    
    // Загружаем текущего пользователя
    const savedUser = localStorage.getItem('logogramm_currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        const userInList = allUsers.find(u => u.id === currentUser.id);
        if (!userInList) {
            allUsers.push(currentUser);
            saveAllUsers();
        }
    }
}

function saveAllUsers() {
    localStorage.setItem('logogramm_users', JSON.stringify(allUsers));
}

function savePremium() {
    localStorage.setItem('logogramm_premium', JSON.stringify(premiumUsers));
}

function saveStories() {
    localStorage.setItem('logogramm_stories', JSON.stringify(stories));
}

function saveCurrentUser() {
    localStorage.setItem('logogramm_currentUser', JSON.stringify(currentUser));
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

// ========== BROADCAST CHANNEL ==========
function setupBroadcastChannel() {
    if (broadcastChannel) broadcastChannel.close();
    
    broadcastChannel = new BroadcastChannel('logogramm_live');
    
    broadcastChannel.onmessage = (event) => {
        const data = event.data;
        
        if (data.type === 'new_message') {
            if (data.to === currentUser?.id) {
                const chatKey = getChatKey(data.from, data.to);
                const messages = getMessages(chatKey);
                messages.push({
                    id: data.messageId,
                    text: data.text,
                    senderId: data.from,
                    timestamp: data.timestamp
                });
                saveMessages(chatKey, messages);
                
                if (currentChat && currentChat.id === data.from) {
                    renderMessages();
                }
                renderChatsList();
                
                const sender = allUsers.find(u => u.id === data.from);
                if (sender && document.hidden) {
                    showNotification(sender.name, data.text);
                }
            }
        }
        
        if (data.type === 'new_story') {
            stories.push(data.story);
            saveStories();
            if (document.getElementById('storiesTab').classList.contains('active')) {
                renderStories();
            }
        }
    };
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body });
    }
}

// ========== АВТОРИЗАЦИЯ ==========
function setupAuth() {
    if (currentUser) {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        updateUI();
        renderChatsList();
        renderContactsList();
        renderStories();
        setupBroadcastChannel();
        return;
    }
    
    document.getElementById('registerBtn').onclick = () => {
        const nickname = document.getElementById('loginNickname').value.trim().toLowerCase();
        const name = document.getElementById('loginName').value.trim();
        
        if (!nickname || !name) {
            alert('Заполните все поля');
            return;
        }
        
        if (allUsers.find(u => u.nickname === nickname)) {
            alert('Этот ник уже занят!');
            return;
        }
        
        currentUser = {
            id: 'user_' + Date.now(),
            nickname: nickname,
            name: name,
            avatar: '👤',
            bio: ''
        };
        
        allUsers.push(currentUser);
        saveAllUsers();
        saveCurrentUser();
        
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        updateUI();
        renderChatsList();
        renderContactsList();
        renderStories();
        setupBroadcastChannel();
        
        // Запрос на уведомления
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    };
}

// ========== UI ==========
function updateUI() {
    if (!currentUser) return;
    document.getElementById('menuName').innerText = currentUser.name;
    document.getElementById('menuNick').innerText = '@' + currentUser.nickname;
    document.getElementById('menuAvatar').innerText = currentUser.avatar;
    document.getElementById('profileAvatar').innerText = currentUser.avatar;
    document.getElementById('profileNameInput').value = currentUser.name;
    document.getElementById('profileNicknameInput').value = currentUser.nickname;
    document.getElementById('profileBioInput').value = currentUser.bio || '';
    
    const hasPremiumStatus = hasPremium(currentUser.id);
    document.getElementById('premiumBadgeMini').style.display = hasPremiumStatus ? 'inline-block' : 'none';
    document.getElementById('premiumStatus').innerHTML = hasPremiumStatus ? '⭐ У вас активен Premium!' : '✨ Оформите Premium для эксклюзивных функций';
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
            if (tab === 'stories') renderStories();
        };
    });
    
    document.getElementById('openProfileBtn').onclick = () => {
        document.getElementById('profileModal').classList.add('active');
        document.getElementById('mobileMenu').classList.remove('open');
    };
    
    document.getElementById('openPremiumBtn').onclick = () => {
        document.getElementById('premiumModal').classList.add('active');
        document.getElementById('mobileMenu').classList.remove('open');
    };
    
    document.getElementById('logoutBtn').onclick = () => {
        if (confirm('Выйти из аккаунта?')) {
            localStorage.removeItem('logogramm_currentUser');
            if (broadcastChannel) broadcastChannel.close();
            currentUser = null;
            location.reload();
        }
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
    document.querySelector('.close-profile').onclick = () => {
        document.getElementById('profileModal').classList.remove('active');
    };
    
    document.getElementById('saveProfileChangesBtn').onclick = () => {
        const newName = document.getElementById('profileNameInput').value;
        const newNickname = document.getElementById('profileNicknameInput').value.trim().toLowerCase();
        const newBio = document.getElementById('profileBioInput').value;
        
        if (newNickname !== currentUser.nickname) {
            if (allUsers.find(u => u.nickname === newNickname && u.id !== currentUser.id)) {
                alert('Этот ник уже занят!');
                return;
            }
        }
        
        currentUser.name = newName;
        currentUser.nickname = newNickname;
        currentUser.bio = newBio;
        
        const userInList = allUsers.find(u => u.id === currentUser.id);
        if (userInList) {
            userInList.name = newName;
            userInList.nickname = newNickname;
            userInList.bio = newBio;
        }
        
        saveAllUsers();
        saveCurrentUser();
        updateUI();
        renderChatsList();
        renderContactsList();
        document.getElementById('profileModal').classList.remove('active');
        alert('Профиль обновлён!');
    };
}

// ========== PREMIUM ==========
function setupPremium() {
    document.querySelector('.close-premium').onclick = () => {
        document.getElementById('premiumModal').classList.remove('active');
    };
    
    document.querySelectorAll('.plan-card').forEach(card => {
        card.onclick = () => {
            const months = parseInt(card.dataset.months);
            let price = months === 1 ? 100 : months === 3 ? 300 : 700;
            
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
                alert('⭐ Premium оформлен! Спасибо за покупку!');
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
    
    document.querySelector('.close-story').onclick = () => {
        document.getElementById('storyModal').classList.remove('active');
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
        
        const story = {
            id: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            text: text,
            bgColor: bgColor,
            timestamp: Date.now()
        };
        
        stories.push(story);
        saveStories();
        
        if (broadcastChannel) {
            broadcastChannel.postMessage({
                type: 'new_story',
                story: story
            });
        }
        
        document.getElementById('storyModal').classList.remove('active');
        document.getElementById('storyText').value = '';
        renderStories();
        alert('История опубликована!');
    };
    
    document.querySelector('.close-viewer').onclick = () => {
        document.getElementById('storyViewer').style.display = 'none';
    };
}

function renderStories() {
    const container = document.getElementById('storiesList');
    const sortedStories = [...stories].sort((a, b) => b.timestamp - a.timestamp);
    
    if (sortedStories.length === 0) {
        container.innerHTML = '<div class="placeholder">📸 Нет историй. Добавьте первую!</div>';
        return;
    }
    
    container.innerHTML = sortedStories.map(story => `
        <div class="story-item" data-story-id="${story.id}">
            <div class="story-author">
                <div class="story-author-avatar">${story.userAvatar || '👤'}</div>
                <div>
                    <div class="story-author-name">${story.userName}</div>
                    <div class="story-text">${story.text.substring(0, 50)}${story.text.length > 50 ? '...' : ''}</div>
                </div>
            </div>
            <div class="story-time">${formatTime(story.timestamp)}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.story-item').forEach(el => {
        el.onclick = () => {
            const storyId = parseInt(el.dataset.storyId);
            const story = stories.find(s => s.id === storyId);
            if (story) {
                const viewer = document.getElementById('storyViewer');
                const content = document.getElementById('storyViewerContent');
                content.style.background = story.bgColor;
                document.getElementById('viewerText').innerText = story.text;
                document.getElementById('viewerInfo').innerHTML = `${story.userName} • ${new Date(story.timestamp).toLocaleString()}`;
                viewer.style.display = 'flex';
            }
        };
    });
}

function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} д назад`;
}

// ========== ПОИСК ==========
function setupGlobalSearch() {
    const searchBtn = document.getElementById('searchGlobalBtn');
    const searchPanel = document.getElementById('searchPanel');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const searchInput = document.getElementById('globalSearchInput');
    const resultsDiv = document.getElementById('globalSearchResults');
    
    searchBtn.onclick = () => {
        searchPanel.style.display = 'flex';
        searchInput.focus();
    };
    
    closeSearchBtn.onclick = () => {
        searchPanel.style.display = 'none';
        searchInput.value = '';
        resultsDiv.innerHTML = '';
    };
    
    searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase().trim();
        
        if (query.length === 0) {
            resultsDiv.innerHTML = '';
            return;
        }
        
        const matches = allUsers.filter(u => 
            u.id !== currentUser?.id && 
            (u.nickname.includes(query) || u.name.toLowerCase().includes(query))
        );
        
        if (matches.length === 0) {
            resultsDiv.innerHTML = '<div class="placeholder">😕 Пользователи не найдены</div>';
            return;
        }
        
        resultsDiv.innerHTML = matches.map(user => `
            <div class="search-result-user" data-user-id="${user.id}">
                <div class="search-result-info">
                    <div class="search-result-avatar">${user.avatar || '👤'}</div>
                    <div class="search-result-details">
                        <div class="search-result-name">${user.name}</div>
                        <div class="search-result-nick">@${user.nickname}</div>
                    </div>
                </div>
                <button class="write-btn" data-user-id="${user.id}">✉️ Написать</button>
            </div>
        `).join('');
        
        document.querySelectorAll('.write-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const userId = btn.dataset.userId;
                const user = allUsers.find(u => u.id === userId);
                if (user) {
                    searchPanel.style.display = 'none';
                    openChat(user);
                }
            };
        });
        
        document.querySelectorAll('.search-result-user').forEach(el => {
            el.onclick = () => {
                const userId = el.dataset.userId;
                const user = allUsers.find(u => u.id === userId);
                if (user) {
                    searchPanel.style.display = 'none';
                    openChat(user);
                }
            };
        });
    };
}

// ========== ЧАТЫ ==========
function getChatKey(id1, id2) {
    const ids = [id1, id2].sort();
    return `chat_${ids[0]}_${ids[1]}`;
}

function getMessages(chatKey) {
    const stored = localStorage.getItem(chatKey);
    return stored ? JSON.parse(stored) : [];
}

function saveMessages(chatKey, messages) {
    localStorage.setItem(chatKey, JSON.stringify(messages));
}

function renderChatsList() {
    const container = document.getElementById('chatsList');
    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);
    
    if (otherUsers.length === 0) {
        container.innerHTML = '<div class="placeholder">🔍 Нажмите на поиск, чтобы найти пользователя</div>';
        return;
    }
    
    const chatsWithLastMsg = otherUsers.map(user => {
        const chatKey = getChatKey(currentUser.id, user.id);
        const messages = getMessages(chatKey);
        const lastMsg = messages[messages.length - 1];
        return {
            user: user,
            lastMsg: lastMsg,
            lastMsgTime: lastMsg ? lastMsg.timestamp : 0
        };
    }).sort((a, b) => b.lastMsgTime - a.lastMsgTime);
    
    container.innerHTML = chatsWithLastMsg.map(({user, lastMsg}) => {
        const preview = lastMsg ? (lastMsg.senderId === currentUser.id ? `Вы: ${lastMsg.text}` : lastMsg.text) : 'Нет сообщений';
        const hasPrm = hasPremium(user.id);
        return `
            <div class="chat-item" data-user-id="${user.id}">
                <div class="chat-avatar">${user.avatar || '👤'}</div>
                <div class="chat-info">
                    <div class="chat-name">${user.name} ${hasPrm ? '⭐' : ''}</div>
                    <div class="chat-preview">${preview.substring(0, 40)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.chat-item').forEach(el => {
        el.onclick = () => {
            const userId = el.dataset.userId;
            const user = allUsers.find(u => u.id === userId);
            if (user) openChat(user);
        };
    });
}

function renderContactsList() {
    const container = document.getElementById('contactsList');
    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);
    
    if (otherUsers.length === 0) {
        container.innerHTML = '<div class="placeholder">👥 Здесь появятся другие пользователи</div>';
        return;
    }
    
    container.innerHTML = otherUsers.map(user => `
        <div class="contact-item" data-user-id="${user.id}">
            <div class="contact-avatar">${user.avatar || '👤'}</div>
            <div class="contact-info">
                <div class="contact-name">${user.name} ${hasPremium(user.id) ? '⭐' : ''}</div>
                <div class="contact-nick">@${user.nickname}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.contact-item').forEach(el => {
        el.onclick = () => {
            const userId = el.dataset.userId;
            const user = allUsers.find(u => u.id === userId);
            if (user) openChat(user);
        };
    });
}

function openChat(user) {
    currentChat = user;
    document.getElementById('chatUserName').innerText = user.name;
    document.getElementById('chatUserNick').innerText = '@' + user.nickname;
    document.getElementById('chatView').style.display = 'flex';
    document.getElementById('mobileContent').style.display = 'none';
    renderMessages();
}

function renderMessages() {
    const container = document.getElementById('messagesArea');
    if (!currentChat) return;
    
    const chatKey = getChatKey(currentUser.id, currentChat.id);
    const messages = getMessages(chatKey);
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="placeholder">💬 Напишите первое сообщение</div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.senderId === currentUser.id ? 'message-outgoing' : 'message-incoming'}">
            <div class="message-text">${escapeHtml(msg.text)}</div>
            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChat) {
        console.log('Не могу отправить:', {text, currentChat});
        return;
    }
    
    const message = {
        id: Date.now(),
        text: text,
        senderId: currentUser.id,
        timestamp: Date.now()
    };
    
    // Сохраняем у себя
    const chatKey = getChatKey(currentUser.id, currentChat.id);
    const messages = getMessages(chatKey);
    messages.push(message);
    saveMessages(chatKey, messages);
    
    // Отправляем через BroadcastChannel
    if (broadcastChannel) {
        broadcastChannel.postMessage({
            type: 'new_message',
            from: currentUser.id,
            to: currentChat.id,
            messageId: message.id,
            text: text,
            timestamp: message.timestamp
        });
    } else {
        console.log('BroadcastChannel не инициализирован');
    }
    
    input.value = '';
    renderMessages();
    renderChatsList();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== ЗАКРЫТИЕ ЧАТА ==========
function setupChatClose() {
    document.getElementById('closeChatBtn').onclick = () => {
        document.getElementById('chatView').style.display = 'none';
        document.getElementById('mobileContent').style.display = 'block';
        currentChat = null;
        renderChatsList();
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
    setupGlobalSearch();
    setupChatClose();
});
