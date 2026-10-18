(function() {
'use strict';
const CHECK_INTERVAL = 1000;
const MAX_ATTEMPTS = 30;
function createFilterUI() {
const filterDiv = document.createElement('div');
filterDiv.id = 'simple-student-filter';
filterDiv.style.cssText = `
position: fixed;
top: 20px;
right: 20px;
background: rgba(255, 255, 255, 0.95);
border: 1px solid #ddd;
border-radius: 6px;
padding: 12px;
box-shadow: 0 2px 10px rgba(0,0,0,0.1);
z-index: 9999;
font-family: Arial, sans-serif;
min-width: 200px;
backdrop-filter: blur(5px);
`;
filterDiv.innerHTML = `
<div style="display: flex; gap: 8px; margin-bottom: 8px;">
<input type="text" 
       id="student-name-input" 
       placeholder="输入学生姓名"
       style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
<button id="filter-btn" 
        style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
  筛选
</button>
</div>
<div id="filter-status" style="font-size: 12px; color: #666; min-height: 16px;">
就绪
</div>
`;
let isDragging = false;
let offsetX, offsetY;
const header = filterDiv;
header.addEventListener('mousedown', (e) => {
if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
isDragging = true;
offsetX = e.clientX - filterDiv.getBoundingClientRect().left;
offsetY = e.clientY - filterDiv.getBoundingClientRect().top;
filterDiv.style.cursor = 'grabbing';
});
document.addEventListener('mousemove', (e) => {
if (!isDragging) return;
filterDiv.style.left = (e.clientX - offsetX) + 'px';
filterDiv.style.top = (e.clientY - offsetY) + 'px';
filterDiv.style.right = 'auto';
});
document.addEventListener('mouseup', () => {
isDragging = false;
filterDiv.style.cursor = 'default';
});
document.body.appendChild(filterDiv);
document.getElementById('filter-btn').addEventListener('click', applyFilter);
document.getElementById('student-name-input').addEventListener('keypress', (e) => {
if (e.key === 'Enter') applyFilter();
});
return filterDiv;
}
function findHomeworkContainer() {
const selectors = [
'table',
'.table',
'tbody',
'ul',
'ol',
'.list',
'.student-list',
'.homework-list',
'.data-table',
'.grid',
'.container'
];
for (const selector of selectors) {
try {
const elements = document.querySelectorAll(selector);
for (const el of elements) {
const text = el.textContent || '';
if (text.length > 100 && (text.includes('学生') || text.includes('姓名') || 
    text.includes('作业') || /\d{5,}/.test(text))) {
return el;
}
}
} catch (e) {}
}
const allElements = document.querySelectorAll('*');
for (const el of allElements) {
if (el.children.length >= 5) {
const childTexts = Array.from(el.children).map(child => child.textContent || '').join('');
if (childTexts.length > 200) {
return el;
}
}
}
return null;
}
function findStudentItems(container) {
const items = [];
if (!container) return items;
const rows = container.querySelectorAll('tr');
if (rows.length > 1) {
for (const row of rows) {
const text = row.textContent || '';
if (text.trim() && text.length < 1000) {
items.push({
element: row,
text: text,
type: 'table-row'
});
}
}
if (items.length > 2) return items;
}
const listItems = container.querySelectorAll('li');
if (listItems.length > 0) {
for (const item of listItems) {
const text = item.textContent || '';
if (text.trim()) {
items.push({
element: item,
text: text,
type: 'list-item'
});
}
}
if (items.length > 2) return items;
}
const divs = container.querySelectorAll('div');
for (const div of divs) {
const text = div.textContent || '';
if (text.trim() && text.length > 10 && text.length < 500 && 
    !text.includes('<') && !text.includes('>')) {
items.push({
element: div,
text: text,
type: 'div'
});
}
}
return items;
}
function applyFilter() {
const studentName = document.getElementById('student-name-input').value.trim();
const statusDiv = document.getElementById('filter-status');
if (!studentName) {
statusDiv.innerHTML = '<span style="color: #dc3545;">请输入学生姓名</span>';
return;
}
const container = findHomeworkContainer();
if (!container) {
statusDiv.innerHTML = '<span style="color: #dc3545;">未找到数据区域</span>';
return;
}
const studentItems = findStudentItems(container);
if (studentItems.length === 0) {
statusDiv.innerHTML = '<span style="color: #dc3545;">未找到学生数据</span>';
return;
}
let foundCount = 0;
let totalCount = studentItems.length;
studentItems.forEach(item => {
item.element.style.display = '';
item.element.style.backgroundColor = '';
item.element.style.opacity = '';
});
studentItems.forEach(item => {
const text = item.text.toLowerCase();
const searchName = studentName.toLowerCase();
if (text.includes(searchName)) {
item.element.style.backgroundColor = '#e7f3ff';
item.element.style.borderLeft = '3px solid #007bff';
foundCount++;
} else {
item.element.style.display = 'none';
}
});
if (foundCount > 0) {
statusDiv.innerHTML = `
<span style="color: #28a745;">
找到 ${foundCount} 条"${studentName}"的记录
<br>
<small>共 ${totalCount} 条，隐藏了 ${totalCount - foundCount} 条</small>
</span>
`;
} else {
statusDiv.innerHTML = `
<span style="color: #dc3545;">
未找到"${studentName}"的记录
<br>
<small>共扫描了 ${totalCount} 条记录</small>
</span>
`;
studentItems.forEach(item => {
item.element.style.display = '';
item.element.style.backgroundColor = '';
item.element.style.borderLeft = '';
});
}
}
function executeAutomation() {
console.log('🔍 学生筛选脚本启动');
createFilterUI();
let attempts = 0;
const detectInterval = setInterval(() => {
attempts++;
const container = findHomeworkContainer();
if (container) {
const items = findStudentItems(container);
if (items.length > 0) {
clearInterval(detectInterval);
document.getElementById('filter-status').innerHTML = `
<span style="color: #17a2b8;">
检测到 ${items.length} 条学生记录
<br>
<small>输入姓名开始筛选</small>
</span>
`;
}
}
if (attempts >= MAX_ATTEMPTS) {
clearInterval(detectInterval);
document.getElementById('filter-status').innerHTML = `
<span style="color: #6c757d;">
等待数据加载...
</span>
`;
}
}, CHECK_INTERVAL);
const observer = new MutationObserver(() => {
const statusDiv = document.getElementById('filter-status');
if (statusDiv && statusDiv.textContent.includes('等待')) {
statusDiv.innerHTML = '<span style="color: #17a2b8;">检测到页面变化...</span>';
}
});
observer.observe(document.body, {
childList: true,
subtree: true
});
console.log('✅ 筛选脚本加载完成');
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', executeAutomation);
} else {
executeAutomation();
}
})();