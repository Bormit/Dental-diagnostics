/**
 * DentalAI - Dashboard Module
 * Основной модуль для управления страницей амбулаторного приема
 */

// Основная инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  // Инициализация основных компонентов
  initCalendarNavigation();
  initPatientSearch();
  initStartAppointmentButtons(); // Обновлено для поддержки расширенной функциональности
  initNewPatientButton();
  initUploadZone();
});

/**
 * Инициализация кнопки "Новый пациент"
 */
function initNewPatientButton() {
  const newPatientBtn = document.getElementById('newPatientBtn');
  if (newPatientBtn) {
    newPatientBtn.addEventListener('click', function() {
      window.location.href = 'new-patient.html';
    });
  }
}

/**
 * Инициализация загрузки файлов
 */
function initUploadZone() {
  const uploadZone = document.querySelector('.upload-zone');
  if (uploadZone) {
    uploadZone.addEventListener('click', function() {
      // Здесь будет окно выбора файла в реальной системе
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.click();
      
      fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          // Простая имитация загрузки файла
          const fileName = this.files[0].name;
          alert(`Файл "${fileName}" будет загружен в систему`);
        }
      });
    });
  }
}

/**
 * Инициализация кнопок начала приема пациентов
 */
function initStartAppointmentButtons() {
  const startAppointmentButtons = document.querySelectorAll('.patient-actions button');
  if (startAppointmentButtons) {
    startAppointmentButtons.forEach(button => {
      button.addEventListener('click', handleStartAppointment);
    });
  }
}

/**
 * Функция обработки нажатия на кнопку "Начать прием"
 */
function handleStartAppointment(event) {
  const button = event.currentTarget;
  
  // Получаем данные о пациенте из data-атрибутов или из DOM
  const patientId = button.dataset.patientId || button.dataset.id || '123';
  const patientName = button.dataset.patientName || button.dataset.name || 
    button.closest('.patient-item')?.querySelector('.patient-name')?.textContent || 'Пациент';
  const patientAge = button.dataset.patientAge || '45';
  const patientGender = button.dataset.patientGender || 'М';
  const appointmentType = button.dataset.appointmentType || 'Плановый прием';
  const patientStatus = button.dataset.patientStatus || '';
  const patientCard = button.dataset.card || button.dataset.patientId || 'Н/Д';
  
  // Получаем время приема из родительского элемента
  const patientItem = button.closest('.patient-item');
  const appointmentTime = patientItem ? patientItem.querySelector('.patient-time')?.textContent : '';
  
  // Формируем подробную информацию о пациенте
  const patientDetails = `${patientGender}, ${patientAge} лет • ${appointmentType}`;
  
  // Создаем модальное окно для начала приема
  createAppointmentModal(patientName, patientDetails, appointmentTime, patientId, patientStatus, patientCard);
}

/**
 * Создает модальное окно выбора типа приема
 */
function createAppointmentModal(patientName, patientDetails, appointmentTime, patientId, patientStatus, patientCard) {
  // Удаляем старое модальное окно, если оно есть
  const oldModal = document.getElementById('appointmentModal');
  if (oldModal) {
    oldModal.remove();
  }
  
  // Создаем новое модальное окно
  const modal = document.createElement('div');
  modal.id = 'appointmentModal';
  modal.className = 'appointment-modal';
  
  // Определяем заголовок в зависимости от статуса
  let statusHTML = '';
  if (patientStatus === 'экстренный') {
    statusHTML = `<span class="status-badge status-emergency">экстренный</span>`;
  }
  
  // HTML содержимое модального окна
  modal.innerHTML = `
    <div class="appointment-modal-content">
      <div class="appointment-modal-header">
        <h2>Начало приема пациента ${statusHTML}</h2>
        <button class="appointment-modal-close">&times;</button>
      </div>
      <div class="appointment-modal-body">
        <div class="patient-info-section">
          <h3 class="section-title">Информация о пациенте</h3>
          <div class="patient-info-item">
            <div class="patient-info-label">ФИО:</div>
            <div class="patient-info-value">${patientName}</div>
          </div>
          <div class="patient-info-item">
            <div class="patient-info-label">Данные:</div>
            <div class="patient-info-value">${patientDetails}</div>
          </div>
          <div class="patient-info-item">
            <div class="patient-info-label">Время приема:</div>
            <div class="patient-info-value">${appointmentTime}</div>
          </div>
          <div class="patient-info-item">
            <div class="patient-info-label">Номер карты:</div>
            <div class="patient-info-value">${patientCard}</div>
          </div>
        </div>
        
        <div class="appointment-options">
          <h3 class="section-title">Выберите действие</h3>
          <div class="appointment-options-buttons">
            <button class="appointment-option" data-type="examination">Стоматологический осмотр</button>
            <button class="appointment-option" data-type="analysis">Анализ рентгеновских снимков</button>
            <button class="appointment-option" data-type="treatment">Лечение</button>
            <button class="appointment-option" data-type="consultation">Консультация</button>
          </div>
        </div>
      </div>
      <div class="appointment-modal-footer">
        <button class="appointment-modal-cancel">Отмена</button>
        <button class="appointment-modal-start" disabled>Начать прием</button>
      </div>
    </div>
  `;
  
  // Добавляем модальное окно в DOM
  document.body.appendChild(modal);
  
  // Показываем модальное окно с анимацией
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  
  // Настраиваем обработчики событий
  setupModalEventHandlers(modal, patientId, patientName, patientDetails, patientCard);
}

/**
 * Настройка обработчиков событий для модального окна
 */
function setupModalEventHandlers(modal, patientId, patientName, patientDetails, patientCard) {
  // Обработчик закрытия модального окна
  const closeModalBtn = modal.querySelector('.appointment-modal-close');
  const cancelBtn = modal.querySelector('.appointment-modal-cancel');
  const startBtn = modal.querySelector('.appointment-modal-start');
  const optionButtons = modal.querySelectorAll('.appointment-option');
  
  let selectedType = null;
  
  // Выбор типа приема
  optionButtons.forEach(button => {
    button.addEventListener('click', () => {
      optionButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      selectedType = button.dataset.type;
      startBtn.removeAttribute('disabled');
    });
  });
  
  // Функция закрытия модального окна с анимацией
  function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
  
  // Обработчики закрытия
  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  // Закрытие по клику вне окна
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Начало приема
  startBtn.addEventListener('click', function() {
    if (selectedType) {
      startAppointmentByType(selectedType, patientId, patientName, patientCard);
      updatePatientStatus(patientId);
      closeModal();
    } else {
      alert('Пожалуйста, выберите тип приема');
    }
  });
}

/**
 * Функция для перехода к выбранному типу приема
 */
function startAppointmentByType(type, patientId, patientName, patientCard) {
  // Сохраняем данные о пациенте для использования в других страницах
  sessionStorage.setItem('currentPatientId', patientId);
  sessionStorage.setItem('currentPatientName', patientName);
  sessionStorage.setItem('currentPatientCard', patientCard);
  sessionStorage.setItem('appointmentType', type);
  sessionStorage.setItem('appointmentStartTime', new Date().toISOString());
  
  // Перенаправление на соответствующую страницу
  switch (type) {
    case 'examination':
      window.location.href = 'examination.html';
      break;
    case 'analysis':
      window.location.href = 'analysis.html';
      break;
    case 'treatment':
      window.location.href = 'treatment.html';
      break;
    case 'consultation':
      window.location.href = 'consultation.html';
      break;
  }
}

/**
 * Обновление статуса пациента после начала приема
 */
function updatePatientStatus(patientId) {
  // В реальной системе здесь был бы API-запрос для обновления статуса
  console.log(`Обновлен статус пациента с ID: ${patientId} на "В приеме"`);
  
  // Для демонстрации можно обновить DOM
  const patientItems = document.querySelectorAll('.patient-item');
  patientItems.forEach(item => {
    const button = item.querySelector('button[data-patient-id="' + patientId + '"]');
    if (button || item.dataset.patientId === patientId) {
      const statusElem = document.createElement('span');
      statusElem.className = 'status-in-progress';
      statusElem.textContent = 'В приеме';
      
      // Заменяем кнопку на статус
      if (button) {
        button.parentNode.replaceChild(statusElem, button);
      } else {
        const actions = item.querySelector('.patient-actions');
        if (actions) {
          actions.innerHTML = '';
          actions.appendChild(statusElem);
        }
      }
    }
  });
}

/**
 * Инициализация календаря и навигации по датам
 */
function initCalendarNavigation() {
  // Получаем элементы DOM
  const prevArrow = document.querySelector('.calendar-arrow:first-child');
  const nextArrow = document.querySelector('.calendar-arrow:last-child');
  const dateDisplay = document.querySelector('.calendar-date-input');
  
  if (!prevArrow || !nextArrow || !dateDisplay) return;
  
  // Текущая активная дата
  let currentDate = new Date('2025-03-05'); // Начальная дата
  
  // Инициализируем отображение даты
  updateDateDisplay();
  
  // Обработчики для стрелок
  prevArrow.addEventListener('click', function() {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    loadAppointmentsForDate();
  });
  
  nextArrow.addEventListener('click', function() {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    loadAppointmentsForDate();
  });
  
  // Стилизуем стрелки
  prevArrow.style.cursor = 'pointer';
  nextArrow.style.cursor = 'pointer';
  document.querySelectorAll('.calendar-arrow').forEach(arrow => {
    arrow.classList.add('interactive');
  });
  
  // Форматирование и отображение даты
  function updateDateDisplay() {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = currentDate.toLocaleDateString('ru-RU', options);
    
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayOfWeek = days[currentDate.getDay()];
    
    dateDisplay.textContent = `${formattedDate}, ${dayOfWeek}`;
    
    // Подсвечиваем выходные дни
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      dateDisplay.classList.add('weekend');
    } else {
      dateDisplay.classList.remove('weekend');
    }
  }
  
  // Загрузка приемов на выбранную дату
  function loadAppointmentsForDate() {
    const patientList = document.querySelector('.patient-list');
    if (!patientList) return;
    
    // Индикатор загрузки
    patientList.classList.add('loading');
    
    // Имитация загрузки данных (заменить на реальный запрос API)
    setTimeout(() => {
      patientList.classList.remove('loading');
      
      // Обновление счетчиков (для демонстрации)
      const day = currentDate.getDay();
      const waitingCount = document.querySelector('.category-waiting');
      const emergencyCount = document.querySelector('.category-emergency');
      
      if (waitingCount) {
        waitingCount.textContent = `ОЖИДАЮЩИЕ ${day + 1}`;
      }
      
      if (emergencyCount) {
        emergencyCount.textContent = `ЭКСТРЕННЫЕ ${Math.max(0, Math.floor(Math.random() * 3))}`;
      }
    }, 300);
  }
}

/**
 * Инициализация поиска пациентов
 */
function initPatientSearch() {
  const searchInput = document.getElementById('patientSearchInput');
  if (!searchInput) return;
  
  const searchButton = document.getElementById('searchButton');
  const patientList = document.querySelector('.patient-list');
  const searchResults = document.getElementById('searchResults');
  const patientItems = document.querySelectorAll('.patient-item');
  const noResults = document.querySelector('.no-results');
  
  // Обработчики событий
  searchButton.addEventListener('click', performSearch);
  
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  searchInput.addEventListener('input', function() {
    if (this.value.trim() === '') {
      clearSearch();
    }
  });
  
  // Функция поиска
  function performSearch() {
    const searchText = searchInput.value.trim().toLowerCase();
    
    if (searchText === '') {
      clearSearch();
      return;
    }
    
    // Очищаем предыдущие результаты
    const existingResults = searchResults.querySelectorAll('.patient-item');
    existingResults.forEach(item => item.remove());
    
    // Скрываем обычный список и показываем результаты
    patientList.style.display = 'none';
    searchResults.style.display = 'block';
    
    // Ищем пациентов по ФИО
    let foundPatients = [];
    patientItems.forEach(item => {
      const patientName = item.querySelector('.patient-name').textContent.toLowerCase();
      if (patientName.includes(searchText)) {
        foundPatients.push(item.cloneNode(true));
      }
    });
    
    // Отображаем результаты
    if (foundPatients.length > 0) {
      noResults.style.display = 'none';
      
      // Добавляем найденных пациентов в результаты
      foundPatients.forEach(patient => {
        // Подсвечиваем искомый текст
        const patientName = patient.querySelector('.patient-name');
        const name = patientName.textContent;
        const regex = new RegExp(searchText, 'gi');
        patientName.innerHTML = name.replace(regex, match => 
          `<span class="search-highlight">${match}</span>`);
        
        searchResults.querySelector('.patient-category').appendChild(patient);
      });
      
      // Обновляем заголовок
      const header = searchResults.querySelector('.category-header');
      header.textContent = `РЕЗУЛЬТАТЫ ПОИСКА (${foundPatients.length})`;
    } else {
      noResults.style.display = 'block';
    }
  }
  
  // Функция очистки поиска
  function clearSearch() {
    searchInput.value = '';
    searchResults.style.display = 'none';
    patientList.style.display = 'block';
    
    // Очищаем результаты поиска
    const existingResults = searchResults.querySelectorAll('.patient-item');
    existingResults.forEach(item => item.remove());
  }
}