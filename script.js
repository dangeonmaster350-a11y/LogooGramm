// ========== ГЛОБАЛЬНЫЕ ДАННЫЕ ==========
let currentUser = null;
let currentChat = null;
let allUsers = [];
let broadcastChannel = null;

// ========== ЗАГРУЗКА СОХРАНЁННОГО АККАУНТА ==========
function loadSavedUser() {
    const savedUser = localStorage.getItem('logogramm_currentUser');
    const storedUsers = localStorage.getItem('logogramm_allUsers');
    
    if (storedUsers) {
        allUsers = JSON.parse(storedUsers);
    } else {
        allUsers = [];
    }
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        const userInList = allUsers.find(u => u.id === currentUser.id);
        if (userInList) {
            currentUser = userInList;
        } else {
            allUsers.push(currentUser);
            saveAllUsers();
        }
        
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        updateUI();
        renderChatsList();
        renderContactsList();
        setupBroadcastChannel();
    }
}

function saveCurrentUser() {
    localStorage.setItem('logogramm_currentUser', JSON.stringify(currentUser));
}

function saveAllUsers() {
    localStorage.setItem('logogramm_allUsers', JSON.stringify(allUsers));
}

// ========== BROADCAST CHANNEL (доставка сообщений между вкладками) ==========
function setupBroadcastChannel() {
    if (broadcastChannel) {
        broadcastChannel.close();
    }
    
    broadcastChannel = new BroadcastChannel('logogramm_messages');
    
    broadcastChannel.onmessage = (event) => {
        const data = event.data;
        
        if (data.type === 'new_message') {
            // Проверяем, что сообщение для текущего пользователя
            if (data.to === currentUser.id) {
                // Сохраняем сообщение
                const chatKey = getChatKey(data.from, data.to);
                const messages = getMessages(chatKey);
                messages.push({
                    id: data.messageId,
                    text: data.text,
                    senderId: data.from,
                    timestamp: data.timestamp
                });
                saveMessages(chatKey, messages);
                
                // Если этот чат открыт сейчас — обновляем
                if (currentChat && currentChat.id === data.from) {
                    renderMessages();
                }
                
                // Обновляем список чатов
                renderChatsList();
                
                // Уведомление
                const sender = allUsers.find(u => u.id === data.from);
                if (sender && document.hidden) {
                    showNotification(sender.name, data.text);
                }
            }
        }
    };
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// ========== АВТОРИЗАЦИЯ ==========
function setupAuth() {
    document.getElementById('registerBtn').onclick = () => {
        const nickname = document.getElementById('loginNickname').value.trim().toLowerCase();
        const name = document.getElementById('loginName').value.trim();
        
        if (!nickname || !name) {
            alert('Заполните все поля');
            return;
        }
        
        // Проверяем уникальность ника
        const existing = allUsers.find(u => u.nickname === nickname);
        if (existing) {
            alert('Этот ник уже занят!');
            return;
        }
        
        currentUser = {
            id: 'user_' + Date.now(),
            nickname: nickname,
            name: name,
            avatar: '👤'
        };
        
        allUsers.push(currentUser);
        saveAllUsers();
        saveCurrentUser();
        
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        updateUI();
        renderChatsList();
        renderContactsList();
        setupBroadcastChannel();
    };
}

// ========== ОБНОВЛЕНИЕ UI ==========
function updateUI() {
    if (!currentUser) return;
    document.getElementById('menuName').innerText = currentUser.name;
    document.getElementById('menuNick').innerText = '@' + currentUser.nickname;
    document.getElementById('menuAvatar').innerText = currentUser.avatar || '👤';
    document.getElementById('profileAvatar').innerText = currentUser.avatar || '👤';
    document.getElementById('profileNameInput').value = currentUser.name;
    document.getElementById('profileNicknameInput').value = currentUser.nickname;
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
    
    document.getElementById('openProfileBtn').onclick = () => {
        document.getElementById('profileModal').classList.add('active');
        document.getElementById('mobileMenu').classList.remove('open');
    };
    
    document.getElementById('logoutBtn').onclick = () => {
        if (confirm('Выйти из аккаунта?')) {
            localStorage.removeItem('logogramm_currentUser');
            if (broadcastChannel) broadcastChannel.close();
            currentUser = null;
            document.getElementById('mainScreen').style.display = 'none';
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('mobileMenu').classList.remove('open');
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
        
        if (newNickname !== currentUser.nickname) {
            const existing = allUsers.find(u => u.nickname === newNickname && u.id !== currentUser.id);
            if (existing) {
                alert('Этот ник уже занят!');
                return;
            }
        }
        
        currentUser.name = newName;
        currentUser.nickname = newNickname;
        
        const userInList = allUsers.find(u => u.id === currentUser.id);
        if (userInList) {
            userInList.name = newName;
            userInList.nickname = newNickname;
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

// ========== ГЛОБАЛЬНЫЙ ПОИСК С КНОПКОЙ "НАПИСАТЬ" ==========
function setupGlobalSearch() {
    const searchBtn = document.getElementById('searchGlobalBtn');
    const searchPanel = document.getElementById('searchPanel');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const searchInput = document.getElementById('globalSearchInput');
    const resultsDiv = document.getElementById('globalSearchResults');
    
    searchBtn.onclick = () => {
        searchPanel.style.display = 'flex';
        searchInput.focus();
        searchInput.value = '';
        resultsDiv.innerHTML = '';
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
        
        // Ищем пользователей (кроме себя)
        const matches = allUsers.filter(u => 
            u.id !== currentUser?.id && 
            (u.nickname.toLowerCase().includes(query) || u.name.toLowerCase().includes(query))
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
        
        // Обработчик для кнопки "Написать"
        document.querySelectorAll('.write-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const userId = btn.dataset.userId;
                const user = allUsers.find(u => u.id === userId);
                if (user) {
                    searchPanel.style.display = 'none';
                    searchInput.value = '';
                    openChat(user);
                }
            };
        });
        
        // Обработчик для клика на всю карточку
        document.querySelectorAll('.search-result-user').forEach(el => {
            el.onclick = () => {
                const userId = el.dataset.userId;
                const user = allUsers.find(u => u.id === userId);
                if (user) {
                    searchPanel.style.display = 'none';
                    searchInput.value = '';
                    openChat(user);
                }
            };
        });
    };
}

// ========== ОТОБРАЖЕНИЕ ЧАТОВ И КОНТАКТОВ ==========
function renderChatsList() {
    const container = document.getElementById('chatsList');
    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);
    
    if (otherUsers.length === 0) {
        container.innerHTML = '<div class="placeholder">📭 Нет чатов. Нажмите 🔍 чтобы найти пользователя</div>';
        return;
    }
    
    // Сортируем по последнему сообщению
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
        return `
            <div class="chat-item" data-user-id="${user.id}">
                <div class="chat-avatar">${user.avatar || '👤'}</div>
                <div class="chat-info">
                    <div class="chat-name">${user.name}</div>
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
        container.innerHTML = '<div class="placeholder">👥 Нет других пользователей</div>';
        return;
    }
    
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
            const user = allUsers.find(u => u.id === userId);
            if (user) openChat(user);
        };
    });
}

// ========== РАБОТА С СООБЩЕНИЯМИ ==========
function getChatKey(userId1, userId2) {
    const ids = [userId1, userId2].sort();
    return `chat_${ids[0]}_${ids[1]}`;
}

function getMessages(chatKey) {
    const stored = localStorage.getItem(chatKey);
    return stored ? JSON.parse(stored) : [];
}

function saveMessages(chatKey, messages) {
    localStorage.setItem(chatKey, JSON.stringify(messages));
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
    
    if (!text || !currentChat) return;
    
    const message = {
        id: Date.now(),
        text: text,
        senderId: currentUser.id,
        timestamp: Date.now()
    };
    
    // Сохраняем в свой чат
    const chatKey = getChatKey(currentUser.id, currentChat.id);
    const messages = getMessages(chatKey);
    messages.push(message);
    saveMessages(chatKey, messages);
    
    // Отправляем через BroadcastChannel другому пользователю
    if (broadcastChannel) {
        broadcastChannel.postMessage({
            type: 'new_message',
            from: currentUser.id,
            to: currentChat.id,
            messageId: message.id,
            text: text,
            timestamp: message.timestamp
        });
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
    loadSavedUser();
    setupAuth();
    setupMenu();
    setupProfile();
    setupGlobalSearch();
    setupChatClose();
    
    // Запрашиваем разрешение на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
