document.addEventListener('DOMContentLoaded', function() {
  // Добавляем обработчик для клика на профиль пользователя
  const userProfile = document.querySelector('.header-user');
  if (userProfile) {
    userProfile.addEventListener('click', function() {
      window.location.href = 'acc.html';
    });
    userProfile.style.cursor = 'pointer';
  }
  
  // Активный пункт меню
  highlightActiveMenuItem();
});

// Выделение активного пункта меню
function highlightActiveMenuItem() {
  const currentPath = window.location.pathname;
  const fileName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
  
  const menuItems = document.querySelectorAll('.sidebar-menu-item');
  menuItems.forEach(item => {
    const link = item.querySelector('a');
    if (link && link.getAttribute('href') === fileName) {
      item.classList.add('active');
    }
  });
}