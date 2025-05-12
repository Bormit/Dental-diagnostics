// acc.js - Функции для роли врача

// Функции объявляем в глобальном контексте (window) для доступа из других скриптов
window.loadDoctorProfile = function() {
  console.log("Загрузка профиля врача...");

  // Получаем данные пользователя из localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Обновляем имя врача в верхнем правом углу
  if (document.getElementById('userFullName')) {
    document.getElementById('userFullName').textContent = user.full_name || 'Врач';
  }

  // Обновляем поля профиля врача
  const fieldsToUpdate = {
    'doctor-full-name': user.full_name || 'Не указано',
    'doctor-specialty': user.specialty || 'Врач-стоматолог',
    'doctor-experience': '5 лет',
    'doctor-phone': '+7 (900) 123-45-67',
    'doctor-email': user.email || 'doctor@dentalai.ru',
    'doctor-schedule': 'Пн-Пт: 09:00 - 18:00'
  };

  // Обновляем все поля, которые существуют на странице
  Object.keys(fieldsToUpdate).forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.textContent = fieldsToUpdate[fieldId];
    }
  });

  console.log("Профиль врача загружен");
};

// Загрузка статистики врача
window.loadDoctorStatistics = function() {
  console.log("Загрузка статистики врача...");

  // Статистика, если элементы существуют
  if (document.getElementById('doctor-appointments-count')) {
    document.getElementById('doctor-appointments-count').textContent = '28';
  }
  if (document.getElementById('doctor-diagnostics-accuracy')) {
    document.getElementById('doctor-diagnostics-accuracy').textContent = '91%';
  }
  if (document.getElementById('doctor-waiting-patients')) {
    document.getElementById('doctor-waiting-patients').textContent = '8';
  }

  console.log("Статистика врача загружена");
};

// Загрузка статистики диагностики
window.loadDiagnosticsStatistics = function() {
  console.log("Загрузка статистики диагностики...");

  const tableBody = document.getElementById('diagnostics-table-body');
  if (!tableBody) {
    console.error("Элемент diagnostics-table-body не найден");
    return;
  }

  // Вместо захардкоженных данных мы должны запросить их с сервера
  fetch(`${API_BASE_URL}/api/pathologies/statistics`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке статистики патологий');
        }
        return response.json();
      })
      .then(data => {
        displayDiagnosticsStatistics(data);
        // После загрузки данных инициализируем график с небольшой задержкой
        setTimeout(() => {
          if (typeof window.renderDiagnosticsChart === 'function') {
            window.renderDiagnosticsChart();
          } else {
            console.error("Функция renderDiagnosticsChart не найдена");
          }
        }, 100);
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // В случае ошибки используем демо-данные, которые соответствуют вашей базе данных
        const demoDiagnosticsData = [
          { diagnosis: 'Кариес', code: '1', count: 28, ai_accuracy: 94, treatment_efficiency: 97 },
          { diagnosis: 'Глубокий кариес', code: '2', count: 15, ai_accuracy: 89, treatment_efficiency: 92 },
          { diagnosis: 'Периапикальное поражение', code: '3', count: 12, ai_accuracy: 87, treatment_efficiency: 85 },
          { diagnosis: 'Ретинированный зуб', code: '4', count: 8, ai_accuracy: 91, treatment_efficiency: 93 }
        ];

        displayDiagnosticsStatistics(demoDiagnosticsData);
        // После загрузки демо-данных инициализируем график с небольшой задержкой
        setTimeout(() => {
          if (typeof window.renderDiagnosticsChart === 'function') {
            window.renderDiagnosticsChart();
          } else {
            console.error("Функция renderDiagностicsChart не найдена");
          }
        }, 100);
      });
};

// Отдельная функция для отображения данных
function displayDiagnosticsStatistics(diagnosticsData) {
  const tableBody = document.getElementById('diagnostics-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  diagnosticsData.forEach(item => {
    const row = document.createElement('tr');

    // Добавляем классы для цветового кодирования
    const accuracyClass = item.ai_accuracy >= 90 ? 'high-value' :
        item.ai_accuracy >= 80 ? 'medium-value' : 'low-value';

    const efficiencyClass = item.treatment_efficiency >= 95 ? 'high-value' :
        item.treatment_efficiency >= 85 ? 'medium-value' : 'low-value';

    row.innerHTML = `
      <td>${item.diagnosis}</td>
      <td>${item.count}</td>
      <td class="${accuracyClass}">${item.ai_accuracy}%</td>
      <td class="${efficiencyClass}">${item.treatment_efficiency}%</td>
    `;

    tableBody.appendChild(row);
  });
}

// Обновленная функция инициализации диаграммы
window.initDiagnosticsChart = function() {
  console.log("Инициализация графика диагностики...");

  const chartContainer = document.getElementById('diagnostics-chart');
  if (!chartContainer) {
    console.warn("Элемент diagnostics-chart не найден");
    return;
  }

  // Очищаем контейнер перед добавлением нового canvas и индикаторов
  chartContainer.innerHTML = '';

  // Получаем данные из таблицы
  const tableBody = document.getElementById('diagnostics-table-body');
  if (!tableBody) {
    chartContainer.innerHTML = '<div class="chart-placeholder">Нет данных для отображения графика</div>';
    console.warn("Элемент diagnostics-table-body не найден");
    return;
  }

  // Получаем строки таблицы
  const rows = tableBody.querySelectorAll('tr');
  if (!rows || rows.length === 0) {
    chartContainer.innerHTML = '<div class="chart-placeholder">Нет данных для отображения графика</div>';
    console.warn("Нет строк в таблице диагностики");
    return;
  }

  // Создаем canvas
  const canvas = document.createElement('canvas');
  canvas.height = 300; // Фиксированная высота
  canvas.width = chartContainer.clientWidth || 800;
  chartContainer.appendChild(canvas);

  // Получаем контекст рендеринга
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error("Не удалось получить контекст canvas");
    return;
  }

  // Собираем данные из таблицы
  const data = [];
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      // Удаляем символ % из текстового содержимого
      const accuracyText = cells[2].textContent.replace('%', '');
      const efficiencyText = cells[3].textContent.replace('%', '');

      data.push({
        diagnosis: cells[0].textContent,
        count: parseInt(cells[1].textContent, 10),
        accuracy: parseInt(accuracyText, 10),
        efficiency: parseInt(efficiencyText, 10)
      });
    }
  });

  console.log("Данные для графика:", data);

  // Определяем цвета для диаграммы
  const chartColors = {
    accuracy: '#3498db',    // Синий для точности ИИ
    efficiency: '#2ecc71',  // Зеленый для эффективности лечения
    count: '#e67e22'        // Оранжевый для количества случаев
  };

  // Рисуем диаграмму
  drawChart(ctx, data, canvas.width, canvas.height, chartColors);

  console.log("График диагностики инициализирован");
};

// Обновленная функция для рисования диаграммы
function drawChart(ctx, data, width, height, colors) {
  console.log("Отрисовка графика с параметрами:", { width, height, data });

  if (!data || data.length === 0) {
    console.warn("Нет данных для отрисовки графика");
    return;
  }

  // Определяем размеры графика с учетом количества диагнозов
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Уменьшаем размер и отступы баров для компактности
  const groupSpacing = 20; // Уменьшенное расстояние между группами
  const barSpacing = 2; // Минимальное расстояние между столбцами в группе
  const maxBarWidth = 40; // Максимальная ширина столбца

  // Рассчитываем оптимальную ширину столбца с учетом доступного пространства
  let barWidth = Math.min(
      maxBarWidth,
      Math.floor((chartWidth - (data.length - 1) * groupSpacing) / (data.length * 3))
  );

  // Общая требуемая ширина графика
  const requiredWidth = data.length * (barWidth * 3 + groupSpacing);

  // Если требуемая ширина больше доступной, добавляем горизонтальную прокрутку
  if (requiredWidth > chartWidth) {
    // Получаем родительский контейнер canvas
    const chartContainer = ctx.canvas.parentElement;
    if (chartContainer) {
      // Добавляем стили для прокрутки
      chartContainer.style.overflowX = 'auto';
      chartContainer.style.overflowY = 'hidden';
      chartContainer.style.webkitOverflowScrolling = 'touch'; // Для плавной прокрутки на iOS

      // Устанавливаем ширину canvas для вмещения всех данных
      canvas.width = requiredWidth + 2 * padding;

      // Уведомляем пользователя о возможности прокрутки
      const scrollIndicator = document.createElement('div');
      scrollIndicator.style.textAlign = 'center';
      scrollIndicator.style.fontSize = '12px';
      scrollIndicator.style.color = '#666';
      scrollIndicator.style.marginTop = '5px';
      scrollIndicator.innerText = '← Прокрутите для просмотра всей диаграммы →';

      // Добавляем индикатор прокрутки после canvas
      chartContainer.appendChild(scrollIndicator);
    }
  }

  // Очищаем холст
  ctx.clearRect(0, 0, canvas.width, height);

  // Рисуем оси
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.strokeStyle = '#ccc';
  ctx.stroke();

  // Рисуем горизонтальные линии и подписи шкалы
  ctx.font = '10px Arial';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 10; i++) {
    const y = height - padding - (i * chartHeight / 10);
    const value = i * 10;

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.strokeStyle = '#eee';
    ctx.stroke();

    ctx.fillText(value + '%', padding - 5, y);
  }

  // Рисуем бары для каждого диагноза
  let x = padding;
  data.forEach(item => {
    // Рисуем группу баров для текущего диагноза

    // Сокращаем длинные названия диагнозов
    let diagnosisText = item.diagnosis;
    if (diagnosisText.length > 15) {
      diagnosisText = diagnosisText.slice(0, 12) + '...';
    }

    // Центр группы баров
    const groupCenter = x + barWidth * 1.5;

    // Подпись диагноза
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '10px Arial';
    ctx.fillText(diagnosisText, groupCenter, height - padding + 5);

    // Масштабирование количества случаев до процентов (максимум 100%)
    const maxCount = Math.max(...data.map(d => d.count)); // Находим максимальное количество
    const scaleFactor = maxCount > 100 ? 100 / maxCount : 1; // Масштабирующий фактор
    const scaledCount = item.count * scaleFactor;
    const countHeight = (scaledCount * chartHeight) / 100;

    // Бар для количества случаев
    ctx.fillStyle = colors.count;
    ctx.fillRect(x, height - padding - countHeight, barWidth, countHeight);

    // Бар для точности ИИ
    const accuracyHeight = (item.accuracy * chartHeight) / 100;
    ctx.fillStyle = colors.accuracy;
    ctx.fillRect(x + barWidth + barSpacing, height - padding - accuracyHeight, barWidth, accuracyHeight);

    // Бар для эффективности лечения
    const efficiencyHeight = (item.efficiency * chartHeight) / 100;
    ctx.fillStyle = colors.efficiency;
    ctx.fillRect(x + 2 * (barWidth + barSpacing), height - padding - efficiencyHeight, barWidth, efficiencyHeight);

    // Добавляем подписи значений над барами
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '9px Arial';

    ctx.fillText(item.count.toString(), x + barWidth/2, height - padding - countHeight - 2);
    ctx.fillText(item.accuracy + '%', x + barWidth + barSpacing + barWidth/2, height - padding - accuracyHeight - 2);
    ctx.fillText(item.efficiency + '%', x + 2 * (barWidth + barSpacing) + barWidth/2, height - padding - efficiencyHeight - 2);

    x += 3 * barWidth + 2 * barSpacing + groupSpacing; // Переходим к следующей группе
  });

  // Добавляем легенду в более компактном формате
  ctx.font = '11px Arial';
  const legendX = padding;
  const legendY = padding / 2;
  const legendSpacing = Math.min(130, width / 4); // Адаптивное расстояние между элементами легенды

  // Количество случаев
  ctx.fillStyle = colors.count;
  ctx.fillRect(legendX, legendY, 8, 8);
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Кол-во случаев', legendX + 12, legendY + 4);

  // Точность ИИ
  ctx.fillStyle = colors.accuracy;
  ctx.fillRect(legendX + legendSpacing, legendY, 8, 8);
  ctx.fillStyle = '#333';
  ctx.fillText('Точность ИИ', legendX + legendSpacing + 12, legendY + 4);

  // Эффективность лечения
  ctx.fillStyle = colors.efficiency;
  ctx.fillRect(legendX + 2 * legendSpacing, legendY, 8, 8);
  ctx.fillStyle = '#333';
  ctx.fillText('Эфф. лечения', legendX + 2 * legendSpacing + 12, legendY + 4);

  console.log("График успешно отрисован");
}

// Загрузка расписания на сегодня
window.loadTodaySchedule = function() {
  console.log("Загрузка расписания на сегодня...");

  const dateElement = document.getElementById('current-schedule-date');
  if (!dateElement) {
    console.warn("Элемент current-schedule-date не найден");
    return;
  }

  // Получаем текущую дату
  const today = new Date();
  dateElement.textContent = formatDate(today);

  // Форматируем дату для API запроса
  const dateString = formatDateForAPI(today);
  console.log('Загрузка расписания на дату:', dateString);

  // Пытаемся загрузить данные через API
  fetch(`${API_BASE_URL}/api/patients/by-date?date=${dateString}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        window.displayAppointments(data);
      })
      .catch(error => {
        console.error('Ошибка при загрузке расписания:', error);
        // Используем демо-данные в случае ошибки
        window.displayDemoAppointments();
      });
};

// Отображение расписания приемов
window.displayAppointments = function(appointments) {
  console.log("Отображение приемов:", appointments);

  const appointmentsList = document.getElementById('today-appointments');
  if (!appointmentsList) {
    console.warn("Элемент today-appointments не найден");
    return;
  }

  // Очищаем список
  appointmentsList.innerHTML = '';

  // Если приемов нет или данные пустые, показываем сообщение
  if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
    appointmentsList.innerHTML = `
      <li class="appointment-item">
        <div class="appointment-time">-</div>
        <div class="appointment-info">
          <div class="appointment-name">На сегодня нет запланированных приемов</div>
          <div class="appointment-type"></div>
        </div>
        <div class="appointment-status"></div>
      </li>
    `;
    return;
  }

  // Получаем текущее время для определения статуса
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Сортируем приемы по времени
  appointments.sort((a, b) => {
    // Предполагаем, что время в формате "HH:MM"
    return a.time && b.time ? a.time.localeCompare(b.time) : 0;
  });

  // Добавляем каждый прием в список
  appointments.forEach(appointment => {
    const appointmentItem = document.createElement('li');
    appointmentItem.className = 'appointment-item';

    // Определяем статус в зависимости от времени и типа приема
    let status;
    let statusText;
    let statusClass;
    let statusHtml;

    // Если время указано в виде строки "HH:MM", парсим его
    let appointmentHour = 0;
    let appointmentMinute = 0;

    if (appointment.time) {
      const timeParts = appointment.time.split(':');
      appointmentHour = parseInt(timeParts[0], 10);
      appointmentMinute = parseInt(timeParts[1], 10);
    }

    // Определяем статус в зависимости от времени
    if (
        appointmentHour < currentHour ||
        (appointmentHour === currentHour && appointmentMinute < currentMinute)
    ) {
      // Прием в прошлом - завершен
      status = 'completed';
      statusText = 'Завершен';
      statusClass = 'status-completed';
      statusHtml = `<div class="appointment-status ${statusClass}">${statusText}</div>`;
    } else if (
        appointmentHour === currentHour &&
        Math.abs(appointmentMinute - currentMinute) < 30
    ) {
      // Текущий прием (±30 минут) - в процессе
      status = 'in_progress';
      statusText = 'В процессе';
      statusClass = 'status-in-progress';
      statusHtml = `<div class="appointment-status ${statusClass}">${statusText}</div>`;
    } else if (appointment.type && appointment.type.toLowerCase().includes('экстренный')) {
      // Экстренный прием
      status = 'emergency';
      statusText = 'Экстренный';
      statusClass = 'status-emergency';
      statusHtml = `<button class="btn btn-success btn-sm">Завершен</button>`;
    } else {
      // Будущий прием - ожидает
      status = 'scheduled';
      statusText = 'Ожидает';
      statusClass = 'status-waiting';
      statusHtml = `<button class="btn btn-warning btn-sm">Ожидает</button>`;
    }

    // Если статус уже определен в данных приема, используем его
    if (appointment.status) {
      status = appointment.status;

      if (status === 'completed') {
        statusText = 'Завершен';
        statusClass = 'status-completed';
        statusHtml = `<button class="btn btn-success btn-sm">Завершен</button>`;
      } else if (status === 'in_progress') {
        statusText = 'В процессе';
        statusClass = 'status-in-progress';
        statusHtml = `<button class="btn btn-primary btn-sm">В процессе</button>`;
      } else if (status === 'cancelled') {
        statusText = 'Отменен';
        statusClass = 'status-cancelled';
        statusHtml = `<button class="btn btn-danger btn-sm">Отменен</button>`;
      } else if (status === 'scheduled' || status === 'waiting') {
        statusText = 'Ожидает';
        statusClass = 'status-waiting';
        statusHtml = `<button class="btn btn-warning btn-sm">Ожидает</button>`;
      }
    }

    appointmentItem.innerHTML = `
      <div class="appointment-time">${appointment.time || ''}</div>
      <div class="appointment-info">
        <div class="appointment-name">${appointment.name || ''}</div>
        <div class="appointment-type">${appointment.type || ''}</div>
      </div>
      ${statusHtml}
    `;

    appointmentsList.appendChild(appointmentItem);
  });
};

// Демо-данные для расписания
window.displayDemoAppointments = function() {
  console.log("Отображение демо-данных расписания");

  const demoData = [
    {
      time: '09:00',
      name: 'Петров Петр Петрович',
      type: 'Первичный прием',
      status: 'completed'
    },
    {
      time: '10:30',
      name: 'Сидорова Анна Ивановна',
      type: 'Консультация',
      status: 'in_progress'
    },
    {
      time: '13:15',
      name: 'Кузнецов Иван Алексеевич',
      type: 'Диагностика',
      status: 'scheduled'
    },
    {
      time: '15:00',
      name: 'Иванова Мария Павловна',
      type: 'Повторный прием',
      status: 'scheduled'
    }
  ];

  window.displayAppointments(demoData);
};

// Функция изменения даты расписания
window.changeScheduleDate = function(days) {
  console.log(`Изменение даты расписания на ${days} дней`);

  // Получаем текущую отображаемую дату
  const dateElement = document.getElementById('current-schedule-date');
  if (!dateElement) return;

  const currentDateText = dateElement.textContent;

  // Парсим дату из текста
  const parts = currentDateText.split(' ');
  const day = parseInt(parts[0]);

  const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const month = monthNames.indexOf(parts[1]);
  const year = parseInt(parts[2]);

  // Создаем объект даты и добавляем/вычитаем дни
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);

  // Обновляем отображаемую дату
  dateElement.textContent = formatDate(date);

  // Загружаем расписание для новой даты
  const dateString = formatDateForAPI(date);

  // Пытаемся загрузить данные через API
  fetch(`${API_BASE_URL}/api/patients/by-date?date=${dateString}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        window.displayAppointments(data);
      })
      .catch(error => {
        console.error('Ошибка при загрузке расписания:', error);
        // Используем демо-данные в случае ошибки
        window.displayDemoAppointments();
      });
};

// Запуск нового приема
window.startNewAppointment = function() {
  window.location.href = '../dashboard/dashboard.html';
};

// Редактировать профиль врача
window.editDoctorProfile = function() {
  window.location.href = './profile.html';
};

// Загрузка данных для личного кабинета врача
window.loadDoctorData = function() {
  console.log("Загрузка данных врача...");

  // Загружаем профиль врача
  window.loadDoctorProfile();

  // Загружаем статистику
  window.loadDoctorStatistics();

  // Загружаем расписание на сегодня
  window.loadTodaySchedule();

  // Загружаем статистику диагностики
  // График будет инициализирован после загрузки данных
  window.loadDiagnosticsStatistics();

  console.log("Данные врача загружены");
};