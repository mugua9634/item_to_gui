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
    console.log('应用初始化完成 - 纯前端版本');
    
    // 文件拖拽功能
    dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropArea.classList.add('dragover');
        console.log('文件拖拽进入区域');
    });

    dropArea.addEventListener('dragleave', function() {
        dropArea.classList.remove('dragover');
        console.log('文件拖拽离开区域');
    });

    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        console.log('文件已放下');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            console.log('检测到拖拽文件:', files[0].name);
            handleFile(files[0]);
        }
    });

    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            console.log('检测到选择的文件:', e.target.files[0].name);
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
    
    // 页面加载完成提示
    setTimeout(() => {
        console.log('应用已准备就绪，可以上传文件');
        showToast('应用已加载完成，请上传文件');
    }, 500);
});

// 处理上传的文件（纯前端处理）
function handleFile(file) {
    console.log('开始处理文件:', file.name, '大小:', file.size, '类型:', file.type);
    
    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.txt')) {
        const errorMsg = '请选择.txt文件';
        console.error(errorMsg);
        showToast(errorMsg);
        return;
    }
    
    if (file.size === 0) {
        const errorMsg = '文件为空';
        console.error(errorMsg);
        showToast(errorMsg);
        return;
    }
    
    if (file.size > 1024 * 1024) { // 限制1MB
        const errorMsg = '文件过大，请选择小于1MB的文件';
        console.error(errorMsg);
        showToast(errorMsg);
        return;
    }
    
    showToast('正在读取文件...');

    const reader = new FileReader();
    
    reader.onloadstart = function() {
        console.log('开始读取文件内容');
    };
    
    reader.onload = function(e) {
        console.log('文件读取成功，内容长度:', e.target.result.length);
        const content = e.target.result;
        parseFileContent(content);
        showToast(`已成功解析 ${items.length} 个物品`);
    };
    
    reader.onerror = function(e) {
        console.error('文件读取失败:', e.target.error);
        showToast('文件读取失败，请重试');
    };
    
    reader.onabort = function() {
        console.warn('文件读取被中止');
        showToast('文件读取被取消');
    };
    
    // 开始读取（指定UTF-8编码）
    reader.readAsText(file, 'UTF-8');
}

// 解析文件内容（增强版，确保跨设备一致性）
function parseFileContent(content) {
    console.log('开始解析文件内容，长度:', content.length);
    items = [];
    
    // 1. 统一换行符：将各种换行符统一为 \n
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 2. 按行分割
    const lines = content.split('\n');
    console.log('标准化后总行数:', lines.length);
    
    // 3. 统计信息
    let validLines = 0;
    let ignoredLines = 0;
    let lastParsedLine = '';
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmedLine = line.trim();
        
        // 跳过空行
        if (!trimmedLine) {
            console.log(`行${lineNum}: 空行，跳过`);
            ignoredLines++;
            return;
        }
        
        // 调试：记录前几行内容
        if (lineNum <= 5) {
            console.log(`行${lineNum}原始内容: "${line}"`);
            console.log(`行${lineNum}处理后: "${trimmedLine}"`);
        }
        
        // 多种匹配模式，确保兼容性
        let id, name;
        
        // 模式1: 数字 + 空格/制表符 + 名称 (最常用)
        const pattern1 = trimmedLine.match(/^(\d+)[\s\t　]+(.+)$/);
        
        // 模式2: 数字 + 任何分隔符 + 名称
        const pattern2 = trimmedLine.match(/^(\d+)[^\d\w]*(.+)$/);
        
        // 模式3: 处理包含#颜色标记的情况
        const pattern3 = trimmedLine.match(/^(\d+).*?(.+?)(?:#|$)/);
        
        if (pattern1) {
            id = pattern1[1];
            name = pattern1[2];
        } else if (pattern2) {
            id = pattern2[1];
            name = pattern2[2];
        } else if (pattern3) {
            id = pattern3[1];
            name = pattern3[2];
        }
        
        // 清理名称
        if (name) {
            // 移除颜色标记 #G #R #Y #B #c32CD99 等
            name = name.replace(/#[A-Za-z0-9]+/g, '')
                       // 移除前后空白和特殊空格
                       .replace(/^[\s\t　]+|[\s\t　]+$/g, '')
                       // 合并多个空格
                       .replace(/\s+/g, ' ')
                       .trim();
            
            // 移除末尾的分号、冒号等标点
            name = name.replace(/[;；:：,，、。.]$/g, '');
        }
        
        if (id && name && name.length > 0) {
            items.push({
                id: id.trim(),
                name: name,
                fullName: trimmedLine,
                lineNumber: lineNum
            });
            validLines++;
            lastParsedLine = `行${lineNum}: ID=${id}, 名称=${name}`;
            
            if (lineNum <= 10) {
                console.log(`✓ 行${lineNum}: ID=${id}, 名称=${name}`);
            }
        } else {
            console.warn(`✗ 行${lineNum} 解析失败: "${trimmedLine}"`);
            ignoredLines++;
            
            // 特殊处理：如果这行看起来像数据但解析失败，尝试更宽松的解析
            if (trimmedLine.match(/^\d/)) {
                console.warn(`  尝试紧急解析: "${trimmedLine}"`);
                const emergencyMatch = trimmedLine.match(/(\d+).*?([\u4e00-\u9fa5a-zA-Z0-9].*)/);
                if (emergencyMatch) {
                    const emergencyId = emergencyMatch[1];
                    const emergencyName = emergencyMatch[2].replace(/#[A-Za-z0-9]+/g, '').trim();
                    if (emergencyName) {
                        items.push({
                            id: emergencyId,
                            name: emergencyName,
                            fullName: trimmedLine,
                            lineNumber: lineNum,
                            emergency: true
                        });
                        validLines++;
                        console.log(`  ✓ 紧急解析成功: ID=${emergencyId}, 名称=${emergencyName}`);
                    }
                }
            }
        }
    });
    
    // 4. 结果验证和去重
    const uniqueItems = [];
    const idMap = new Map();
    
    items.forEach(item => {
        if (!idMap.has(item.id)) {
            idMap.set(item.id, true);
            uniqueItems.push(item);
        } else {
            console.warn(`重复ID ${item.id}，跳过: ${item.name}`);
        }
    });
    
    items = uniqueItems;
    
    // 5. 按ID排序
    items.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    
    console.log('========== 解析完成 ==========');
    console.log(`总行数: ${lines.length}`);
    console.log(`有效物品: ${validLines}`);
    console.log(`去重后: ${items.length}`);
    console.log(`忽略行数: ${ignoredLines}`);
    console.log(`最后解析的行: ${lastParsedLine}`);
    console.log('前5个物品:');
    items.slice(0, 5).forEach(item => {
        console.log(`  ${item.id}: ${item.name}`);
    });
    
    // 6. 显示统计信息
    const statInfo = `解析完成: ${lines.length}行 → ${items.length}个物品`;
    console.log(statInfo);
    showToast(statInfo);
    
    // 7. 如果有解析失败的潜在问题，给出警告
    if (items.length < validLines) {
        console.warn(`注意: 有${validLines - items.length}个重复ID被移除`);
    }
    
    displayItems();
}

// 显示物品按钮
function displayItems() {
    console.log('开始显示物品按钮，总数:', items.length);
    
    if (items.length === 0) {
        itemsContainer.style.display = 'none';
        console.warn('没有可显示的物品');
        return;
    }
    
    itemsContainer.style.display = 'block';
    itemsGrid.innerHTML = '';
    itemCount.textContent = `${items.length} 个物品`;
    console.log('创建物品按钮网格');
    
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'item-btn';
        btn.setAttribute('data-id', item.id);
        btn.setAttribute('data-name', item.name);
        btn.innerHTML = `
            <span>${item.name}</span>
            <span class="item-id">ID: ${item.id}</span>
        `;
        
        btn.addEventListener('click', () => {
            console.log('点击物品按钮:', item.name, 'ID:', item.id);
            selectItem(item);
        });
        
        // 检查是否已选中
        const isSelected = selectedItems.find(si => si.id === item.id);
        if (isSelected) {
            btn.classList.add('selected');
            console.log(`物品 ${item.id} 已选中`);
        }
        
        itemsGrid.appendChild(btn);
    });
    
    console.log('物品按钮显示完成');
}

// 选择物品
function selectItem(item) {
    console.log('选择物品，打开数量输入框:', item.name);
    currentItem = item;
    currentItemName.textContent = `${item.name} (ID: ${item.id})`;
    quantityInput.value = '1';
    quantityInput.focus();
    quantityModal.classList.add('active');
}

// 关闭数量输入模态框
function closeQuantityModal() {
    console.log('关闭数量输入框');
    quantityModal.classList.remove('active');
    currentItem = null;
}

// 确认数量
function confirmQuantity() {
    if (!currentItem) {
        console.error('确认数量时currentItem为空');
        return;
    }
    
    const quantity = parseInt(quantityInput.value);
    console.log('确认数量，物品:', currentItem.name, '数量:', quantity);
    
    if (isNaN(quantity) || quantity < 1) {
        const errorMsg = '请输入有效的数量（大于0）';
        console.error(errorMsg);
        showToast(errorMsg);
        return;
    }
    
    // 添加或更新已选物品
    const existingIndex = selectedItems.findIndex(si => si.id === currentItem.id);
    if (existingIndex > -1) {
        console.log('更新已存在的物品数量:', currentItem.id);
        selectedItems[existingIndex].quantity = quantity;
    } else {
        console.log('添加新物品到选择列表:', currentItem.id);
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
        const btnId = btn.getAttribute('data-id');
        if (btnId === currentItem.id) {
            btn.classList.add('selected');
        }
    });
    
    console.log('数量确认完成，已选物品总数:', selectedItems.length);
}

// 更新已选物品显示
function updateSelectedItems() {
    console.log('更新已选物品显示，当前数量:', selectedItems.length);
    
    if (selectedItems.length === 0) {
        selectedItemsDiv.style.display = 'none';
        nextBtn.disabled = true;
        console.log('没有已选物品，隐藏显示区域');
        return;
    }
    
    selectedItemsDiv.style.display = 'block';
    selectedList.innerHTML = '';
    console.log('开始渲染已选物品标签');
    
    selectedItems.forEach((item, index) => {
        const tag = document.createElement('div');
        tag.className = 'selected-tag';
        tag.setAttribute('data-index', index);
        tag.innerHTML = `
            ${item.name} × ${item.quantity}
            <button class="remove-tag" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        selectedList.appendChild(tag);
    });
    
    nextBtn.disabled = false;
    console.log('已选物品显示更新完成');
}

// 移除已选物品（事件委托）
document.addEventListener('click', function(e) {
    if (e.target.closest('.remove-tag')) {
        const removeBtn = e.target.closest('.remove-tag');
        const index = parseInt(removeBtn.getAttribute('data-index'));
        console.log('移除已选物品，索引:', index, '物品:', selectedItems[index]?.name);
        removeSelectedItem(index);
    }
});

function removeSelectedItem(index) {
    if (index >= 0 && index < selectedItems.length) {
        const removedItem = selectedItems[index];
        selectedItems.splice(index, 1);
        updateSelectedItems();
        
        // 更新按钮选中状态
        const buttons = itemsGrid.querySelectorAll('.item-btn');
        buttons.forEach(btn => {
            const btnId = btn.getAttribute('data-id');
            if (btnId === removedItem.id) {
                btn.classList.remove('selected');
            }
        });
        
        console.log('物品移除完成:', removedItem.name);
        showToast(`已移除 ${removedItem.name}`);
    }
}

// 清空所有选择
function clearAll() {
    console.log('清空所有已选物品');
    selectedItems = [];
    updateSelectedItems();
    
    // 清除所有按钮的选中状态
    const buttons = itemsGrid.querySelectorAll('.item-btn');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    console.log('所有选择已清空');
    showToast('已清空所有选择');
}

// 切换到生成界面
function goToGenerateScreen() {
    console.log('切换到生成界面');
    uploadScreen.classList.remove('active');
    generateScreen.classList.add('active');
    
    // 更新物品预览
    updateItemsPreview();
    generateCommand();
    
    console.log('生成界面已激活');
}

// 返回上传界面
function goBackToUpload() {
    console.log('返回上传界面');
    generateScreen.classList.remove('active');
    uploadScreen.classList.add('active');
}

// 切换时间输入框显示
function toggleTimeInput() {
    const isAllServer = document.querySelector('input[name="cmd-type"]:checked').value === 'all';
    const playerIdGroup = document.getElementById('player-id-group');
    const timeGroup = document.getElementById('time-group');
    
    console.log('切换命令类型:', isAllServer ? '全服兑换码' : '单服兑换码');
    
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
    console.log('更新物品预览');
    if (selectedItems.length === 0) {
        itemsPreview.textContent = '请在上传界面选择物品';
        console.warn('没有已选物品用于预览');
        return;
    }
    
    const itemsText = selectedItems.map(item => `${item.id}x${item.quantity}`).join(' ');
    itemsPreview.textContent = itemsText;
    console.log('物品预览文本:', itemsText);
}

// 生成命令
function generateCommand() {
    console.log('开始生成命令');
    
    if (selectedItems.length === 0) {
        outputCommand.value = '请先选择物品';
        console.warn('生成命令失败：没有已选物品');
        return;
    }
    
    const secretId = secretIdInput.value.trim();
    if (!secretId) {
        outputCommand.value = '请输入密钥ID';
        console.warn('生成命令失败：缺少密钥ID');
        return;
    }
    
    const isAllServer = document.querySelector('input[name="cmd-type"]:checked').value === 'all';
    const itemsText = selectedItems.map(item => `${item.id}x${item.quantity}`).join(' ');
    
    console.log('命令参数:', {isAllServer, secretId, itemsText});
    
    let command;
    if (isAllServer) {
        const validTime = validTimeInput.value.trim();
        if (!validTime) {
            outputCommand.value = '请输入有效时间';
            console.warn('生成命令失败：缺少有效时间');
            return;
        }
        command = `/新建全服兑换码 ${secretId} ${validTime} ${itemsText}`;
    } else {
        const playerId = playerIdInput.value.trim();
        if (!playerId) {
            outputCommand.value = '请输入玩家ID';
            console.warn('生成命令失败：缺少玩家ID');
            return;
        }
        command = `/新建兑换码 ${secretId} ${playerId} ${itemsText}`;
    }
    
    outputCommand.value = command;
    console.log('命令生成成功:', command);
}

// 复制命令
function copyCommand() {
    console.log('尝试复制命令');
    
    if (!outputCommand.value || outputCommand.value.includes('请输入')) {
        const errorMsg = '没有可复制的内容';
        console.warn(errorMsg);
        showToast(errorMsg);
        return;
    }
    
    outputCommand.select();
    outputCommand.setSelectionRange(0, 99999);
    
    // 现代复制方法
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(outputCommand.value)
            .then(() => {
                console.log('命令复制成功（现代API）');
                showToast('命令已复制到剪贴板');
            })
            .catch(err => {
                console.error('现代复制API失败:', err);
                fallbackCopy();
            });
    } else {
        // 回退方案
        fallbackCopy();
    }
}

// 复制回退方案
function fallbackCopy() {
    console.log('使用回退复制方案');
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log('命令复制成功（回退方案）');
            showToast('命令已复制到剪贴板');
        } else {
            console.error('回退复制方案失败');
            showToast('复制失败，请手动选择文本复制');
        }
    } catch (err) {
        console.error('复制时发生错误:', err);
        showToast('复制失败: ' + err.message);
    }
}

// 生成并复制
function generateAndCopy() {
    console.log('执行生成并复制操作');
    generateCommand();
    
    // 延迟复制以确保命令已生成
    setTimeout(() => {
        copyCommand();
    }, 100);
}

// 重置生成界面
function resetGenerateScreen() {
    console.log('重置生成界面');
    secretIdInput.value = '';
    playerIdInput.value = '';
    validTimeInput.value = '60';
    document.querySelector('input[name="cmd-type"][value="single"]').checked = true;
    toggleTimeInput();
    generateCommand();
}

// 显示提示消息
function showToast(message) {
    console.log('显示提示消息:', message);
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        console.log('提示消息隐藏');
    }, 3000);
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (quantityModal.classList.contains('active')) {
            console.log('按下ESC键，关闭模态框');
            closeQuantityModal();
        }
    }
});

// 添加移动端触摸优化
document.addEventListener('touchstart', function() {}, {passive: true});

console.log('脚本加载完成 - 纯前端文件处理版本');
