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
      closeModal();
    } else {
      alert('Пожалуйста, выберите тип приема');
    }
  });
}

// Функция startAppointmentByType - примерно строка 169-194
function startAppointmentByType(type, patientId, patientName, patientCard) {
  // Преобразование UI типа в тип для базы данных
  let dbType = 'diagnostics'; // По умолчанию

  switch(type) {
    case 'analysis':
      dbType = 'diagnostics';
      break;
    case 'treatment':
      dbType = 'treatment';
      break;
    case 'examination':
      dbType = 'diagnostics'; // или другое подходящее значение
      break;
    case 'consultation':
      dbType = 'consultation';
      break;
  }

  // Сохраняем UI тип для отображения, но используем правильный dbType для API
  sessionStorage.setItem('appointmentType', dbType);
  sessionStorage.setItem('appointmentUIType', type); // Для интерфейса
  sessionStorage.setItem('currentPatientId', patientId);
  sessionStorage.setItem('currentPatientName', patientName);
  sessionStorage.setItem('currentPatientCard', patientCard);
  sessionStorage.setItem('appointmentStartTime', new Date().toISOString());

  // Обновляем статус приема в БД - здесь важно использовать правильный статус
  updatePatientStatus(patientId, 'in_progress'); // in_progress - правильный статус

  // Перенаправление на соответствующую страницу
  switch (type) {
    case 'examination':
      window.location.href = '../examination/examination.html';
      break;
    case 'analysis':
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

// Функция updatePatientStatus - строки ~194-250
function updatePatientStatus(patientId, status) {
  // Находим запись в таблице appointments для данного пациента
  const appointmentId = findAppointmentIdByPatientId(patientId);

  if (!appointmentId) {
    console.error('Не найдена запись о приеме для пациента с ID:', patientId);
    return;
  }

  // Используем только правильные значения статусов
  let dbStatus = 'in_progress'; // По умолчанию для безопасности

  // Можем сохранить исходный вид действия для отображения в интерфейсе
  let statusText = 'В приеме';
  let statusClass = 'status-in-progress';

  // Опционально: сохраняем тип действия, но не меняем статус
  // (статус всегда должен быть из appointment_status_enum)
  switch (status) {
    case 'examination':
      statusText = 'Осмотр';
      break;
    case 'analysis':
      statusText = 'Анализ снимков';
      break;
    case 'treatment':
      statusText = 'Лечение';
      break;
    case 'consultation':
      statusText = 'Консультация';
      break;
      // Если передается правильный статус, используем его
    case 'scheduled':
    case 'in_progress':
    case 'completed':
    case 'canceled':
    case 'no_show':
      dbStatus = status;
      break;
  }

  // Отправляем запрос на сервер для обновления статуса
  updateAppointmentStatusInDB(appointmentId, dbStatus, sessionStorage.getItem('appointmentUIType') || 'diagnostics')
      .then(success => {
        if (success) {
          console.log(`Статус приема (ID: ${appointmentId}) обновлен на ${dbStatus}`);
          // Обновляем DOM - для отображения используем UI значения
          updatePatientStatusInDOM(patientId, statusText, statusClass);
        } else {
          console.error('Не удалось обновить статус приема');
        }
      });
}


/**
 * Отправляет запрос к API для обновления статуса записи в БД
 */
async function updateAppointmentStatusInDB(appointmentId, status, appointmentType) {
  try {
    // Формируем данные для запроса
    const data = {
      appointment_id: appointmentId,
      status: status,
      appointment_type: appointmentType,
      updated_at: new Date().toISOString()
    };

    // Формируем URL для запроса
    const url = 'http://localhost:8000/api/appointments/update-status';

    // В демо-режиме просто возвращаем успех без реального запроса
    const isDemoMode = true;

    if (isDemoMode) {
      console.log('Демо-режим: имитация успешного обновления статуса в БД', data);
      return true;
    }

    // Отправка запроса на сервер
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Ошибка при обновлении статуса в БД:', error);
    return false;
  }
}

/**
 * Находит ID записи о приеме для пациента
 * В реальной системе этот ID может приходить непосредственно с сервера
 * Здесь мы эмулируем эту функциональность
 */
function findAppointmentIdByPatientId(patientId) {
  // В реальной системе здесь был бы поиск в данных,
  // которые приходят с сервера
  // Для демонстрации просто считаем, что appointmentId = patientId
  return patientId;
}

/**
 * Обновление статуса пациента после начала приема
 */
function updatePatientStatus(patientId, appointmentType) {
  // Находим запись в таблице appointments для данного пациента
  const appointmentId = findAppointmentIdByPatientId(patientId);

  if (!appointmentId) {
    console.error('Не найдена запись о приеме для пациента с ID:', patientId);
    return;
  }

  // Определяем статус в зависимости от выбранного действия
  let newStatus = 'in_progress'; // базовый статус "в процессе"
  let statusText = 'В приеме';
  let statusClass = 'status-in-progress';

  switch (appointmentType) {
    case 'examination':
      statusText = 'Осмотр';
      break;
    case 'analysis':
      statusText = 'Анализ снимков';
      break;
    case 'treatment':
      statusText = 'Лечение';
      break;
    case 'consultation':
      statusText = 'Консультация';
      break;
  }

  // Отправляем запрос на сервер для обновления статуса
  updateAppointmentStatusInDB(appointmentId, newStatus, appointmentType)
      .then(success => {
        if (success) {
          console.log(`Статус приема (ID: ${appointmentId}) обновлен на ${newStatus} (${appointmentType})`);

          // Обновляем DOM - меняем отображение статуса пациента в списке
          updatePatientStatusInDOM(patientId, statusText, statusClass);
        } else {
          console.error('Не удалось обновить статус приема');
        }
      })
      .catch(error => {
        console.error('Ошибка при обновлении статуса:', error);
        // Все равно обновляем DOM, даже если запрос к API не удался
        updatePatientStatusInDOM(patientId, statusText, statusClass);
      });
}

/**
 * Обновляет отображение статуса пациента в DOM
 */
/**
 * Обновляет отображение статуса пациента в DOM
 */
function updatePatientStatusInDOM(patientId, statusText, statusClass) {
  const patientItems = document.querySelectorAll('.patient-item');

  patientItems.forEach(item => {
    // Проверяем, соответствует ли элемент искомому пациенту
    const itemPatientId = item.dataset.patientId;
    const button = item.querySelector(`button[data-patient-id="${patientId}"]`);

    if (button || itemPatientId === patientId) {
      // Создаем элемент статуса
      const statusElem = document.createElement('span');
      statusElem.className = statusClass || 'status-in-progress';
      statusElem.textContent = statusText;

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

      // Добавляем визуальное выделение строки
      item.classList.add('appointment-active');
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

    // Добавляем параметр для принудительного обновления (борьба с кэшированием)
    const cacheBuster = `&_=${Date.now()}`;

    // Передаем дату в API
    const url = dateParam
        ? `http://localhost:8000/api/patients/by-date?date=${dateParam}${cacheBuster}`
        : `http://localhost:8000/api/patients/today${cacheBuster}`;

    console.log('Загрузка пациентов, URL:', url);

    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache' } // Отключаем кэширование
    });

    if (!response.ok) throw new Error('Ошибка загрузки данных пациентов');
    data = await response.json();

    // Отладочная информация - проверяем данные Морозова
    const morozov = data.find(p => p.id === 9 || (p.name && p.name.includes('Морозов')));
    if (morozov) {
      console.log('Данные пациента Морозов из API:', morozov);
    }

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

  // --- УЛУЧШЕННАЯ ФИЛЬТРАЦИЯ ПО СТАТУСУ ---
  data = data.filter(patient => {
    // Проверяем все возможные варианты статуса "completed"
    const status = String(patient.status || '').toLowerCase();
    const isCompleted = status === 'completed' || status === 'завершено';

    // Для отладки - проверяем конкретно Морозова
    if (patient.id === 9 || (patient.name && patient.name.includes('Морозов'))) {
      console.log('Фильтрация Морозова:', patient.name, 'Статус:', status, 'Исключен:', isCompleted);
    }

    // Исключаем пациентов с завершенным статусом
    return !isCompleted;
  });

  // Обрабатываем пациентов для корректного отображения статусов
  data = processLoadedPatients(data);

  // Сохраняем последний список пациентов для поиска
  lastLoadedPatients = data;

  // Сортировка по важности и времени
  const parseTime = t => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Проверяем, остался ли Морозов после всех фильтраций
  const morozovAfterFilter = data.find(p => p.id === 9 || (p.name && p.name.includes('Морозов')));
  if (morozovAfterFilter) {
    console.log('Морозов остался после всех фильтраций:', morozovAfterFilter);
  } else {
    console.log('Морозов был исключен из списка отображаемых пациентов');
  }

  // Разделяем пациентов на группы
  const emergency = data
      .filter(p => {
        // Проверка экстренного статуса
        const isEmergency =
            p.status === 'экстренный' ||
            p.status === 'emergency' ||
            p.appointment_type === 'emergency' ||
            (typeof p.type === 'string' && p.type.toLowerCase().includes('экстрен'));

        // Дополнительная проверка для отладки Морозова
        if (p.id === 9 || (p.name && p.name.includes('Морозов'))) {
          console.log('Проверка экстренности Морозова:', isEmergency, p);
        }

        return isEmergency;
      })
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));

  const inProgress = data
      .filter(p => {
        const status = String(p.status || '').toLowerCase();
        return status === 'in_progress' ||
            status === 'treatment' ||
            status === 'analysis' ||
            status === 'examination' ||
            status === 'consultation';
      })
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));

  // Улучшенная логика для ожидающих
  const waiting = data
      .filter(p => {
        // Прямая проверка статуса "scheduled"
        const status = String(p.status || '').toLowerCase();
        const isScheduled = status === 'scheduled';

        // Не экстренные
        const notEmergency =
            status !== 'экстренный' &&
            status !== 'emergency' &&
            p.appointment_type !== 'emergency' &&
            !(typeof p.type === 'string' && p.type.toLowerCase().includes('экстрен'));

        // Не в процессе
        const notInProgress =
            status !== 'in_progress' &&
            status !== 'treatment' &&
            status !== 'analysis' &&
            status !== 'examination' &&
            status !== 'consultation';

        return (isScheduled || (notEmergency && notInProgress));
      })
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));

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

  // В процессе приема
  if (inProgress.length > 0) {
    const cat = document.createElement('div');
    cat.className = 'patient-category';
    cat.innerHTML = `
      <div class="category-header category-in-progress">В ПРИЕМЕ ${inProgress.length}</div>
    `;
    inProgress.forEach(p => {
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

// Обновленная функция создания элемента пациента
function createPatientItem(patient) {
  const item = document.createElement('div');
  item.className = 'patient-item';
  item.dataset.patientId = patient.id;

  // Используем данные напрямую из patient
  const status = patient.status;
  const time = patient.time;
  const type = patient.type;
  const reason = patient.reason;

  // Формируем отображение статуса
  let statusHtml = '';

  // Используем statusDisplay, если он есть (добавляется в processLoadedPatients)
  if (patient.statusDisplay) {
    if (patient.statusDisplay.text) {
      statusHtml = `<span class="status-badge ${patient.statusDisplay.class}">${patient.statusDisplay.text}</span>`;
    }
  } else if (status === 'экстренный') {
    statusHtml = `<span class="status-badge status-emergency">экстренный</span>`;
  }

  // Формируем строку назначения (reason)
  let reasonHtml = '';
  if (reason && reason.trim()) {
    reasonHtml = `<div class="patient-reason"><span style="color:#888;">Назначение:</span> ${reason}</div>`;
  }

  // Определяем, нужно ли отображать кнопку или статус
  let actionsHtml = '';

  // Если статус завершен или в процессе приема, показываем статус вместо кнопки
  if (status === 'completed') {
    actionsHtml = `<div class="patient-actions"><span class="status-completed">Завершено ✓</span></div>`;
  } else if (status === 'in_progress' || status === 'treatment' || status === 'analysis' ||
      status === 'examination' || status === 'consultation') {
    // Если есть statusDisplay, используем его
    if (patient.statusDisplay) {
      actionsHtml = `<div class="patient-actions"><span class="${patient.statusDisplay.class}">${patient.statusDisplay.text}</span></div>`;
    } else {
      actionsHtml = `<div class="patient-actions"><span class="status-in-progress">В приеме</span></div>`;
    }
  } else {
    // Для остальных показываем кнопку "Начать прием"
    actionsHtml = `
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
  }

  item.innerHTML = `
    <div class="patient-time">${time || ''}</div>
    <div class="patient-info">
      <div class="patient-name">${patient.name} ${statusHtml}</div>
      <div class="patient-details">${patient.gender}, ${patient.age} лет • ${type || ''}</div>
      ${reasonHtml}
    </div>
    ${actionsHtml}
  `;
  return item;
}

/**
 * Функция обработки загруженных пациентов для отображения правильных статусов
 * @param {Array} patients - массив пациентов
 */
function processLoadedPatients(patients) {
  // Клонируем массив пациентов, чтобы не изменять оригинал
  let processed = JSON.parse(JSON.stringify(patients));

  // Обрабатываем пациентов, добавляя дополнительные свойства для отображения
  processed.forEach(patient => {
    // Проверяем статус назначения
    if (patient.status === 'completed') {
      // Для завершенных назначений добавляем специальное отображение
      patient.statusDisplay = {
        text: 'Завершено',
        class: 'status-completed',
        icon: '✓'
      };
    } else if (patient.status === 'in_progress' || patient.status === 'treatment' ||
        patient.status === 'analysis' || patient.status === 'examination' ||
        patient.status === 'consultation') {
      // Для назначений в процессе выполнения
      let statusText = 'В приеме';
      let statusClass = 'status-in-progress';

      // Определяем текст статуса на основе типа
      switch (patient.status) {
        case 'treatment':
          statusText = 'Лечение';
          statusClass = 'status-treatment';
          break;
        case 'analysis':
          statusText = 'Анализ снимков';
          statusClass = 'status-analysis';
          break;
        case 'examination':
          statusText = 'Осмотр';
          statusClass = 'status-examination';
          break;
        case 'consultation':
          statusText = 'Консультация';
          statusClass = 'status-consultation';
          break;
      }

      patient.statusDisplay = {
        text: statusText,
        class: statusClass
      };
    } else if (patient.status === 'emergency') {
      // Для экстренных пациентов
      patient.statusDisplay = {
        text: 'Экстренный',
        class: 'status-emergency'
      };
    } else {
      // Для ожидающих пациентов (status = scheduled или другие)
      patient.statusDisplay = {
        text: '',
        class: ''
      };
    }
  });

  return processed;
}