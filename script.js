const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEFAULT_MODEL = 'qwen3.6-plus';

let apiKey = '';
let currentModel = DEFAULT_MODEL;
let sessions = [];
let currentSessionId = null;
let sessionCounter = 0;
let isDarkMode = false;
let typingInterval = null;

const DOM = {
    apiKeyInput: document.getElementById('apiKey'),
    modelSelect: document.getElementById('modelSelect'),
    newChatBtn: document.getElementById('newChatBtn'),
    themeToggle: document.getElementById('themeToggle'),
    exportBtn: document.getElementById('exportBtn'),
    deleteCurrentChat: document.getElementById('deleteCurrentChat'),
    chatList: document.getElementById('chatList'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    chatContainer: document.getElementById('chatContainer'),
    chatTitle: document.getElementById('chatTitle'),
    messagesArea: document.getElementById('messagesArea'),
    welcomeMessage: document.getElementById('welcomeMessage'),
    modifyArea: document.getElementById('modifyArea'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorIndicator: document.getElementById('errorIndicator'),
    generateBtn: document.getElementById('generateBtn'),
    modifyBtn: document.getElementById('modifyBtn'),
    modifySuggestion: document.getElementById('modifySuggestion'),
    productName: document.getElementById('productName'),
    targetAudience: document.getElementById('targetAudience'),
    sellingPoints: document.getElementById('sellingPoints'),
    styleSelect: document.getElementById('style'),
    progressBar: document.getElementById('progressBar'),
    wordCount: document.getElementById('wordCount'),
    quickPrompts: document.querySelectorAll('.btn-quick')
};

DOM.apiKeyInput.addEventListener('input', () => {
    apiKey = DOM.apiKeyInput.value.trim();
    saveSettings();
});

DOM.modelSelect.addEventListener('change', () => {
    currentModel = DOM.modelSelect.value;
    saveSettings();
});

DOM.newChatBtn.addEventListener('click', createNewSession);
DOM.generateBtn.addEventListener('click', generateCopy);
DOM.modifyBtn.addEventListener('click', modifyCopy);
DOM.exportBtn.addEventListener('click', exportConversation);
DOM.deleteCurrentChat.addEventListener('click', () => deleteSession(currentSessionId));
DOM.themeToggle.addEventListener('click', toggleTheme);

DOM.modifySuggestion.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        modifyCopy();
    }
});

DOM.quickPrompts.forEach(btn => {
    btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        DOM.modifySuggestion.value = prompt;
        modifyCopy();
    });
});

function createNewSession() {
    const sessionNumber = sessions.length + 1;
    
    const session = {
        id: Date.now(),
        title: `新对话 ${sessionNumber}`,
        history: [],
        messages: []
    };
    
    sessions.unshift(session);
    renderChatList();
    switchToSession(session.id);
    saveSessions();
}

function switchToSession(sessionId) {
    currentSessionId = sessionId;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    DOM.welcomeScreen.classList.add('hidden');
    DOM.chatContainer.classList.remove('hidden');
    DOM.chatTitle.textContent = session.title;
    
    if (session.history.length === 0) {
        DOM.welcomeMessage.classList.remove('hidden');
        DOM.modifyArea.classList.add('hidden');
        DOM.messagesArea.innerHTML = '';
        DOM.messagesArea.appendChild(DOM.welcomeMessage);
    } else {
        DOM.welcomeMessage.classList.add('hidden');
        DOM.modifyArea.classList.remove('hidden');
        renderMessages(session.messages);
    }
    
    renderChatList();
}

function renderChatList() {
    DOM.chatList.innerHTML = '';
    
    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = `chat-item ${session.id === currentSessionId ? 'active' : ''}`;
        
        const title = document.createElement('span');
        title.className = 'chat-item-title';
        title.textContent = session.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'chat-item-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSession(session.id);
        });
        
        item.appendChild(title);
        item.appendChild(deleteBtn);
        
        item.addEventListener('click', () => {
            switchToSession(session.id);
        });
        
        DOM.chatList.appendChild(item);
    });
}

function deleteSession(sessionId) {
    sessions = sessions.filter(s => s.id !== sessionId);
    
    if (currentSessionId === sessionId) {
        if (sessions.length > 0) {
            switchToSession(sessions[0].id);
        } else {
            currentSessionId = null;
            DOM.welcomeScreen.classList.remove('hidden');
            DOM.chatContainer.classList.add('hidden');
        }
    }
    
    renderChatList();
    saveSessions();
}

async function generateCopy() {
    if (!apiKey) {
        showError('请先填写 API Key');
        return;
    }

    const productName = DOM.productName.value.trim();
    const targetAudience = DOM.targetAudience.value.trim();
    const sellingPoints = DOM.sellingPoints.value.trim();
    const style = DOM.styleSelect.value;

    if (!productName || !targetAudience || !sellingPoints) {
        showError('请填写完整的产品信息');
        return;
    }

    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    const systemPrompt = `你是一个专业的产品文案撰写专家。请根据用户提供的产品信息，生成吸引人的文案。`;
    
    const userPrompt = `请为以下产品生成文案：

产品名称：${productName}
目标受众：${targetAudience}
产品卖点：${sellingPoints}
文案风格：${style}

请生成以下内容：
1. 吸引人的标题（3-5个）
2. 产品介绍语（100-200字）
3. 宣传文案（适合社交媒体，50-100字）

请使用${style}的风格进行创作。`;

    session.history = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    session.messages = [
        { role: 'user', content: userPrompt, time: now }
    ];
    
    session.title = `${productName} 文案`;
    DOM.chatTitle.textContent = session.title;
    renderChatList();

    await callAPI(session);
}

async function modifyCopy() {
    const suggestion = DOM.modifySuggestion.value.trim();
    
    if (!suggestion) {
        showError('请输入修改建议');
        return;
    }

    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    session.history.push({ role: 'user', content: suggestion });
    
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    session.messages.push({ role: 'user', content: suggestion, time: now });
    
    DOM.modifySuggestion.value = '';
    
    await callAPI(session);
}

async function callAPI(session) {
    showLoading(true);
    hideError();
    DOM.progressBar.classList.add('active');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: currentModel,
                messages: session.history
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `请求失败: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        session.history.push({ role: 'assistant', content: aiResponse });
        
        const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        session.messages.push({ role: 'assistant', content: aiResponse, time: now });
        
        DOM.welcomeMessage.classList.add('hidden');
        DOM.modifyArea.classList.remove('hidden');
        await typeMessage(session.messages[session.messages.length - 1], session);
        
    } catch (error) {
        showError(`发生错误: ${error.message}`);
        session.history.pop();
        session.messages.pop();
    } finally {
        showLoading(false);
        DOM.progressBar.classList.remove('active');
        saveSessions();
    }
}

function renderMessages(messages) {
    DOM.messagesArea.innerHTML = '';
    
    messages.forEach((msg) => {
        appendMessage(msg);
    });
    
    updateWordCount(messages);
    DOM.messagesArea.scrollTop = DOM.messagesArea.scrollHeight;
}

async function typeMessage(msg, session) {
    DOM.messagesArea.innerHTML = '';
    
    for (let i = 0; i < session.messages.length - 1; i++) {
        appendMessage(session.messages[i]);
    }
    
    const aiMsgDiv = appendMessage({ ...msg, content: '' }, true);
    const contentDiv = aiMsgDiv.querySelector('.message-content');
    
    let charIndex = 0;
    const text = msg.content;
    
    typingInterval = setInterval(() => {
        if (charIndex < text.length) {
            contentDiv.textContent += text[charIndex];
            charIndex++;
            DOM.messagesArea.scrollTop = DOM.messagesArea.scrollHeight;
        } else {
            clearInterval(typingInterval);
            typingInterval = null;
            updateWordCount(session.messages);
            saveSessions();
        }
    }, 20);
}

function appendMessage(msg, isTyping = false) {
    if (msg.role === 'system') return null;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${msg.role === 'user' ? 'user' : 'ai'}`;
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = msg.role === 'user' ? '👤' : '🤖';
    
    const info = document.createElement('div');
    info.className = 'message-info';
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = msg.role === 'user' ? '用户' : 'AI 助手';
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = msg.time || '';
    
    info.appendChild(label);
    info.appendChild(time);
    header.appendChild(avatar);
    header.appendChild(info);
    
    if (msg.role === 'assistant') {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-message-action';
        copyBtn.textContent = '📋 复制';
        copyBtn.addEventListener('click', () => copyToClipboard(msg.content, copyBtn));
        
        actions.appendChild(copyBtn);
        header.appendChild(actions);
    }
    
    messageDiv.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = msg.content;
    messageDiv.appendChild(content);
    
    DOM.messagesArea.appendChild(messageDiv);
    DOM.messagesArea.scrollTop = DOM.messagesArea.scrollHeight;
    
    return messageDiv;
}

async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = btn.textContent;
        btn.textContent = '✅ 已复制';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    } catch (err) {
        btn.textContent = '❌ 失败';
    }
}

function exportConversation() {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session || session.messages.length === 0) {
        showError('没有可导出的内容');
        return;
    }
    
    let content = `# ${session.title}\n\n`;
    content += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `---\n\n`;
    
    session.messages.forEach(msg => {
        const role = msg.role === 'user' ? '👤 用户' : '🤖 AI 助手';
        content += `**${role}** (${msg.time})\n\n`;
        content += `${msg.content}\n\n`;
        content += `---\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function updateWordCount(messages) {
    const aiMessages = messages.filter(m => m.role === 'assistant');
    if (aiMessages.length > 0) {
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        const charCount = lastAiMessage.content.length;
        DOM.wordCount.textContent = `字数：${charCount} 字`;
    } else {
        DOM.wordCount.textContent = '';
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    DOM.themeToggle.textContent = isDarkMode ? '☀️ 明亮模式' : '🌙 暗黑模式';
    localStorage.setItem('darkMode', isDarkMode);
}

function showLoading(show) {
    DOM.loadingIndicator.classList.toggle('hidden', !show);
    DOM.generateBtn.disabled = show;
    DOM.modifyBtn.disabled = show;
}

function showError(message) {
    DOM.errorIndicator.textContent = message;
    DOM.errorIndicator.classList.remove('hidden');
    setTimeout(() => {
        DOM.errorIndicator.classList.add('hidden');
    }, 5000);
}

function hideError() {
    DOM.errorIndicator.classList.add('hidden');
}

function saveSessions() {
    try {
        localStorage.setItem('sessions', JSON.stringify(sessions));
        localStorage.setItem('sessionCounter', sessionCounter);
    } catch (e) {
        console.warn('localStorage 保存失败:', e);
    }
}

function saveSettings() {
    try {
        localStorage.setItem('apiKey', apiKey);
        localStorage.setItem('currentModel', currentModel);
    } catch (e) {
        console.warn('localStorage 保存失败:', e);
    }
}

function loadSessions() {
    try {
        const savedSessions = localStorage.getItem('sessions');
        const savedCounter = localStorage.getItem('sessionCounter');
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedApiKey = localStorage.getItem('apiKey');
        const savedModel = localStorage.getItem('currentModel');
        
        if (savedSessions) {
            sessions = JSON.parse(savedSessions);
        }
        if (savedCounter) {
            sessionCounter = parseInt(savedCounter);
        }
        if (savedDarkMode === 'true') {
            isDarkMode = true;
            document.body.classList.add('dark-mode');
            DOM.themeToggle.textContent = '☀️ 明亮模式';
        }
        if (savedApiKey) {
            apiKey = savedApiKey;
            DOM.apiKeyInput.value = apiKey;
        }
        if (savedModel) {
            currentModel = savedModel;
            DOM.modelSelect.value = currentModel;
        }
        
        if (sessions.length > 0) {
            switchToSession(sessions[0].id);
        }
    } catch (e) {
        console.warn('localStorage 加载失败:', e);
    }
}

// Initialize
loadSessions();
if (sessions.length === 0) {
    createNewSession();
}
