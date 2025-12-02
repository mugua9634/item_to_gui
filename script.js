// 全局变量
let items = []; // 存储解析后的物品数据
let selectedItems = []; // 存储已选择的物品 {id, name, quantity}
let currentItem = null; // 当前正在输入数量的物品

// DOM元素
const uploadScreen = document.getElementById('upload-screen');
const generateScreen = document.getElementById('generate-screen');
const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const itemsContainer = document.getElementById('items-container');
const itemsGrid = document.getElementById('items-grid');
const itemCount = document.getElementById('item-count');
const selectedItemsDiv = document.getElementById('selected-items');
const selectedList = document.getElementById('selected-list');
const nextBtn = document.getElementById('next-btn');
const quantityModal = document.getElementById('quantity-modal');
const quantityInput = document.getElementById('quantity-input');
const currentItemName = document.getElementById('current-item-name');
const itemsPreview = document.getElementById('items-preview');
const outputCommand = document.getElementById('output-command');
const secretIdInput = document.getElementById('secret-id');
const playerIdInput = document.getElementById('player-id');
const validTimeInput = document.getElementById('valid-time');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 文件拖拽功能
    dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', function() {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 数量输入框回车事件
    quantityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmQuantity();
        }
    });

    // 密钥ID输入时自动生成命令
    secretIdInput.addEventListener('input', generateCommand);
    playerIdInput.addEventListener('input', generateCommand);
    validTimeInput.addEventListener('input', generateCommand);
});

// 处理上传的文件
function handleFile(file) {
    if (!file.name.endsWith('.txt')) {
        showToast('请选择.txt文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseFileContent(content);
        showToast(`已成功解析 ${items.length} 个物品`);
    };
    reader.readAsText(file, 'UTF-8');
}

// 解析文件内容
function parseFileContent(content) {
    items = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // 匹配数字和名称（支持空格、制表符、中文分号等分隔符）
        const match = line.match(/^(\d+)\s*[、\.\-\s]*\s*(.+)$/);
        if (match) {
            const id = match[1].trim();
            let name = match[2].trim();
            
            // 清理名称中的特殊标记
            name = name.replace(/#[A-Za-z0-9]+/g, '').trim();
            
            items.push({
                id: id,
                name: name,
                fullName: match[2].trim()
            });
        }
    });
    
    displayItems();
}

// 显示物品按钮
function displayItems() {
    if (items.length === 0) {
        itemsContainer.style.display = 'none';
        return;
    }
    
    itemsContainer.style.display = 'block';
    itemsGrid.innerHTML = '';
    itemCount.textContent = `${items.length} 个物品`;
    
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'item-btn';
        btn.innerHTML = `
            <span>${item.name}</span>
            <span class="item-id">ID: ${item.id}</span>
        `;
        
        btn.addEventListener('click', () => selectItem(item));
        
        // 检查是否已选中
        const isSelected = selectedItems.find(si => si.id === item.id);
        if (isSelected) {
            btn.classList.add('selected');
        }
        
        itemsGrid.appendChild(btn);
    });
}

// 选择物品
function selectItem(item) {
    currentItem = item;
    currentItemName.textContent = `${item.name} (ID: ${item.id})`;
    quantityInput.value = '1';
    quantityModal.classList.add('active');
}

// 关闭数量输入模态框
function closeQuantityModal() {
    quantityModal.classList.remove('active');
    currentItem = null;
}

// 确认数量
function confirmQuantity() {
    if (!currentItem) return;
    
    const quantity = parseInt(quantityInput.value);
    if (isNaN(quantity) || quantity < 1) {
        showToast('请输入有效的数量');
        return;
    }
    
    // 添加或更新已选物品
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
    const buttons = itemsGrid.querySelectorAll('.item-btn');
    buttons.forEach(btn => {
        const btnId = btn.querySelector('.item-id').textContent.replace('ID: ', '');
        if (btnId === currentItem.id) {
            btn.classList.add('selected');
        }
    });
}

// 更新已选物品显示
function updateSelectedItems() {
    if (selectedItems.length === 0) {
        selectedItemsDiv.style.display = 'none';
        nextBtn.disabled = true;
        return;
    }
    
    selectedItemsDiv.style.display = 'block';
    selectedList.innerHTML = '';
    
    selectedItems.forEach((item, index) => {
        const tag = document.createElement('div');
        tag.className = 'selected-tag';
        tag.innerHTML = `
            ${item.name} × ${item.quantity}
            <button class="remove-tag" onclick="removeSelectedItem(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        selectedList.appendChild(tag);
    });
    
    nextBtn.disabled = false;
}

// 移除已选物品
function removeSelectedItem(index) {
    selectedItems.splice(index, 1);
    updateSelectedItems();
    
    // 更新按钮选中状态
    const buttons = itemsGrid.querySelectorAll('.item-btn');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
    });
}

// 清空所有选择
function clearAll() {
    selectedItems = [];
    updateSelectedItems();
    
    // 清除所有按钮的选中状态
    const buttons = itemsGrid.querySelectorAll('.item-btn');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
    });
}

// 切换到生成界面
function goToGenerateScreen() {
    uploadScreen.classList.remove('active');
    generateScreen.classList.add('active');
    
    // 更新物品预览
    updateItemsPreview();
    generateCommand();
}

// 返回上传界面
function goBackToUpload() {
    generateScreen.classList.remove('active');
    uploadScreen.classList.add('active');
}

// 切换时间输入框显示
function toggleTimeInput() {
    const isAllServer = document.querySelector('input[name="cmd-type"]:checked').value === 'all';
    const playerIdGroup = document.getElementById('player-id-group');
    const timeGroup = document.getElementById('time-group');
    
    if (isAllServer) {
        playerIdGroup.style.display = 'none';
        timeGroup.style.display = 'block';
    } else {
        playerIdGroup.style.display = 'block';
        timeGroup.style.display = 'none';
    }
    
    generateCommand();
}

// 更新物品预览
function updateItemsPreview() {
    if (selectedItems.length === 0) {
        itemsPreview.textContent = '请在上传界面选择物品';
        return;
    }
    
    const itemsText = selectedItems.map(item => `${item.id}x${item.quantity}`).join(' ');
    itemsPreview.textContent = itemsText;
}

// 生成命令
function generateCommand() {
    if (selectedItems.length === 0) {
        outputCommand.value = '请先选择物品';
        return;
    }
    
    const secretId = secretIdInput.value.trim();
    if (!secretId) {
        outputCommand.value = '请输入密钥ID';
        return;
    }
    
    const isAllServer = document.querySelector('input[name="cmd-type"]:checked').value === 'all';
    const itemsText = selectedItems.map(item => `${item.id}x${item.quantity}`).join(' ');
    
    let command;
    if (isAllServer) {
        const validTime = validTimeInput.value.trim();
        if (!validTime) {
            outputCommand.value = '请输入有效时间';
            return;
        }
        command = `/新建全服兑换码 ${secretId} ${validTime} ${itemsText}`;
    } else {
        const playerId = playerIdInput.value.trim();
        if (!playerId) {
            outputCommand.value = '请输入玩家ID';
            return;
        }
        command = `/新建兑换码 ${secretId} ${playerId} ${itemsText}`;
    }
    
    outputCommand.value = command;
}

// 复制命令
function copyCommand() {
    if (!outputCommand.value || outputCommand.value.includes('请输入')) {
        showToast('没有可复制的内容');
        return;
    }
    
    outputCommand.select();
    outputCommand.setSelectionRange(0, 99999); // 移动设备兼容
    
    try {
        navigator.clipboard.writeText(outputCommand.value).then(() => {
            showToast('命令已复制到剪贴板');
        }).catch(() => {
            fallbackCopy();
        });
    } catch (err) {
        fallbackCopy();
    }
}

// 复制回退方案
function fallbackCopy() {
    outputCommand.select();
    document.execCommand('copy');
    showToast('命令已复制到剪贴板');
}

// 生成并复制
function generateAndCopy() {
    generateCommand();
    setTimeout(copyCommand, 100);
}

// 重置生成界面
function resetGenerateScreen() {
    secretIdInput.value = '';
    playerIdInput.value = '';
    validTimeInput.value = '60';
    document.querySelector('input[name="cmd-type"][value="single"]').checked = true;
    toggleTimeInput();
    generateCommand();
}

// 显示提示消息
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (quantityModal.classList.contains('active')) {
            closeQuantityModal();
        }
    }
});
