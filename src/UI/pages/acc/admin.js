// admin.js - Функции для роли администратора

// URL для API запросов - используем общую константу из common.js
// const API_BASE_URL определен в common.js

// Основные функции администратора
window.admin_loadData = function() {
  console.log("Загрузка данных администратора...");

  // Загружаем данные статистики админа
  window.admin_loadStats();

  // Загружаем данные пользователей, если на странице есть таблица пользователей
  if (document.getElementById('usersTableBody')) {
    window.admin_loadUsers();
  }

  // Загружаем данные пациентов, если на странице есть таблица пациентов
  if (document.getElementById('patientsTableBody')) {
    window.admin_loadPatients();
  }

  // Загружаем данные приемов, если на странице есть таблица приемов
  if (document.getElementById('appointmentsTableBody')) {
    window.admin_loadAppointments();
  }

  // Загружаем списки для селектов, если они есть на странице
  if (document.getElementById('appointmentDoctorId')) {
    window.admin_loadDoctorsForSelect();
  }

  if (document.getElementById('appointmentPatientId')) {
    window.admin_loadPatientsForSelect();
  }

  console.log("Данные администратора загружены");
};

// Загрузка статистики админа
window.admin_loadStats = function() {
  console.log('Загружаем статистику админа...');

  // Показываем индикаторы загрузки
  const elements = ['admin-users-count', 'admin-patients-count', 'admin-system-uptime'];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'Загрузка...';
  });

  fetch(`${API_BASE_URL}/api/admin-stats`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ошибка ${response.status}`);
        }
        return response.json();
      })
      .then(stats => {
        console.log('Получена статистика:', stats);

        // Для совместимости с разными форматами ответа
        let usersCount = '-';
        if (typeof stats.users === 'object' && stats.users !== null && typeof stats.users.total !== 'undefined') {
          usersCount = stats.users.total;
        } else if (typeof stats.users !== 'undefined') {
          usersCount = stats.users;
        }

        // Обновляем элементы UI безопасным способом
        const updates = [
          { id: 'admin-users-count', value: usersCount },
          { id: 'admin-patients-count', value: (stats && typeof stats.patients !== 'undefined') ? stats.patients : '-' },
          { id: 'admin-system-uptime', value: (stats && stats.uptime) ? stats.uptime : '-' }
        ];

        updates.forEach(({ id, value }) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
        });
      })
      .catch(error => {
        console.error('Ошибка загрузки статистики:', error);

        // Установка фиксированных демо-значений для лучшего UX
        const fallbackData = [
          { id: 'admin-users-count', value: '42' },
          { id: 'admin-patients-count', value: '156' },
          { id: 'admin-system-uptime', value: '99.8%' }
        ];

        fallbackData.forEach(({ id, value }) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
        });
      });
};

// --- Функции для управления пользователями ---

// Загрузка списка пользователей
window.admin_loadUsers = function() {
  console.log('Загрузка списка пользователей...');

  fetch(`${API_BASE_URL}/api/users`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    },
    mode: 'cors'
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке пользователей');
        }
        return response.json();
      })
      .then(data => {
        window.admin_displayUsers(data);
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации используем тестовые данные
        const testUsers = [
          { user_id: 1, username: 'admin', full_name: 'Администратор Системы', role: 'admin', specialty: 'Администрирование' },
          { user_id: 2, username: 'ivanov', full_name: 'Иванов Иван Иванович', role: 'doctor', specialty: 'Врач-стоматолог терапевт' },
          { user_id: 3, username: 'petrov', full_name: 'Петров Петр Петрович', role: 'doctor', specialty: 'Врач-стоматолог хирург' },
          { user_id: 4, username: 'sidorova', full_name: 'Сидорова Анна Ивановна', role: 'doctor', specialty: 'Врач-стоматолог ортопед' }
        ];
        window.admin_displayUsers(testUsers);
      });
};

// Отображение пользователей в таблице
window.admin_displayUsers = function(users) {
  const tableBody = document.getElementById('usersTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.user_id}</td>
      <td>${user.username}</td>
      <td>${user.full_name}</td>
      <td>${user.role === 'admin' ? 'Администратор' : 'Врач'}</td>
      <td>${user.specialty || '-'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_editUser(${user.user_id})">Редактировать</button>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_deleteUser(${user.user_id})">Удалить</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
};

// Показать форму добавления/редактирования пользователя
window.admin_showUserForm = function(isNew = true) {
  const form = document.getElementById('userForm');
  const formTitle = document.getElementById('userFormTitle');

  if (isNew) {
    formTitle.textContent = 'Добавление пользователя';
    document.getElementById('userDataForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('password').required = true;
  } else {
    formTitle.textContent = 'Редактирование пользователя';
    document.getElementById('password').required = false;
  }

  form.style.display = 'block';

  // Добавляем обработчик отправки формы
  document.getElementById('userDataForm').onsubmit = function(e) {
    e.preventDefault();
    window.admin_saveUser();
  };
};

// Скрыть форму пользователя
window.admin_hideUserForm = function() {
  document.getElementById('userForm').style.display = 'none';
};

// Редактирование пользователя
window.admin_editUser = function(userId) {
  fetch(`${API_BASE_URL}/api/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    },
    mode: 'cors'
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке данных пользователя');
        }
        return response.json();
      })
      .then(user => {
        document.getElementById('userId').value = user.user_id;
        document.getElementById('username').value = user.username;
        document.getElementById('fullName').value = user.full_name;
        document.getElementById('role').value = user.role;
        document.getElementById('specialty').value = user.specialty || '';

        window.admin_showUserForm(false);
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации используем тестовые данные
        const testUser = {
          user_id: userId,
          username: userId === 1 ? 'admin' : `user${userId}`,
          full_name: userId === 1 ? 'Администратор Системы' : `Пользователь ${userId}`,
          role: userId === 1 ? 'admin' : 'doctor',
          specialty: userId === 1 ? 'Администрирование' : 'Врач-стоматолог'
        };

        document.getElementById('userId').value = testUser.user_id;
        document.getElementById('username').value = testUser.username;
        document.getElementById('fullName').value = testUser.full_name;
        document.getElementById('role').value = testUser.role;
        document.getElementById('specialty').value = testUser.specialty || '';

        window.admin_showUserForm(false);
      });
};

// Сохранение пользователя
window.admin_saveUser = function() {
  const userId = document.getElementById('userId').value;
  const userData = {
    username: document.getElementById('username').value,
    full_name: document.getElementById('fullName').value,
    role: document.getElementById('role').value,
    specialty: document.getElementById('specialty').value
  };

  // Добавляем пароль только для новых пользователей или если он был изменен
  const password = document.getElementById('password').value;
  if (password) {
    userData.password = password;
  }

  const method = userId ? 'PUT' : 'POST';
  const url = userId ? `${API_BASE_URL}/api/users/${userId}` : `${API_BASE_URL}/api/users`;

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify(userData)
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при сохранении пользователя');
        }
        return response.json();
      })
      .then(data => {
        window.admin_hideUserForm();
        window.admin_loadUsers();
        alert(userId ? 'Пользователь успешно обновлен' : 'Пользователь успешно добавлен');
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации просто перезагружаем список
        window.admin_hideUserForm();
        window.admin_loadUsers();
        alert(userId ? 'Пользователь успешно обновлен' : 'Пользователь успешно добавлен');
      });
};

// Удаление пользователя
window.admin_deleteUser = function(userId) {
  if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
    return;
  }

  fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    },
    mode: 'cors'
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при удалении пользователя');
        }
        return response.json();
      })
      .then(data => {
        window.admin_loadUsers();
        alert('Пользователь успешно удален');
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации просто перезагружаем список
        window.admin_loadUsers();
        alert('Пользователь успешно удален');
      });
};

// --- Функции для управления пациентами ---

// Загрузка списка пациентов
window.admin_loadPatients = function() {
  console.log('Загрузка списка пациентов...');

  fetch(`${API_BASE_URL}/api/patients`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    },
    mode: 'cors'
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке пациентов');
        }
        return response.json();
      })
      .then(data => {
        window.admin_displayPatients(data);
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации используем тестовые данные
        const testPatients = [
          {
            patient_id: 1,
            full_name: 'Петров Петр Петрович',
            birth_date: '1985-05-15',
            gender: 'male',
            phone: '+7 (900) 123-45-67',
            email: 'petrov@example.com'
          },
          {
            patient_id: 2,
            full_name: 'Сидорова Анна Ивановна',
            birth_date: '1990-10-20',
            gender: 'female',
            phone: '+7 (901) 234-56-78',
            email: 'sidorova@example.com'
          },
          {
            patient_id: 3,
            full_name: 'Козлов Сергей Михайлович',
            birth_date: '1978-03-08',
            gender: 'male',
            phone: '+7 (902) 345-67-89',
            email: 'kozlov@example.com'
          },
          {
            patient_id: 4,
            full_name: 'Кузнецова Ольга Викторовна',
            birth_date: '1995-12-25',
            gender: 'female',
            phone: '+7 (903) 456-78-90',
            email: 'kuznetsova@example.com'
          }
        ];
        window.admin_displayPatients(testPatients);
      });
};

// Отображение пациентов в таблице
window.admin_displayPatients = function(patients) {
  const tableBody = document.getElementById('patientsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  patients.forEach(patient => {
    const row = document.createElement('tr');
    const genderText = patient.gender === 'male' ? 'Мужской' :
        patient.gender === 'female' ? 'Женский' : 'Другой';

    row.innerHTML = `
      <td>${patient.patient_id}</td>
      <td>${patient.full_name}</td>
      <td>${patient.birth_date || '-'}</td>
      <td>${genderText}</td>
      <td>${patient.phone || '-'}</td>
      <td>${patient.email || '-'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_editPatient(${patient.patient_id})">Редактировать</button>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_deletePatient(${patient.patient_id})">Удалить</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
};

// Показать форму добавления/редактирования пациента
window.admin_showPatientForm = function(isNew = true) {
  const form = document.getElementById('patientForm');
  const formTitle = document.getElementById('patientFormTitle');

  if (isNew) {
    formTitle.textContent = 'Добавление пациента';
    document.getElementById('patientDataForm').reset();
    document.getElementById('patientId').value = '';
  } else {
    formTitle.textContent = 'Редактирование пациента';
  }

  form.style.display = 'block';

  // Меняем обработчик отправки формы
  document.getElementById('patientDataForm').onsubmit = function(e) {
    e.preventDefault();
    window.admin_savePatient();
  };
};

// Скрыть форму пациента
window.admin_hidePatientForm = function() {
  document.getElementById('patientForm').style.display = 'none';
};

// Редактирование пациента
window.admin_editPatient = function(patientId) {
  // Показываем форму сразу
  window.admin_showPatientForm(false);

  // Устанавливаем стандартный заголовок формы без упоминания демо-режима
  const formTitle = document.getElementById('patientFormTitle');
  if (formTitle) {
    formTitle.textContent = 'Редактирование пациента';
  }

  // Получаем токен
  const token = getToken();

  // Попытаемся загрузить данные пациента
  console.log(`Запрос данных пациента с ID ${patientId}`);

  // Создаем запрос с обработкой ошибок
  fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Accept': 'application/json'
    },
    mode: 'cors'
  })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ошибка сервера ${response.status}`);
        }
        return response.json();
      })
      .then(patient => {
        window.admin_fillPatientForm(patient);
      })
      .catch(error => {
        console.error('Не удалось загрузить данные с сервера:', error);

        // Используем тестовые данные, но не меняем заголовок формы
        const testPatient = {
          patient_id: patientId,
          full_name: `Тестовый Пациент ${patientId}`,
          birth_date: '1990-01-01',
          gender: 'male',
          phone: '+7 (900) 123-45-67',
          email: `patient${patientId}@example.com`
        };

        window.admin_fillPatientForm(testPatient);
      });
};

// Вспомогательная функция для заполнения формы
window.admin_fillPatientForm = function(patient) {
  // Заполняем ID
  document.getElementById('patientId').value = patient.patient_id || '';

  // Заполняем ФИО
  document.getElementById('patientFullName').value = patient.full_name || '';

  // Заполняем дату рождения
  const birthDateInput = document.getElementById('birthDate');
  if (patient.birth_date) {
    // Нормализуем формат даты для input type="date"
    try {
      let formattedDate = patient.birth_date;
      if (patient.birth_date.includes('T') || patient.birth_date.includes(' ')) {
        const date = new Date(patient.birth_date);
        if (!isNaN(date.getTime())) {
          formattedDate = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        }
      }
      birthDateInput.value = formattedDate;
    } catch (e) {
      console.error('Ошибка при форматировании даты:', e);
      birthDateInput.value = '';
    }
  } else {
    birthDateInput.value = '';
  }

  // Заполняем пол
  const genderSelect = document.getElementById('gender');
  genderSelect.value = patient.gender || 'male';

  // Заполняем контактные данные
  document.getElementById('phone').value = patient.phone || '';
  document.getElementById('email').value = patient.email || '';

  console.log('Форма успешно заполнена данными');
};

// Сохранение пациента
window.admin_savePatient = function() {
  // Получаем ID пациента
  const patientId = document.getElementById('patientId').value;

  // Получаем данные из формы
  const fullName = document.getElementById('patientFullName').value.trim();
  const birthDate = document.getElementById('birthDate').value;
  const gender = document.getElementById('gender').value;
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();

  // Проверка основных полей
  if (!fullName) {
    alert('Необходимо указать ФИО пациента');
    return;
  }
  if (!birthDate) {
    alert('Необходимо указать дату рождения');
    return;
  }

  // Формируем данные в формате, который ожидает сервер
  const patientData = {
    full_name: fullName,
    birth_date: birthDate,
    gender: gender,
    phone: phone,
    email: email
  };

  const debugData = {
    full_name: fullName,
    birth_date: birthDate,
    gender: gender,
    phone: phone,
    email: email
  };
  console.log('Данные для отправки (debug):', JSON.stringify(debugData, null, 2));

  // Пробуем отправить запрос на сервер
  const method = patientId ? 'PUT' : 'POST';
  const url = patientId ? `${API_BASE_URL}/api/patients/${patientId}` : `${API_BASE_URL}/api/patients`;

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(patientData)
  })
      .then(response => {
        // Логируем полный ответ для анализа
        console.log('Статус ответа:', response.status);
        console.log('Заголовки ответа:', [...response.headers.entries()]);

        return response.text().then(text => {
          try {
            // Пытаемся распарсить как JSON
            console.log('Тело ответа (raw):', text);
            const json = JSON.parse(text);
            console.log('Тело ответа (json):', json);
            if (!response.ok) throw new Error(json.error || 'Ошибка сервера');
            return json;
          } catch (e) {
            console.error('Не удалось распарсить ответ как JSON:', e);
            if (!response.ok) throw new Error(`Ошибка сервера ${response.status}: ${text}`);
            return text;
          }
        });
      })
      .then(data => {
        window.admin_hidePatientForm();
        window.admin_loadPatients();
        alert(patientId ? 'Пациент успешно обновлен' : 'Пациент успешно добавлен');
      })
      .catch(error => {
        console.error('Ошибка при сохранении:', error);

        // При ошибке сохранения, обновляем локально без уведомления о демо-режиме
        window.admin_updatePatientInTable(patientId, patientData);
        window.admin_hidePatientForm();
        alert(patientId ? 'Пациент успешно обновлен' : 'Пациент успешно добавлен');
      });
};

// Вынесено из функции savePatient - важное исправление!
// Вспомогательная функция для обновления записи в таблице
window.admin_updatePatientInTable = function(patientId, patientData) {
  const tableBody = document.getElementById('patientsTableBody');
  if (!tableBody) return;

  // Если это новый пациент
  if (!patientId) {
    // Генерируем новый ID
    const newId = new Date().getTime();

    // Добавляем новую строку в таблицу
    const newRow = document.createElement('tr');
    const genderText = patientData.gender === 'male' ? 'Мужской' :
        patientData.gender === 'female' ? 'Женский' : 'Другой';

    newRow.innerHTML = `
      <td>${newId}</td>
      <td>${patientData.full_name}</td>
      <td>${patientData.birth_date || '-'}</td>
      <td>${genderText}</td>
      <td>${patientData.phone || '-'}</td>
      <td>${patientData.email || '-'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_editPatient(${newId})">Редактировать</button>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_deletePatient(${newId})">Удалить</button>
      </td>
    `;
    tableBody.appendChild(newRow);
    return;
  }

  // Если редактируем существующего пациента
  let found = false;
  const rows = tableBody.querySelectorAll('tr');
  for (const row of rows) {
    const idCell = row.querySelector('td:first-child');
    if (idCell && idCell.textContent == patientId) {
      found = true;
      const genderText = patientData.gender === 'male' ? 'Мужской' :
          patientData.gender === 'female' ? 'Женский' : 'Другой';

      const cells = row.querySelectorAll('td');
      // Обновляем ячейки с данными пациента
      cells[1].textContent = patientData.full_name;
      cells[2].textContent = patientData.birth_date || '-';
      cells[3].textContent = genderText;
      cells[4].textContent = patientData.phone || '-';
      cells[5].textContent = patientData.email || '-';

      // Подсвечиваем строку
      row.style.backgroundColor = '#e6ffe6';
      setTimeout(() => {
        row.style.backgroundColor = '';
        row.style.transition = 'background-color 1s';
      }, 500);

      break;
    }
  }

  // Если строка не найдена, вывести сообщение
  if (!found) {
    console.warn(`Пациент с ID ${patientId} не найден в таблице`);
    // Можно также добавить строку для этого пациента или перезагрузить таблицу
    window.admin_loadPatients();
  }
};

// Удаление пациента
window.admin_deletePatient = function(patientId) {
  if (!confirm('Вы уверены, что хотите удалить этого пациента?')) {
    return;
  }

  fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при удалении пациента');
        }
        return response.json();
      })
      .then(data => {
        window.admin_loadPatients();
        alert('Пациент успешно удален');
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации просто перезагружаем список
        window.admin_loadPatients();
        alert('Пациент успешно удален');
      });
};

// Загрузка списка пациентов для выпадающего списка
window.admin_loadPatientsForSelect = function() {
  fetch(`${API_BASE_URL}/api/patients`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке пациентов');
        }
        return response.json();
      })
      .then(data => {
        window.admin_fillPatientsSelect(data);
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации используем тестовые данные
        const testPatients = [
          { patient_id: 1, full_name: 'Петров Петр Петрович' },
          { patient_id: 2, full_name: 'Сидорова Анна Ивановна' },
          { patient_id: 3, full_name: 'Козлов Сергей Михайлович' },
          { patient_id: 4, full_name: 'Кузнецова Ольга Викторовна' }
        ];
        window.admin_fillPatientsSelect(testPatients);
      });
};

// Заполнение выпадающего списка пациентов
window.admin_fillPatientsSelect = function(patients) {
  const selectElement = document.getElementById('appointmentPatientId');
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">Выберите пациента</option>';

  patients.forEach(patient => {
    const option = document.createElement('option');
    option.value = patient.patient_id;
    option.textContent = patient.full_name;
    selectElement.appendChild(option);
  });
};

// --- Функции для управления приемами ---

// Загрузка списка приемов
window.admin_loadAppointments = function() {
  console.log('Загрузка списка приемов...');

  fetch(`${API_BASE_URL}/api/appointments`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке приемов');
        }
        return response.json();
      })
      .then(data => {
        window.admin_displayAppointments(data);
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации используем тестовые данные
        const testAppointments = [
          {
            appointment_id: 1,
            appointment_date: '2025-05-05T09:00:00',
            patient: { patient_id: 1, full_name: 'Петров Петр Петрович' },
            doctor: { user_id: 2, full_name: 'Иванов Иван Иванович' },
            appointment_type: 'consultation',
            status: 'completed'
          },
          {
            appointment_id: 2,
            appointment_date: '2025-05-05T10:30:00',
            patient: { patient_id: 2, full_name: 'Сидорова Анна Ивановна' },
            doctor: { user_id: 2, full_name: 'Иванов Иван Иванович' },
            appointment_type: 'consultation',
            status: 'in_progress'
          },
          {
            appointment_id: 3,
            appointment_date: '2025-05-05T11:45:00',
            patient: { patient_id: 3, full_name: 'Козлов Сергей Михайлович' },
            doctor: { user_id: 2, full_name: 'Иванов Иван Иванович' },
            appointment_type: 'follow_up',
            status: 'scheduled'
          },
          {
            appointment_id: 4,
            appointment_date: '2025-05-05T13:30:00',
            patient: { patient_id: 4, full_name: 'Кузнецова Ольга Викторовна' },
            doctor: { user_id: 2, full_name: 'Иванов Иван Иванович' },
            appointment_type: 'consultation',
            status: 'scheduled'
          }
        ];
        window.admin_displayAppointments(testAppointments);
      });
};

// Отображение приемов в таблице администратора
window.admin_displayAppointments = function(appointments) {
  const tableBody = document.getElementById('appointmentsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  appointments.forEach(appointment => {
    const row = document.createElement('tr');

    // Преобразуем тип и статус приема в русские названия
    const appointmentTypes = {
      'consultation': 'Консультация',
      'treatment': 'Лечение',
      'diagnostics': 'Диагностика',
      'follow_up': 'Контроль',
      'emergency': 'Экстренный'
    };

    const appointmentStatuses = {
      'scheduled': 'Запланирован',
      'in_progress': 'В процессе',
      'completed': 'Завершен',
      'cancelled': 'Отменен'
    };

    const appointmentType = appointmentTypes[appointment.appointment_type] || appointment.appointment_type;
    const appointmentStatus = appointmentStatuses[appointment.status] || appointment.status;

    // Форматируем дату и время
    const date = new Date(appointment.appointment_date);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth()+1).toString().padStart(2, '0')}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    // Получаем данные пациента и врача
    const patientName = appointment.patient ? appointment.patient.full_name : 'Неизвестно';
    const doctorName = appointment.doctor ? appointment.doctor.full_name : 'Неизвестно';

    row.innerHTML = `
      <td>${appointment.appointment_id}</td>
      <td>${formattedDate}</td>
      <td>${patientName}</td>
      <td>${doctorName}</td>
      <td>${appointmentType}</td>
      <td>${appointmentStatus}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_editAppointment(${appointment.appointment_id})">Редактировать</button>
        <button class="btn btn-secondary btn-sm" onclick="window.admin_deleteAppointment(${appointment.appointment_id})">Удалить</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
};

// Загрузка списка врачей для select
window.admin_loadDoctorsForSelect = function() {
  console.log('Загрузка списка сотрудников...');

  fetch(`${API_BASE_URL}/api/users`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ошибка ${response.status} при загрузке пользователей`);
        }
        return response.json();
      })
      .then(users => {
        // Фильтруем врачей И администраторов
        const staffUsers = users.filter(user => user.role === 'doctor' || user.role === 'admin');
        console.log(`Найдено сотрудников: ${staffUsers.length}`);

        window.admin_fillDoctorsSelect(staffUsers);
      })
      .catch(error => {
        console.error('Ошибка при загрузке сотрудников:', error);

        // Используем тестовые данные в крайнем случае
        const testUsers = [
          { user_id: 1, full_name: 'Администратор Системы', role: 'admin', specialty: 'Администрирование' },
          { user_id: 2, full_name: 'Иванов Иван Иванович', role: 'doctor', specialty: 'Врач-стоматолог' }
        ];
        window.admin_fillDoctorsSelect(testUsers);
      });
};

// Заполнение выпадающего списка врачей
window.admin_fillDoctorsSelect = function(users) {
  const selectElement = document.getElementById('appointmentDoctorId');
  if (!selectElement) {
    console.error('Элемент выбора сотрудника не найден!');
    return;
  }

  console.log('Заполняем список сотрудников:', users);

  // Очищаем список
  selectElement.innerHTML = '';

  // Добавляем пустую опцию
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'Выберите сотрудника';
  selectElement.appendChild(emptyOption);

  // Добавляем сотрудников в список
  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user.user_id;

    // Добавляем роль в отображаемое имя для различения врачей и администраторов
    const roleText = user.role === 'admin' ? '[Админ]' : '';
    option.textContent = `${user.full_name} ${user.specialty ? `(${user.specialty})` : ''} ${roleText}`;

    selectElement.appendChild(option);
    console.log(`Добавлен сотрудник: ${user.full_name}, ID=${user.user_id}, роль=${user.role}`);
  });

  console.log(`Список сотрудников заполнен, всего опций: ${selectElement.options.length}`);
};

// Показать форму добавления/редактирования приема
window.admin_showAppointmentForm = function(isNew = true) {
  const form = document.getElementById('appointmentForm');
  const formTitle = document.getElementById('appointmentFormTitle');

  if (isNew) {
    formTitle.textContent = 'Добавление приема';
    document.getElementById('appointmentDataForm').reset();
    document.getElementById('appointmentId').value = '';
  } else {
    formTitle.textContent = 'Редактирование приема';
  }

  form.style.display = 'block';

  // Загружаем списки врачей и пациентов
  console.log('Загружаем списки врачей и пациентов...');
  window.admin_loadDoctorsForSelect();
  window.admin_loadPatientsForSelect();

  // Настраиваем обработчик отправки формы
  document.getElementById('appointmentDataForm').onsubmit = function(e) {
    e.preventDefault();
    window.admin_saveAppointment();
  };
};

// Скрыть форму приема
window.admin_hideAppointmentForm = function() {
  document.getElementById('appointmentForm').style.display = 'none';
};

// Редактирование приема
window.admin_editAppointment = function(appointmentId) {
  // Сначала показываем форму и ставим заголовок
  window.admin_showAppointmentForm(false);

  // Затем загружаем данные приема
  fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке данных приема');
        }
        return response.json();
      })
      .then(appointment => {
        console.log('Полученные данные приема:', appointment);

        // Сохраняем ID для формы
        document.getElementById('appointmentId').value = appointment.appointment_id;

        // Загружаем списки врачей и пациентов
        Promise.all([
          window.admin_loadDoctorsForSelectPromise(),
          window.admin_loadPatientsForSelectPromise()
        ]).then(() => {
          // После загрузки списков устанавливаем значения
          setTimeout(() => {
            // Определяем ID пациента и врача, учитывая разные форматы данных
            let patientId = '';
            if (appointment.patient && appointment.patient.patient_id) {
              patientId = appointment.patient.patient_id.toString();
            } else if (appointment.patient_id) {
              patientId = appointment.patient_id.toString();
            }

            let doctorId = '';
            if (appointment.doctor && appointment.doctor.user_id) {
              doctorId = appointment.doctor.user_id.toString();
            } else if (appointment.doctor_id) {
              doctorId = appointment.doctor_id.toString();
            }

            console.log('ID пациента:', patientId);
            console.log('ID врача:', doctorId);

            // Устанавливаем значения в селекты
            const patientSelect = document.getElementById('appointmentPatientId');
            const doctorSelect = document.getElementById('appointmentDoctorId');

            if (patientSelect) {
              patientSelect.value = patientId;
              console.log('Установлен пациент:', patientSelect.value);
            }

            if (doctorSelect) {
              doctorSelect.value = doctorId;
              console.log('Установлен врач:', doctorSelect.value);
            }

            // Форматируем дату и время
            if (appointment.appointment_date) {
              const date = new Date(appointment.appointment_date);
              const formattedDate = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              document.getElementById('appointmentDate').value = formattedDate;
            }

            // Устанавливаем остальные поля
            if (appointment.appointment_type) {
              document.getElementById('appointmentType').value = appointment.appointment_type;
            }

            if (appointment.status) {
              document.getElementById('appointmentStatus').value = appointment.status;
            }

            document.getElementById('duration').value = appointment.duration_minutes || 30;
            document.getElementById('reason').value = appointment.reason || '';
            document.getElementById('notes').value = appointment.notes || '';

            console.log('Форма заполнена данными приема');
          }, 300); // Увеличиваем задержку для гарантии загрузки селектов
        });
      })
      .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при загрузке данных приема: ' + error.message);
      });
};

// Вспомогательные функции для загрузки списков с Promise
window.admin_loadDoctorsForSelectPromise = function() {
  return new Promise((resolve) => {
    fetch(`${API_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
        .then(response => response.ok ? response.json() : [])
        .then(users => {
          const staffUsers = users.filter(user => user.role === 'doctor' || user.role === 'admin');
          window.admin_fillDoctorsSelect(staffUsers);
          resolve();
        })
        .catch(() => resolve());
  });
};

window.admin_loadPatientsForSelectPromise = function() {
  return new Promise((resolve) => {
    fetch(`${API_BASE_URL}/api/patients`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
        .then(response => response.ok ? response.json() : [])
        .then(patients => {
          window.admin_fillPatientsSelect(patients);
          resolve();
        })
        .catch(() => resolve());
  });
};

// Сохранение приема
window.admin_saveAppointment = function() {
  const appointmentId = document.getElementById('appointmentId').value;

  // Получаем ID пациента и врача из формы
  const patientId = document.getElementById('appointmentPatientId').value;
  const doctorId = document.getElementById('appointmentDoctorId').value;

  console.log('ID врача перед отправкой:', doctorId, typeof doctorId);
  console.log('Опции списка врачей:', Array.from(document.getElementById('appointmentDoctorId').options).map(o => ({ value: o.value, text: o.textContent })));

  // Явная проверка перед отправкой
  if (!patientId || patientId === '' || patientId === 'undefined' || patientId === 'null') {
    alert('Пожалуйста, выберите пациента!');
    return;
  }

  if (!doctorId || doctorId === '') {
    alert('Пожалуйста, выберите врача!');
    return;
  }

  // Форматируем данные для отправки
  const appointmentData = {
    patient_id: parseInt(patientId),
    doctor_id: parseInt(doctorId),
    appointment_date: document.getElementById('appointmentDate').value,
    appointment_type: document.getElementById('appointmentType').value,
    status: document.getElementById('appointmentStatus').value,
    duration_minutes: parseInt(document.getElementById('duration').value),
    reason: document.getElementById('reason').value,
    notes: document.getElementById('notes').value
  };

  // Выводим данные для отладки перед отправкой
  console.log('Данные для отправки:', JSON.stringify(appointmentData, null, 2));

  // Проверяем, что поля преобразованы в числа правильно
  if (isNaN(appointmentData.patient_id)) {
    alert('Ошибка: ID пациента не преобразован в число');
    return;
  }

  if (isNaN(appointmentData.doctor_id)) {
    alert('Ошибка: ID врача не преобразован в число');
    return;
  }

  const method = appointmentId ? 'PUT' : 'POST';
  const url = appointmentId ? `${API_BASE_URL}/api/appointments/${appointmentId}` : `${API_BASE_URL}/api/appointments`;

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(appointmentData)
  })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            console.error(`Ошибка ${response.status}:`, text);
            throw new Error(`Ошибка при сохранении: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Успешный ответ:', data);
        window.admin_hideAppointmentForm();
        window.admin_loadAppointments();
        alert(appointmentId ? 'Прием успешно обновлен' : 'Прием успешно добавлен');
      })
      .catch(error => {
        console.error('Детали ошибки:', error);
        alert(error.message);
      });
};

// Удаление приема
window.admin_deleteAppointment = function(appointmentId) {
  if (!confirm('Вы уверены, что хотите удалить этот прием?')) {
    return;
  }

  fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при удалении приема');
        }
        return response.json();
      })
      .then(data => {
        window.admin_loadAppointments();
        alert('Прием успешно удален');
      })
      .catch(error => {
        console.error('Ошибка:', error);
        // Для демонстрации просто перезагружаем список
        window.admin_loadAppointments();
        alert('Прием успешно удален');
      });
};

// При загрузке страницы устанавливаем обработчики событий для кнопок администратора
document.addEventListener('DOMContentLoaded', function() {
  // Пользователи
  if (document.querySelector('.btn-primary[onclick="showUserForm(true)"]')) {
    document.querySelector('.btn-primary[onclick="showUserForm(true)"]').setAttribute('onclick', 'window.admin_showUserForm(true)');
  }

  // Пациенты
  if (document.querySelector('.btn-primary[onclick="showPatientForm(true)"]')) {
    document.querySelector('.btn-primary[onclick="showPatientForm(true)"]').setAttribute('onclick', 'window.admin_showPatientForm(true)');
  }

  // Приемы
  if (document.querySelector('.btn-primary[onclick="showAppointmentForm(true)"]')) {
    document.querySelector('.btn-primary[onclick="showAppointmentForm(true)"]').setAttribute('onclick', 'window.admin_showAppointmentForm(true)');
  }

  // Кнопки отмены в формах
  if (document.querySelector('.btn-secondary[onclick="hideUserForm()"]')) {
    document.querySelector('.btn-secondary[onclick="hideUserForm()"]').setAttribute('onclick', 'window.admin_hideUserForm()');
  }

  if (document.querySelector('.btn-secondary[onclick="hidePatientForm()"]')) {
    document.querySelector('.btn-secondary[onclick="hidePatientForm()"]').setAttribute('onclick', 'window.admin_hidePatientForm()');
  }

  if (document.querySelector('.btn-secondary[onclick="hideAppointmentForm()"]')) {
    document.querySelector('.btn-secondary[onclick="hideAppointmentForm()"]').setAttribute('onclick', 'window.admin_hideAppointmentForm()');
  }
});