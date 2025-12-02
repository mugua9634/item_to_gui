// ==================== 配置与全局变量 ====================
const STORAGE_KEY = 'item_generator_data_v3'; // 更新版本号
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

let items = [];
let selectedItems = []; // 每次都是空的，不记忆
let currentItem = null;
let currentFileContent = ''; // 新增：记忆文件内容

// DOM元素缓存
let uploadScreen, generateScreen, fileInput, dropArea, itemsContainer;
let itemsGrid, itemCount, selectedItemsDiv, selectedList, nextBtn;
let quantityModal, quantityInput, currentItemName, itemsPreview;
let outputCommand, secretIdInput, playerIdInput, validTimeInput;

// ==================== 初始化函数 ====================
function initializeApp() {
    console.log('应用初始化 - 设备:', isMobile ? '移动端' : '桌面端');
    
    uploadScreen = document.getElementById('upload-screen');
    generateScreen = document.getElementById('generate-screen');
    fileInput = document.getElementById('file-input');
    dropArea = document.getElementById('drop-area');
    itemsContainer = document.getElementById('items-container');
    itemsGrid = document.getElementById('items-grid');
    itemCount = document.getElementById('item-count');
    selectedItemsDiv = document.getElementById('selected-items');
    selectedList = document.getElementById('selected-list');
    nextBtn = document.getElementById('next-btn');
    quantityModal = document.getElementById('quantity-modal');
    quantityInput = document.getElementById('quantity-input');
    currentItemName = document.getElementById('current-item-name');
    itemsPreview = document.getElementById('items-preview');
    outputCommand = document.getElementById('output-command');
    secretIdInput = document.getElementById('secret-id');
    playerIdInput = document.getElementById('player-id');
    validTimeInput = document.getElementById('valid-time');
    
    console.log('DOM元素初始化完成');
}

// ==================== 本地存储功能 ====================
function saveToLocalStorage() {
    try {
        // 只保存文件内容和表单数据，不保存selectedItems
        const saveData = {
            fileContent: currentFileContent, // 关键：保存文件内容
            secretId: secretIdInput ? secretIdInput.value : '',
            playerId: playerIdInput ? playerIdInput.value : '',
            validTime: validTimeInput ? validTimeInput.value : '60',
            cmdType: document.querySelector('input[name="cmd-type"]:checked')?.value || 'single',
            timestamp: new Date().getTime()
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
        console.log('✅ 文件内容已记忆，长度:', currentFileContent.length);
        return true;
    } catch (error) {
        console.error('❌ 记忆保存失败:', error);
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const dataStr = localStorage.getItem(STORAGE_KEY);
        if (!dataStr) return null;
        return JSON.parse(dataStr);
    } catch (error) {
        console.error('❌ 记忆读取失败:', error);
        return null;
    }
}

// ==================== 记忆恢复核心 ====================
function restorePreviousSession() {
    console.log('🔄 尝试恢复上次的文件...');
    
    const savedData = loadFromLocalStorage();
    if (!savedData) {
        console.log('没有找到历史文件');
        return;
    }
    
    console.log('找到历史文件，长度:', savedData.fileContent?.length || 0);
    
    // 恢复表单数据
    if (savedData.secretId && secretIdInput) {
        secretIdInput.value = savedData.secretId;
    }
    if (savedData.playerId && playerIdInput) {
        playerIdInput.value = savedData.playerId;
    }
    if (savedData.validTime && validTimeInput) {
        validTimeInput.value = savedData.validTime;
    }
    if (savedData.cmdType) {
        const radioBtn = document.querySelector(`input[name="cmd-type"][value="${savedData.cmdType}"]`);
        if (radioBtn) {
            radioBtn.checked = true;
            if (typeof toggleTimeInput === 'function') toggleTimeInput();
        }
    }
    
    // 关键：如果有保存的文件内容，自动解析并显示
    if (savedData.fileContent && savedData.fileContent.length > 100) {
        console.log('📂 自动恢复上次的文件内容...');
        setTimeout(() => {
            parseFileContent(savedData.fileContent);
            showToast('已恢复上次的物品列表');
        }, 300);
    }
}

// ==================== 事件监听器 ====================
function setupEventListeners() {
    // 文件拖拽
    if (dropArea) {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('dragover');
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    // 文件选择
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });
    }

    // 数量输入
    if (quantityInput) {
        quantityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmQuantity();
        });
    }

    // 自动生成命令
    if (secretIdInput) secretIdInput.addEventListener('input', generateCommand);
    if (playerIdInput) playerIdInput.addEventListener('input', generateCommand);
    if (validTimeInput) validTimeInput.addEventListener('input', generateCommand);
    
    // 自动保存机制
    window.addEventListener('beforeunload', () => {
        console.log('⏳ 页面关闭，记忆文件内容...');
        saveToLocalStorage();
    });
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('📱 页面隐藏，记忆文件内容...');
            saveToLocalStorage();
        }
    });
    
    // 移除按钮事件委托
    document.addEventListener('click', (e) => {
        if (e.target.closest('.remove-tag')) {
            const removeBtn = e.target.closest('.remove-tag');
            const index = parseInt(removeBtn.getAttribute('data-index'));
            removeSelectedItem(index);
        }
    });
}

// ==================== 文件处理函数 ====================
function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.txt')) {
        showToast('请选择.txt文件');
        return;
    }
    
    if (file.size === 0) {
        showToast('文件为空');
        return;
    }
    
    showToast('正在读取文件...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentFileContent = e.target.result; // 保存文件内容
        parseFileContent(currentFileContent);
        showToast(`已解析 ${items.length} 个物品`);
        
        // 文件读取后自动保存
        setTimeout(saveToLocalStorage, 500);
    };
    reader.onerror = () => showToast('文件读取失败');
    reader.readAsText(file, 'UTF-8');
}

function parseFileContent(content) {
    items = [];
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        const pattern1 = trimmedLine.match(/^(\d+)[\s\t　]+(.+)$/);
        const pattern2 = trimmedLine.match(/^(\d+)[^\d\w]*(.+)$/);
        
        let id, name;
        if (pattern1) {
            id = pattern1[1];
            name = pattern1[2];
        } else if (pattern2) {
            id = pattern2[1];
            name = pattern2[2];
        }
        
        if (name) {
            name = name.replace(/#[A-Za-z0-9]+/g, '')
                       .replace(/\s+/g, ' ')
                       .trim()
                       .replace(/[;；:：,，、。.]$/g, '');
        }
        
        if (id && name && name.length > 0) {
            items.push({
                id: id.trim(),
                name: name,
                fullName: trimmedLine,
                lineNumber: index + 1
            });
        }
    });
    
    // 去重排序
    const uniqueItems = [];
    const idMap = new Map();
    items.forEach(item => {
        if (!idMap.has(item.id)) {
            idMap.set(item.id, true);
            uniqueItems.push(item);
        }
    });
    
    items = uniqueItems.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    console.log(`📄 解析完成: ${items.length}个物品`);
    
    // 清空之前的选择（确保每次都是新开始）
    selectedItems = [];
    updateSelectedItems();
    
    displayItems();
}

// ==================== 物品显示与选择 ====================
function displayItems() {
    if (items.length === 0) {
        if (itemsContainer) itemsContainer.style.display = 'none';
        return;
    }
    
    if (itemsContainer) itemsContainer.style.display = 'block';
    if (itemsGrid) itemsGrid.innerHTML = '';
    if (itemCount) itemCount.textContent = `${items.length} 个物品`;
    
    console.log(`🖼️ 显示 ${items.length} 个物品按钮`);
    
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'item-btn';
        btn.setAttribute('data-id', item.id);
        btn.setAttribute('data-name', item.name);
        btn.innerHTML = `
            <span>${item.name}</span>
            <span class="item-id">ID: ${item.id}</span>
        `;
        
        btn.addEventListener('click', () => selectItem(item));
        
        if (itemsGrid) itemsGrid.appendChild(btn);
    });
    
    console.log('✅ 物品按钮显示完成');
}

function selectItem(item) {
    currentItem = item;
    if (currentItemName) currentItemName.textContent = `${item.name} (ID: ${item.id})`;
    if (quantityInput) {
        quantityInput.value = '1';
        quantityInput.focus();
    }
    if (quantityModal) quantityModal.classList.add('active');
}

function closeQuantityModal() {
    if (quantityModal) quantityModal.classList.remove('active');
    currentItem = null;
}

function confirmQuantity() {
    if (!currentItem) return;
    
    const quantity = parseInt(quantityInput ? quantityInput.value : '1');
    if (isNaN(quantity) || quantity < 1) {
        showToast('请输入有效的数量');
        return;
    }
    
    const existingIndex = selectedItems.findIndex(si => si.id === currentItem.id);
    if (existingIndex > -1) {
        selectedItems[existingIndex].quantity = quantity;
    } else {
        selectedItems.push({
            id: currentItem.id,
            name: currentItem.name,
            quantity: quantity
        });
    }
    
    updateSelectedItems();
    closeQuantityModal();
    
    // 更新按钮选中状态
    if (itemsGrid) {
        const buttons = itemsGrid.querySelectorAll('.item-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-id') === currentItem.id) {
                btn.classList.add('selected');
            }
        });
    }
}

function updateSelectedItems() {
    if (selectedItems.length === 0) {
        if (selectedItemsDiv) selectedItemsDiv.style.display = 'none';
        if (nextBtn) nextBtn.disabled = true;
        return;
    }
    
    if (selectedItemsDiv) selectedItemsDiv.style.display = 'block';
    if (selectedList) {
        selectedList.innerHTML = '';
        selectedItems.forEach((item, index) => {
            const tag = document.createElement('div');
            tag.className = 'selected-tag';
            tag.innerHTML = `
                ${item.name} × ${item.quantity}
                <button class="remove-tag" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            selectedList.appendChild(tag);
        });
    }
    
    if (nextBtn) nextBtn.disabled = false;
    console.log(`📋 已选物品: ${selectedItems.length}个`);
}

function removeSelectedItem(index) {
    if (index >= 0 && index < selectedItems.length) {
        const removedItem = selectedItems[index];
        selectedItems.splice(index, 1);
        updateSelectedItems();
        
        // 更新按钮选中状态
        if (itemsGrid) {
            const buttons = itemsGrid.querySelectorAll('.item-btn');
            buttons.forEach(btn => {
                if (btn.getAttribute('data-id') === removedItem.id) {
                    btn.classList.remove('selected');
                }
            });
        }
        
        showToast(`已移除 ${removedItem.name}`);
    }
}

function clearAll() {
    console.log('🧹 清空所有选择');
    selectedItems = [];
    updateSelectedItems();
    
    // 清除按钮选中状态
    if (itemsGrid) {
        const buttons = itemsGrid.querySelectorAll('.item-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
    }
    
    showToast('已清空所有选择');
}

// ==================== 页面导航 ====================
function goToGenerateScreen() {
    if (uploadScreen) uploadScreen.classList.remove('active');
    if (generateScreen) generateScreen.classList.add('active');
    updateItemsPreview();
    generateCommand();
}

function goBackToUpload() {
    if (generateScreen) generateScreen.classList.remove('active');
    if (uploadScreen) uploadScreen.classList.add('active');
}

// ==================== 命令生成功能 ====================
function toggleTimeInput() {
    const isAllServer = document.querySelector('input[name="cmd-type"]:checked')?.value === 'all';
    const playerIdGroup = document.getElementById('player-id-group');
    const timeGroup = document.getElementById('time-group');
    
    if (playerIdGroup) playerIdGroup.style.display = isAllServer ? 'none' : 'block';
    if (timeGroup) timeGroup.style.display = isAllServer ? 'block' : 'none';
    generateCommand();
}

function updateItemsPreview() {
    if (selectedItems.length === 0) {
        if (itemsPreview) itemsPreview.textContent = '请在上传界面选择物品';
        return;
    }
    
    const itemsText = selectedItems.map(item => `${item.id}x${item.quantity}`).join(' ');
    if (itemsPreview) itemsPreview.textContent = itemsText;
}

function generateCommand() {
    if (selectedItems.length === 0) {
        if (outputCommand) outputCommand.value = '请先选择物品';
        return;
    }
    
    const secretId = secretIdInput ? secretIdInput.value.trim() : '';
    if (!secretId) {
        if (outputCommand) outputCommand.value = '请输入密钥ID';
        return;
    }
    
    const isAllServer = document.querySelector('input[name="cmd-type"]:checked')?.value === 'all';
    const itemsText = selectedItems.map(item => `${item.id}x${item.quantity}`).join(' ');
    
    let command;
    if (isAllServer) {
        const validTime = validTimeInput ? validTimeInput.value.trim() : '';
        if (!validTime) {
            if (outputCommand) outputCommand.value = '请输入有效时间';
            return;
        }
        command = `/新建全服兑换码 ${secretId} ${validTime} ${itemsText}`;
    } else {
        const playerId = playerIdInput ? playerIdInput.value.trim() : '';
        if (!playerId) {
            if (outputCommand) outputCommand.value = '请输入玩家ID';
            return;
        }
        command = `/新建兑换码 ${secretId} ${playerId} ${itemsText}`;
    }
    
    if (outputCommand) outputCommand.value = command;
}

function copyCommand() {
    if (!outputCommand || !outputCommand.value || outputCommand.value.includes('请输入')) {
        showToast('没有可复制的内容');
        return;
    }
    
    outputCommand.select();
    outputCommand.setSelectionRange(0, 99999);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(outputCommand.value)
            .then(() => showToast('命令已复制到剪贴板'))
            .catch(() => fallbackCopy());
    } else {
        fallbackCopy();
    }
}

function fallbackCopy() {
    try {
        document.execCommand('copy');
        showToast('命令已复制到剪贴板');
    } catch (err) {
        showToast('复制失败，请手动选择文本复制');
    }
}

function generateAndCopy() {
    generateCommand();
    setTimeout(copyCommand, 100);
}

function resetGenerateScreen() {
    if (secretIdInput) secretIdInput.value = '';
    if (playerIdInput) playerIdInput.value = '';
    if (validTimeInput) validTimeInput.value = '60';
    
    const singleRadio = document.querySelector('input[name="cmd-type"][value="single"]');
    if (singleRadio) singleRadio.checked = true;
    
    toggleTimeInput();
    generateCommand();
}

// ==================== 新增：清除文件记忆 ====================
function clearFileMemory() {
    currentFileContent = '';
    items = [];
    selectedItems = [];
    
    // 清空显示
    if (itemsContainer) itemsContainer.style.display = 'none';
    if (itemsGrid) itemsGrid.innerHTML = '';
    updateSelectedItems();
    
    // 清除存储
    localStorage.removeItem(STORAGE_KEY);
    
    showToast('已清除文件记忆');
    console.log('🗑️ 文件记忆已清除');
}

// ==================== 工具函数 ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== 主初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 应用启动中...');
    
    initializeApp();
    setupEventListeners();
    
    // 自动恢复上次的文件
    restorePreviousSession();
    
    setTimeout(() => {
        showToast('应用已就绪' + (currentFileContent ? ' (已恢复文件)' : ''));
        console.log('✅ 应用初始化完成');
    }, 500);
});

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && quantityModal && quantityModal.classList.contains('active')) {
        closeQuantityModal();
    }
});

console.log('📂 文件记忆功能已加载 - 只记忆文件，不记忆选择');
