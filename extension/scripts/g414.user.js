const subject = prompt('请输入学科名称：');
if (subject) {
  const keyword = encodeURIComponent(subject);
  window.open('https://search.bilibili.com/all?keyword=' + keyword, '_blank');
  window.open('https://www.icourse163.org/search.htm?search=' + keyword, '_blank');
  window.open('https://so.csdn.net/so/search?q=' + keyword, '_blank');
}