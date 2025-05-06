// Функция для формирования меню в зависимости от роли
function generateSidebar(role) {
  const sidebar = document.getElementById('sidebar');
  let menuHTML = '<ul class="sidebar-menu">';

  // Общие пункты меню
  menuHTML += `
    <li class="sidebar-menu-item">
      <a href="../dashboard/dashboard.html">Главная</a>
    </li>
  `;

  // Специфичные пункты для каждой роли
  switch (role) {
    case 'doctor':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="../acc/acc.html">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">ПАЦИЕНТЫ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/schedule.html">Расписание приемов</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/patients.html">Мои пациенты</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/search.html">Поиск пациента</a>
        </li>
        <li class="sidebar-menu-item section">ДИАГНОСТИКА</li>
        <li class="sidebar-menu-item">
          <a href="../acc/analysis.html">Анализ снимков</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/history.html">История диагностики</a>
        </li>
        <li class="sidebar-menu-item section">ДОКУМЕНТЫ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/conclusions.html">Заключения</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/appointments.html">Назначения</a>
        </li>
      `;
      break;

    case 'head-doctor':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="../acc/acc.html">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">УПРАВЛЕНИЕ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/doctors.html">Врачи отделения</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/statistics.html">Статистика отделения</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/ai-performance.html">Производительность ИИ</a>
        </li>
        <li class="sidebar-menu-item section">ОТЧЕТЫ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/daily-reports.html">Ежедневные отчеты</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/doctor-reports.html">Отчеты по врачам</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/diagnosis-reports.html">Отчеты по диагнозам</a>
        </li>
      `;
      break;

    case 'admin':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="../acc/acc.html">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">УПРАВЛЕНИЕ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/users.html">Пользователи</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/roles.html">Роли и доступ</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/log.html">Журнал действий</a>
        </li>
        <li class="sidebar-menu-item section">СИСТЕМА</li>
        <li class="sidebar-menu-item">
          <a href="../acc/system-stats.html">Статистика системы</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/updates.html">Обновления</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/backup.html">Резервное копирование</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/ai-settings.html">Настройки ИИ</a>
        </li>
      `;
      break;

    case 'registrar':
      menuHTML += `
        <li class="sidebar-menu-item active">
          <a href="../acc/acc.html">Личный кабинет</a>
        </li>
        <li class="sidebar-menu-item section">ЗАПИСИ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/schedule.html">Расписание врачей</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/appointment.html">Запись на прием</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/record-log.html">Журнал записей</a>
        </li>
        <li class="sidebar-menu-item section">ПАЦИЕНТЫ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/patient-cards.html">Карточки пациентов</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/search.html">Поиск пациента</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/new-patient.html">Новый пациент</a>
        </li>
      `;
      break;
  }

  // Общие пункты внизу меню
  menuHTML += `
    <li class="sidebar-menu-item section">НАСТРОЙКИ</li>
    <li class="sidebar-menu-item">
      <a href="../acc/profile.html">Мой профиль</a>
    </li>
    <li class="sidebar-menu-item">
      <a href="../acc/logout.html">Выход</a>
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
  // Получаем пользователя из localStorage
  let user = null;
  let role = 'doctor'; // fallback по умолчанию
  try {
    user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role) {
      role = user.role;
    }
  } catch (e) {
    // fallback doctor
  }

  // Генерируем меню и активируем контент по роли пользователя
  generateSidebar(role);

  // Скрываем все контенты ролей
  document.querySelectorAll('.role-content').forEach(content => {
    content.classList.remove('active');
  });
  // Показываем нужный контент
  const roleContent = document.getElementById(`${role}-content`);
  if (roleContent) {
    roleContent.classList.add('active');
  }

  // Обновляем активную вкладку (если есть демонстрация ролей)
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-role') === role) {
      tab.classList.add('active');
    }
  });

  // Добавляем обработчики для ручного переключения ролей (только для демонстрации)
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const newRole = this.getAttribute('data-role');
      switchRole(newRole);
    });
  });
});