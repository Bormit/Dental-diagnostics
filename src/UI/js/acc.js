// Функция для формирования меню в зависимости от роли
function generateSidebar(role) {
  const sidebar = document.getElementById('sidebar');
  let menuHTML = '<ul class="sidebar-menu">';

  // Общие пункты меню
  menuHTML += `
    <li class="sidebar-menu-item">
      <a href="dashboard.html">Главная</a>
    </li>
  `;

  // Специфичные пункты для каждой роли
  switch (role) {
    case 'doctor':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="#">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">ПАЦИЕНТЫ</li>
        <li class="sidebar-menu-item">
          <a href="#">Расписание приемов</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Мои пациенты</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Поиск пациента</a>
        </li>
        <li class="sidebar-menu-item section">ДИАГНОСТИКА</li>
        <li class="sidebar-menu-item">
          <a href="#">Анализ снимков</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">История диагностики</a>
        </li>
        <li class="sidebar-menu-item section">ДОКУМЕНТЫ</li>
        <li class="sidebar-menu-item">
          <a href="#">Заключения</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Назначения</a>
        </li>
      `;
      break;

    case 'head-doctor':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="#">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">УПРАВЛЕНИЕ</li>
        <li class="sidebar-menu-item">
          <a href="#">Врачи отделения</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Статистика отделения</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Производительность ИИ</a>
        </li>
        <li class="sidebar-menu-item section">ОТЧЕТЫ</li>
        <li class="sidebar-menu-item">
          <a href="#">Ежедневные отчеты</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Отчеты по врачам</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Отчеты по диагнозам</a>
        </li>
      `;
      break;

    case 'admin':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="#">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">УПРАВЛЕНИЕ</li>
        <li class="sidebar-menu-item">
          <a href="#">Пользователи</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Роли и доступ</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Журнал действий</a>
        </li>
        <li class="sidebar-menu-item section">СИСТЕМА</li>
        <li class="sidebar-menu-item">
          <a href="#">Статистика системы</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Обновления</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Резервное копирование</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Настройки ИИ</a>
        </li>
      `;
      break;

    case 'registrar':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="#">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">ЗАПИСИ</li>
        <li class="sidebar-menu-item">
          <a href="#">Расписание врачей</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Запись на прием</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Журнал записей</a>
        </li>
        <li class="sidebar-menu-item section">ПАЦИЕНТЫ</li>
        <li class="sidebar-menu-item">
          <a href="#">Карточки пациентов</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Поиск пациента</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#">Новый пациент</a>
        </li>
      `;
      break;
  }

  // Общие пункты внизу меню
  menuHTML += `
    <li class="sidebar-menu-item section">НАСТРОЙКИ</li>
    <li class="sidebar-menu-item">
      <a href="#">Мой профиль</a>
    </li>
    <li class="sidebar-menu-item">
      <a href="#">Выход</a>
    </li>
  `;

  menuHTML += '</ul>';
  sidebar.innerHTML = menuHTML;
}

// Функция для переключения ролей
function switchRole(role) {
  // Обновляем меню
  generateSidebar(role);

  // Скрываем все контенты ролей
  document.querySelectorAll('.role-content').forEach(content => {
    content.classList.remove('active');
  });

  // Показываем нужный контент
  document.getElementById(`${role}-content`).classList.add('active');

  // Обновляем активную вкладку
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`.role-tab[data-role="${role}"]`).classList.add('active');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  // Устанавливаем начальную роль
  generateSidebar('doctor');

  // Добавляем обработчики для переключения ролей
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const role = this.getAttribute('data-role');
      switchRole(role);
    });
  });
});