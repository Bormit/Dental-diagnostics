/**
 * DentalAI - Dashboard Module
 * Основной модуль для управления страницей амбулаторного приема
 */

// Глобальная переменная для текущей даты
let currentDate = new Date(); // Теперь всегда текущая дата

// Глобальная переменная для хранения последнего списка пациентов
let lastLoadedPatients = [];

// Основная инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  // Инициализация основных компонентов
  initCalendarNavigation();
  initPatientSearch();
  initStartAppointmentButtons(); // Обновлено для поддержки расширенной функциональности
  initNewPatientButton();
  loadPatientsFromDB(currentDate); // Передаем дату
});

/**
 * Инициализация кнопки "Новый пациент"
 */
function initNewPatientButton() {
  const newPatientBtn = document.getElementById('newPatientBtn');
  if (newPatientBtn) {
    newPatientBtn.addEventListener('click', function() {
      window.location.href = '../new-patient/new-patient.html';
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
      window.location.href = '../examination/examination.html';
      break;
    case 'analysis':
      // Переход на analysis.html с передачей id пациента через query string
      window.location.href = `../analysis/analysis.html?patient_id=${encodeURIComponent(patientId)}`;
      break;
    case 'treatment':
      window.location.href = '../treatment/treatment.html';
      break;
    case 'consultation':
      window.location.href = '../consultation/consultation.html';
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
  updateDateDisplay();

  // Обработчики для стрелок
  prevArrow.addEventListener('click', function() {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    loadPatientsFromDB(currentDate); // Загружаем пациентов на новую дату
  });

  nextArrow.addEventListener('click', function() {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    loadPatientsFromDB(currentDate); // Загружаем пациентов на новую дату
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
  const noResults = document.querySelector('.no-results');

  // Обработчики событий
  searchButton.addEventListener('click', function(e) {
    e.preventDefault();
    performSearch();
  });

  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });

  searchInput.addEventListener('input', function() {
    if (this.value.trim() === '') {
      clearSearch();
    }
  });

  // Функция поиска по ФИО
  function performSearch() {
    const searchText = searchInput.value.trim().toLowerCase();

    if (searchText === '') {
      clearSearch();
      return;
    }

    // Очищаем предыдущие результаты
    const category = searchResults.querySelector('.patient-category');
    const existingResults = category.querySelectorAll('.patient-item');
    existingResults.forEach(item => item.remove());

    // Скрываем обычный список и показываем результаты
    patientList.style.display = 'none';
    searchResults.style.display = 'block';

    // Фильтруем пациентов по ФИО
    let foundPatients = lastLoadedPatients.filter(p =>
      (p.name || '').toLowerCase().includes(searchText)
    );

    // Отображаем результаты
    if (foundPatients.length > 0) {
      noResults.style.display = 'none';

      foundPatients.forEach(patientObj => {
        const patient = createPatientItem(patientObj);
        // Подсвечиваем искомый текст
        const patientName = patient.querySelector('.patient-name');
        const name = patientName.textContent;
        const regex = new RegExp(searchText, 'gi');
        patientName.innerHTML = name.replace(regex, match =>
          `<span class="search-highlight">${match}</span>`);
        category.appendChild(patient);
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
    const category = searchResults.querySelector('.patient-category');
    const existingResults = category.querySelectorAll('.patient-item');
    existingResults.forEach(item => item.remove());
  }
}

/**
 * Загрузка пациентов из БД и отображение на странице
 * @param {Date} [dateObj] - дата для загрузки пациентов (по умолчанию сегодня)
 */
async function loadPatientsFromDB(dateObj) {
  const patientList = document.querySelector('.patient-list');
  if (!patientList) return;

  // Очистить текущий список
  patientList.innerHTML = '';

  let data = [];
  try {
    // Формируем дату в формате YYYY-MM-DD
    let dateParam = '';
    if (dateObj instanceof Date) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      dateParam = `${yyyy}-${mm}-${dd}`;
    }
    // Передаем дату в API
    const url = dateParam
      ? `http://localhost:8000/api/patients/by-date?date=${dateParam}`
      : 'http://localhost:8000/api/patients/today';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Ошибка загрузки данных пациентов');
    data = await response.json();
  } catch (e) {
    console.error('Ошибка загрузки пациентов:', e);
    patientList.innerHTML = '<div style="padding:20px;color:red;">Ошибка загрузки данных пациентов</div>';
    return;
  }

  // --- Фильтрация по врачу ---
  const currentDoctorId = localStorage.getItem('user_id');
  if (currentDoctorId) {
    data = data.filter(
      p => String(p.doctor_id) === String(currentDoctorId)
    );
  }
  // --- конец фильтрации ---

  // Сохраняем последний список пациентов для поиска
  lastLoadedPatients = data;

  // Сортировка по важности и времени
  const parseTime = t => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Используем поля напрямую из объекта p
  const getStatus = p => p.status;
  const getTime = p => p.time;

  const emergency = data
    .filter(p => getStatus(p) === 'экстренный')
    .sort((a, b) => parseTime(getTime(a)) - parseTime(getTime(b)));
  const waiting = data
    .filter(p => getStatus(p) !== 'экстренный')
    .sort((a, b) => parseTime(getTime(a)) - parseTime(getTime(b)));

  // Экстренные
  if (emergency.length > 0) {
    const cat = document.createElement('div');
    cat.className = 'patient-category';
    cat.innerHTML = `
      <div class="category-header category-emergency">ЭКСТРЕННЫЕ ${emergency.length}</div>
    `;
    emergency.forEach(p => {
      cat.appendChild(createPatientItem(p));
    });
    patientList.appendChild(cat);
  }

  // Ожидающие
  if (waiting.length > 0) {
    const cat = document.createElement('div');
    cat.className = 'patient-category';
    cat.innerHTML = `
      <div class="category-header category-waiting">ОЖИДАЮЩИЕ ${waiting.length}</div>
    `;
    waiting.forEach(p => {
      cat.appendChild(createPatientItem(p));
    });
    patientList.appendChild(cat);
  }

  // После динамического добавления — инициализировать кнопки
  initStartAppointmentButtons();
}

/**
 * Создание DOM-элемента пациента
 */
function createPatientItem(patient) {
  const item = document.createElement('div');
  item.className = 'patient-item';
  item.dataset.patientId = patient.id;

  // Используем данные напрямую из patient
  const status = patient.status;
  const time = patient.time;
  const type = patient.type;
  const reason = patient.reason;

  // Формируем статус-бейдж
  let statusBadge = '';
  if (status === 'экстренный') {
    statusBadge = `<span class="status-badge status-emergency">экстренный</span>`;
  }

  // Формируем строку назначения (reason)
  let reasonHtml = '';
  if (reason && reason.trim()) {
    reasonHtml = `<div class="patient-reason"><span style="color:#888;">Назначение:</span> ${reason}</div>`;
  }

  item.innerHTML = `
    <div class="patient-time">${time || ''}</div>
    <div class="patient-info">
      <div class="patient-name">${patient.name} ${statusBadge}</div>
      <div class="patient-details">${patient.gender}, ${patient.age} лет • ${type || ''}</div>
      ${reasonHtml}
    </div>
    <div class="patient-actions">
      <button class="start-appointment-btn"
        data-patient-id="${patient.id}"
        data-patient-name="${patient.name}"
        data-patient-age="${patient.age}"
        data-patient-gender="${patient.gender}"
        data-appointment-type="${type || ''}"
        data-patient-status="${status || ''}"
        data-card="${patient.card || ''}"
      >Начать прием</button>
    </div>
  `;
  return item;
}