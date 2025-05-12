// common.js

// Глобальные константы
const API_BASE_URL = 'http://localhost:8000';

// Вспомогательные функции
function getToken() {
    return localStorage.getItem('access_token');
}

// Форматирование даты для отображения
function formatDate(date) {
    const day = date.getDate();
    const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
}

// Форматирование даты для API
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// Получение класса статуса
function getStatusClass(status) {
    switch (status) {
        case 'completed': return 'status-completed';
        case 'in_progress': return 'status-in-progress';
        case 'waiting':
        case 'scheduled': return 'status-waiting';
        case 'cancelled': return 'status-cancelled';
        default: return '';
    }
}

// Форматирование статуса
function formatStatus(status) {
    switch (status) {
        case 'completed': return 'Завершен';
        case 'in_progress': return 'В процессе';
        case 'waiting':
        case 'scheduled': return 'Ожидает';
        case 'cancelled': return 'Отменен';
        default: return status;
    }
}

// Функция для формирования меню в зависимости от роли
function generateSidebar(role) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

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
        <li class="sidebar-menu-item section">РАЗДЕЛЫ</li>
        <li class="sidebar-menu-item">
          <a href="#doctor-schedule-section" class="scroll-to">Расписание</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#doctor-profile-section" class="scroll-to">Мои данные</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#doctor-stats-section" class="scroll-to">Статистика</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#doctor-quick-section" class="scroll-to">Быстрые действия</a>
        </li>
        <li class="sidebar-menu-item section">НАСТРОЙКИ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/profile.html">Мой профиль</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/logout.html">Выход</a>
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
          <a href="#users-section" class="scroll-to">Пользователи</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#patients-section" class="scroll-to">Пациенты</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="#appointments-section" class="scroll-to">Приемы</a>
        </li>
        <li class="sidebar-menu-item section">НАСТРОЙКИ</li>
        <li class="sidebar-menu-item">
          <a href="../acc/profile.html">Мой профиль</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="../acc/logout.html">Выход</a>
        </li>
      `;
            break;
    }

    menuHTML += '</ul>';
    sidebar.innerHTML = menuHTML;

    // Добавляем обработчики для прокрутки к секциям
    setupScrollHandlers();
}

// Функция для настройки обработчиков прокрутки
function setupScrollHandlers() {
    document.querySelectorAll('.scroll-to').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // Плавная прокрутка к элементу
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Функция для отображения уведомления о смене роли
function showRoleSwitchNotification(role) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'role-switch-notification';

    // Настраиваем текст в зависимости от роли
    let roleName = 'Неизвестная роль';
    if (role === 'doctor') roleName = 'Врач';
    if (role === 'admin') roleName = 'Администратор';

    notification.innerHTML = `
    <div class="notification-icon">✓</div>
    <div class="notification-text">Роль успешно изменена на "${roleName}"</div>
  `;

    // Добавляем на страницу
    document.body.appendChild(notification);

    // Анимируем появление
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Функция для переключения ролей
function switchRole(role) {
    console.log(`Переключение на роль: ${role}`);

    // Обновляем localStorage с новой ролью пользователя
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.role = role;
    localStorage.setItem('user', JSON.stringify(user));

    // Обновляем меню
    generateSidebar(role);

    // Скрываем все контенты ролей
    document.querySelectorAll('.role-content').forEach(content => {
        content.classList.remove('active');
    });

    // Показываем нужный контент
    const roleContent = document.getElementById(`${role}-content`);
    if (roleContent) {
        roleContent.classList.add('active');
    } else {
        console.warn(`Элемент ${role}-content не найден`);
    }

    // Обновляем активную вкладку
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.role-tab[data-role="${role}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Загружаем данные специфичные для роли
    if (role === 'admin') {
        window.admin_loadData();
    } else if (role === 'doctor') {
        window.loadDoctorData();
    }

    // Показываем уведомление о смене роли
    showRoleSwitchNotification(role);
}

// Добавление CSS стилей для интерфейса
function addAppStyles() {
    const scheduleStyles = `
    .appointment-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .appointment-item {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }

    .appointment-time {
      width: 70px;
      font-weight: bold;
    }

    .appointment-info {
      flex: 1;
      padding: 0 15px;
    }

    .appointment-name {
      font-weight: 500;
    }

    .appointment-type {
      font-size: 0.9em;
      color: #666;
    }

    .appointment-status {
      width: 100px;
      text-align: right;
    }

    /* Стили для кнопок статусов */
    .btn-success {
      background-color: #28a745;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
    }

    .btn-warning {
      background-color: #ffc107;
      color: #212529;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
    }

    .btn-primary {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
    }

    .btn-danger {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
    }

    .btn-sm {
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
    }

    .status-waiting {
      color: #ffc107;
    }

    .status-in-progress {
      color: #007bff;
    }

    .status-completed {
      color: #28a745;
    }

    .status-cancelled {
      color: #dc3545;
    }

    .status-emergency {
      color: #dc3545;
      font-weight: bold;
    }

    .loading-placeholder {
      color: #999;
      font-style: italic;
    }

    .calendar-header {
      margin-bottom: 15px;
    }

    .date-nav {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .calendar-date {
      margin: 0 15px;
      font-weight: 500;
      min-width: 150px;
      text-align: center;
    }

    /* Стили для уведомления о смене роли */
    .role-switch-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      transform: translateX(120%);
      transition: transform 0.3s ease-out;
      z-index: 1000;
    }

    .role-switch-notification.show {
      transform: translateX(0);
    }

    .notification-icon {
      font-size: 18px;
      margin-right: 10px;
    }

    .notification-text {
      font-size: 14px;
    }

    /* Стили для вкладок переключения ролей */
    .role-switcher {
      margin-bottom: 20px;
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
    }

    .role-switcher-title {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }

    .role-tabs {
      display: flex;
      gap: 10px;
    }

    .role-tab {
      padding: 8px 15px;
      background-color: #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .role-tab:hover {
      background-color: #d0d0d0;
    }

    .role-tab.active {
      background-color: #007bff;
      color: white;
    }

    .chart-container {
      height: 300px;
      background-color: #fff;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
      position: relative;
      overflow: hidden;
    }

    .chart-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #757575;
      font-size: 16px;
      text-align: center;
    }

    /* Добавляем подсветку строк таблицы при наведении */
    .data-table tr:hover {
      background-color: #f5f5f5;
      cursor: pointer;
    }

    /* Цветовое кодирование значений */
    .high-value {
      color: #2E7D32;
      font-weight: bold;
    }

    .medium-value {
      color: #F57F17;
    }

    .low-value {
      color: #C62828;
    }

    .chart-container {
      height: 340px; /* Увеличиваем высоту для полного отображения */
      background-color: #fff;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
      position: relative;
      padding-bottom: 20px; /* Дополнительное пространство для подписей */
    }

    .chart-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #757575;
      font-size: 16px;
      text-align: center;
    }

    /* Стили для индикатора прокрутки */
    .scroll-indicator {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 5px;
      padding: 5px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }

    /* Добавляем подсветку строк таблицы при наведении */
    .data-table tr:hover {
      background-color: #f5f5f5;
      cursor: pointer;
    }

    /* Цветовое кодирование значений */
    .high-value {
      color: #2E7D32;
      font-weight: bold;
    }

    .medium-value {
      color: #F57F17;
    }

    .low-value {
      color: #C62828;
    }

    /* Стили для быстрых действий */
    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      justify-content: center;
    }

    .action-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 150px;
      height: 100px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f9f9f9;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      color: inherit;
    }

    .action-button:hover {
      background-color: #e9f5ff;
      border-color: #007bff;
      transform: translateY(-3px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }

    .action-button i {
      font-size: 24px;
      color: #007bff;
      margin-bottom: 8px;
    }

    .action-button span {
      font-size: 14px;
      color: #333;
    }

    /* Улучшаем стилизацию карточек */
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      overflow: hidden;
    }

    .card-header {
      padding: 15px 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f8f9fa;
    }

    .card-title {
      font-size: 18px;
      font-weight: bold;
      color: #009688;
    }

    .card-content {
      padding: 20px;
    }

    /* Стилизация таблицы расписания */
    .appointment-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .appointment-item {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #eee;
      padding: 12px 0;
    }

    .appointment-time {
      width: 80px;
      font-weight: bold;
      color: #333;
    }

    .appointment-info {
      flex: 1;
      padding: 0 15px;
    }

    .appointment-name {
      font-weight: 500;
    }

    .appointment-type {
      font-size: 0.9em;
      color: #666;
    }

    .appointment-status {
      width: 100px;
      text-align: right;
      padding-right: 10px;
    }

    .status-completed {
      color: #28a745;
    }

    .status-in-progress {
      color: #007bff;
    }

    .status-waiting {
      color: #ffc107;
    }

    .status-cancelled {
      color: #dc3545;
    }

    /* Стили для графика */
    .chart-container {
      height: 300px;
      margin-bottom: 30px;
      background-color: #f9f9f9;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e0e0e0;
    }

    /* Улучшенные стили для Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-card {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #009688;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
    }

    /* Адаптивность для мобильных устройств */
    @media (max-width: 768px) {
      .profile-info {
        grid-template-columns: 1fr;
      }

      .quick-actions {
        justify-content: space-around;
      }

      .action-button {
        width: 120px;
        height: 90px;
      }
    }
      .chart-container {
          height: 450px; /* Увеличено с 300px */
          background-color: #fff;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
          position: relative;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch; /* Для плавного скроллинга на iOS */
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .chart-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #757575;
          font-size: 16px;
          text-align: center;
        }
        
        .scroll-indicator {
          text-align: center;
          font-size: 12px;
          color: #0066cc;
          margin-top: 5px;
          padding: 5px 0;
          background-color: #f0f8ff;
          border-top: 1px solid #ccc;
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
          font-weight: bold;
        }  
  `;

    const styleElement = document.createElement('style');
    styleElement.textContent = scheduleStyles;
    document.head.appendChild(styleElement);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log("Страница загружена, инициализация...");

    // Добавляем стили
    addAppStyles();

    // Получаем пользователя из localStorage
    let user = null;
    let role = 'doctor'; // fallback по умолчанию
    try {
        user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role) {
            role = user.role;
        }
    } catch (e) {
        console.warn("Ошибка при получении роли из localStorage:", e);
    }

    console.log(`Текущая роль: ${role}`);

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
    } else {
        console.warn(`Элемент ${role}-content не найден`);
    }

    // Обновляем активную вкладку (если есть демонстрация ролей)
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-role') === role) {
            tab.classList.add('active');
        }
    });

    // Добавляем обработчики для ручного переключения ролей
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const newRole = this.getAttribute('data-role');
            switchRole(newRole);
        });
    });

    // Загружаем данные в зависимости от текущей роли
    if (role === 'admin') {
        if (typeof window.admin_loadData === 'function') {
            window.admin_loadData();
        } else {
            console.warn('Функция admin_loadData не найдена. Возможно, admin.js не загружен.');
        }
    } else if (role === 'doctor') {
        if (typeof window.loadDoctorData === 'function') {
            window.loadDoctorData();
        } else {
            console.warn('Функция loadDoctorData не найдена. Возможно, acc.js не загружен.');
        }
    }

    console.log("Инициализация завершена");
});