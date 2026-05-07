let apiKey = '';
let conversationHistory = [];
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL_ID = 'qwen3.6-plus';

const apiKeyInput = document.getElementById('apiKey');
const productNameInput = document.getElementById('productName');
const targetAudienceInput = document.getElementById('targetAudience');
const sellingPointsInput = document.getElementById('sellingPoints');
const styleSelect = document.getElementById('style');
const generateBtn = document.getElementById('generateBtn');
const modifyBtn = document.getElementById('modifyBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const resultSection = document.getElementById('resultSection');
const chatHistoryDiv = document.getElementById('chatHistory');
const modifySuggestionInput = document.getElementById('modifySuggestion');

apiKeyInput.addEventListener('input', () => {
    apiKey = apiKeyInput.value.trim();
});

generateBtn.addEventListener('click', generateCopy);
modifyBtn.addEventListener('click', modifyCopy);
clearBtn.addEventListener('click', clearConversation);

async function generateCopy() {
    if (!apiKey) {
        showError('请先填写 API Key');
        return;
    }

    const productName = productNameInput.value.trim();
    const targetAudience = targetAudienceInput.value.trim();
    const sellingPoints = sellingPointsInput.value.trim();
    const style = styleSelect.value;

    if (!productName || !targetAudience || !sellingPoints) {
        showError('请填写完整的产品信息');
        return;
    }

    conversationHistory = [];

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

    conversationHistory.push(
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    );

    await callAPI();
}

async function modifyCopy() {
    const suggestion = modifySuggestionInput.value.trim();
    
    if (!suggestion) {
        showError('请输入修改建议');
        return;
    }

    conversationHistory.push({ role: 'user', content: suggestion });
    modifySuggestionInput.value = '';
    
    await callAPI();
}

async function callAPI() {
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `请求失败: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        
        displayConversation();
        resultSection.classList.remove('hidden');
        
    } catch (error) {
        showError(`发生错误: ${error.message}`);
        conversationHistory.pop();
    } finally {
        showLoading(false);
    }
}

function displayConversation() {
    chatHistoryDiv.innerHTML = '';
    
    conversationHistory.forEach((msg, index) => {
        if (msg.role === 'system') return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${msg.role === 'user' ? 'user' : 'ai'}`;
        
        const label = document.createElement('div');
        label.className = 'message-label';
        label.textContent = msg.role === 'user' ? '👤 用户' : '🤖 AI 助手';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = msg.content;
        
        messageDiv.appendChild(label);
        messageDiv.appendChild(content);
        chatHistoryDiv.appendChild(messageDiv);
    });
    
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

function clearConversation() {
    conversationHistory = [];
    chatHistoryDiv.innerHTML = '';
    resultSection.classList.add('hidden');
    modifySuggestionInput.value = '';
    hideError();
}

function showLoading(show) {
    loadingDiv.classList.toggle('hidden', !show);
    generateBtn.disabled = show;
    modifyBtn.disabled = show;
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    errorDiv.classList.add('hidden');
}
