// patient-search.js - Функциональность для страницы поиска пациентов

// В начало файла добавьте:
const SERVER_BASE_URL = 'http://localhost:8000';

// Универсальная функция уведомлений
function showNotification(title, message, type) {
    // type: 'success', 'error', 'warning', 'info'
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title"></div>
                <div class="notification-message"></div>
                <div class="notification-close">&times;</div>
            </div>
        `;
        document.body.appendChild(notification);
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.classList.remove('show');
        });
    }
    notification.className = 'notification ' + (type || 'info');
    notification.querySelector('.notification-title').textContent = title;
    notification.querySelector('.notification-message').textContent = message;
    notification.classList.add('show');
    setTimeout(function() {
        notification.classList.remove('show');
    }, 4000);
}

// Функция очистки полей поиска (ДОЛЖНА БЫТЬ СНАРУЖИ!)
function clearSearch() {
    const inputs = document.querySelectorAll('.search-input');
    inputs.forEach(input => {
        input.value = '';
    });
    showNotification('Очищено', 'Поля поиска сброшены', 'info');
}

// Функция-обработчик поиска пациентов
function handlePatientSearch() {
    let patientName = document.getElementById('patientName')?.value.trim() || '';
    let birthDate = document.getElementById('birthDate')?.value.trim() || '';
    let gender = document.getElementById('gender')?.value.trim() || '';
    let cardNumber = document.getElementById('cardNumber')?.value.trim() || '';
    // Расширенный поиск
    let diagnosis = document.getElementById('diagnosis')?.value.trim() || '';
    let attendingDoctor = document.getElementById('attendingDoctor')?.value.trim() || '';
    let visitDateFrom = document.getElementById('visitDateFrom')?.value.trim() || '';
    let visitDateTo = document.getElementById('visitDateTo')?.value.trim() || '';

    // Нормализация ФИО
    patientName = patientName.replace(/\s+/g, ' ').trim();

    // Преобразуем дату рождения к формату YYYY-MM-DD, если пользователь ввел в формате DD.MM.YYYY
    if (birthDate && birthDate.includes('.')) {
        const parts = birthDate.split('.');
        if (parts.length === 3) {
            birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    // gender должен быть 'male' или 'female'
    if (gender === 'Мужской') gender = 'male';
    if (gender === 'Женский') gender = 'female';

    // Если заполнен номер карты — ищем только по нему
    if (cardNumber) {
        searchPatientsStrictServer({ cardNumber });
        return;
    }

    // Поиск только если все три поля заполнены (или расширенные поля)
    if (!patientName && !birthDate && !gender && !diagnosis && !attendingDoctor && !visitDateFrom && !visitDateTo) {
        showNotification('Ошибка', 'Пожалуйста, заполните хотя бы одно поле для поиска', 'error');
        return;
    }

    // --- ОТЛАДКА ---
    console.log('[DEBUG] handlePatientSearch отправка:', {
        name: patientName,
        birthDate: birthDate,
        gender: gender,
        diagnosis,
        attendingDoctor,
        visitDateFrom,
        visitDateTo
    });

    const body = {
        patientName,
        birthDate,
        gender,
        diagnosis,
        attendingDoctor,
        visitDateFrom,
        visitDateTo
    };

    fetch(`${SERVER_BASE_URL}/api/patient-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
        .then(res => {
            console.group('Patient Search API Call');
            console.log('Request:', {
                url: `${SERVER_BASE_URL}/api/patient-search`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            });
            console.log('Response status:', res.status);
            console.log('Response OK:', res.ok);
            if (!res.ok) {
                throw new Error('Server error: ' + res.status);
            }
            return res.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.error) {
                console.error('Server returned error:', data.error);
            }
            if (data.patients) {
                console.log('Found patients:', data.patients.length);
                data.patients.forEach((p, i) => {
                    console.log(`Patient ${i + 1}:`, p);
                });
            }
            console.groupEnd();
            let patients = [];
            // Если сервер вернул массив пациентов (расширенный поиск)
            if (Array.isArray(data.patients)) {
                patients = data.patients;
            } else if (data.patient) {
                patients = [data.patient];
            }
            if (patients.length > 0) {
                showNotification('Успех', `Найдено пациентов: ${patients.length}`, 'success');
            } else {
                showNotification('Информация', 'Пациент не найден', 'warning');
            }
            updatePatientsTable(patients, 1);
            currentPage = 1;

            const patientsTable = document.querySelector('.patients-table');
            const noResults = document.getElementById('noResults');
            const resultsCount = document.getElementById('resultsCount');
            const mainContent = document.querySelector('.main-content');
            const loadingIndicator = document.querySelector('.loading-indicator');

            if (patientsTable) patientsTable.style.display = patients.length > 0 ? 'table' : 'none';
            if (noResults) noResults.style.display = patients.length > 0 ? 'none' : 'block';
            if (resultsCount) resultsCount.textContent = patients.length;

            if (loadingIndicator) loadingIndicator.remove();
            if (mainContent) mainContent.style.position = '';

            if (patients.length > 0 && patientsTable) {
                patientsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (patients.length === 0 && noResults) {
                noResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        })
        .catch((err) => {
            console.error('Search error:', err);
            console.error('Error stack:', err.stack);
            console.groupEnd();
            const patientsTable = document.querySelector('.patients-table');
            const noResults = document.getElementById('noResults');
            const resultsCount = document.getElementById('resultsCount');
            const mainContent = document.querySelector('.main-content');
            const loadingIndicator = document.querySelector('.loading-indicator');

            showNotification('Ошибка', 'Ошибка при поиске пациента', 'error');
            if (loadingIndicator) loadingIndicator.remove();
            if (mainContent) mainContent.style.position = '';
            if (noResults) noResults.style.display = 'block';
            if (patientsTable) patientsTable.style.display = 'none';
            if (resultsCount) resultsCount.textContent = 0;
        });
}

// --- Pagination Logic ---
const PATIENTS_PER_PAGE = 10;
let currentPage = 1;
let lastSearchPatients = [];

function getTotalPages(patients) {
    return Math.max(1, Math.ceil(patients.length / PATIENTS_PER_PAGE));
}

function renderPagination(patients, page) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    const totalPages = getTotalPages(patients);

    pagination.innerHTML = '';

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            updatePatientsTable(lastSearchPatients, currentPage);
        }
    };
    pagination.appendChild(prevBtn);

    // Page buttons
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = 'pagination-btn' + (i === page ? ' active' : '');
            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                updatePatientsTable(lastSearchPatients, currentPage);
            };
            pagination.appendChild(btn);
        }
    } else {
        let pagesToShow = [];
        if (page <= 3) {
            pagesToShow = [1,2,3,4,'...',totalPages];
        } else if (page >= totalPages - 2) {
            pagesToShow = [1,'...',totalPages-3,totalPages-2,totalPages-1,totalPages];
        } else {
            pagesToShow = [1,'...',page-1,page,page+1,'...',totalPages];
        }
        pagesToShow.forEach(p => {
            if (p === '...') {
                const btn = document.createElement('button');
                btn.className = 'pagination-btn';
                btn.textContent = '...';
                btn.disabled = true;
                pagination.appendChild(btn);
            } else {
                const btn = document.createElement('button');
                btn.className = 'pagination-btn' + (p === page ? ' active' : '');
                btn.textContent = p;
                btn.onclick = () => {
                    currentPage = p;
                    updatePatientsTable(lastSearchPatients, currentPage);
                };
                pagination.appendChild(btn);
            }
        });
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            updatePatientsTable(lastSearchPatients, currentPage);
        }
    };
    pagination.appendChild(nextBtn);
}

// Функция поиска пациента строго на сервере по ФИО, дате рождения и полу
function searchPatientsStrictServer(params) {
    const patientsTable = document.querySelector('.patients-table');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');
    const mainContent = document.querySelector('.main-content');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = 'Поиск...';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.padding = '10px 20px';
    loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    loadingIndicator.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    loadingIndicator.style.borderRadius = '4px';
    loadingIndicator.style.zIndex = '1000';

    if (mainContent) {
        mainContent.style.position = 'relative';
        mainContent.appendChild(loadingIndicator);
    }

    // Формируем тело запроса
    const body = {};
    if (params.cardNumber) body.cardNumber = params.cardNumber;
    if (params.patientName) body.name = params.patientName;
    if (params.birthDate) body.birthDate = params.birthDate;
    if (params.gender) body.gender = params.gender;
    if (params.diagnosis) {
        body.diagnosis = params.diagnosis;
        console.log('[DEBUG] Поиск по диагнозу:', body.diagnosis);
    }
    if (params.attendingDoctor) body.attendingDoctor = params.attendingDoctor;
    if (params.visitDateFrom) body.visitDateFrom = params.visitDateFrom;
    if (params.visitDateTo) body.visitDateTo = params.visitDateTo;

    fetch(`${SERVER_BASE_URL}/api/patient-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
        .then(res => {
            console.log('[DEBUG] Ответ поиска пациента (raw):', res);
            if (!res.ok) {
                showNotification('Ошибка', 'Ошибка сервера: ' + res.status, 'error');
            }
            return res.json();
        })
        .then(data => {
            console.log('[DEBUG] Ответ поиска пациента (json):', data);
            let patients = [];
            // Если сервер вернул массив пациентов (расширенный поиск)
            if (Array.isArray(data.patients)) {
                patients = data.patients;
            } else if (data.patient) {
                patients = [data.patient];
            }
            if (patients.length > 0) {
                showNotification('Успех', `Найдено пациентов: ${patients.length}`, 'success');
            } else {
                showNotification('Информация', 'Пациент не найден', 'warning');
            }
            updatePatientsTable(patients, 1);
            currentPage = 1;

            if (patientsTable) patientsTable.style.display = patients.length > 0 ? 'table' : 'none';
            if (noResults) noResults.style.display = patients.length > 0 ? 'none' : 'block';
            if (resultsCount) resultsCount.textContent = patients.length;

            if (loadingIndicator) loadingIndicator.remove();
            if (mainContent) mainContent.style.position = '';

            if (patients.length > 0 && patientsTable) {
                patientsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (patients.length === 0 && noResults) {
                noResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        })
        .catch((err) => {
            console.error('[DEBUG] Ошибка при поиске пациента:', err);
            showNotification('Ошибка', 'Ошибка при поиске пациента', 'error');
            if (loadingIndicator) loadingIndicator.remove();
            if (mainContent) mainContent.style.position = '';
            if (noResults) noResults.style.display = 'block';
            if (patientsTable) patientsTable.style.display = 'none';
            if (resultsCount) resultsCount.textContent = 0;
        });
}

// Обновить таблицу пациентов
function updatePatientsTable(patients, page = 1) {
    lastSearchPatients = patients;
    const tbody = document.querySelector('.patients-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!patients.length) {
        renderPagination(patients, 1);
        return;
    }
    const totalPages = getTotalPages(patients);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    const startIdx = (page - 1) * PATIENTS_PER_PAGE;
    const endIdx = startIdx + PATIENTS_PER_PAGE;
    const pagePatients = patients.slice(startIdx, endIdx);

    pagePatients.forEach(p => {
        let lastDiagnosis = '-';
        if (p.diagnoses && Array.isArray(p.diagnoses) && p.diagnoses.length > 0) {
            const sortedDiagnoses = [...p.diagnoses].sort((a, b) => (b.diagnosis_id || 0) - (a.diagnosis_id || 0));
            lastDiagnosis = sortedDiagnoses[0].diagnosis_text || '-';
        }
        let lastVisit = p.lastVisit || '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="patient-name">${p.name || p.fullName || ''}</td>
            <td>${formatDate(p.birthDate || p.birth_date)}</td>
            <td>${p.cardNumber || p.card_number || p.id || ''}</td>
            <td>-</td>
            <td>${p.phone || ''}</td>
            <td>${lastDiagnosis}</td>
            <td>${lastVisit}</td>
            <td>
                <button class="table-btn view-btn" data-id="${p.id || p.patient_id || ''}">Просмотр</button>
                <button class="table-btn diagnose-btn" data-id="${p.id || p.patient_id || ''}">Диагностика</button>
            </td>
        `;
        // Сохраняем объект пациента для быстрого доступа по кнопке
        tr.dataset.patientIndex = startIdx + pagePatients.indexOf(p);
        tbody.appendChild(tr);
    });
    renderPagination(patients, page);
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) resultsCount.textContent = patients.length;

    // Навешиваем обработчики на кнопки
    tbody.querySelectorAll('.view-btn').forEach(btn => {
        btn.onclick = function() {
            // Получаем индекс пациента из строки
            const tr = this.closest('tr');
            let idx = tr ? tr.dataset.patientIndex : null;
            let patient = null;
            if (idx !== null && lastSearchPatients[idx]) {
                patient = lastSearchPatients[idx];
            } else {
                // fallback по id
                const id = this.dataset.id;
                patient = lastSearchPatients.find(p => (p.id || p.patient_id || '') == id);
            }
            if (patient) {
                showPatientDetailsModal(patient);
            } else {
                alert('Пациент не найден');
            }
        };
    });
    tbody.querySelectorAll('.diagnose-btn').forEach(btn => {
        btn.onclick = function() {
            // Получаем индекс пациента из строки
            const tr = this.closest('tr');
            let idx = tr ? tr.dataset.patientIndex : null;
            let patient = null;
            if (idx !== null && lastSearchPatients[idx]) {
                patient = lastSearchPatients[idx];
            } else {
                // fallback по id
                const id = this.dataset.id;
                patient = lastSearchPatients.find(p => (p.id || p.patient_id || '') == id);
            }
            if (patient) {
                // Сохраняем данные пациента в localStorage для анализа снимков
                localStorage.setItem('analysis_patient_name', patient.name || patient.fullName || '');
                localStorage.setItem('analysis_patient_card', patient.cardNumber || patient.card_number || patient.id || '');
                // Дата рождения
                let dob = patient.birthDate || patient.birth_date || '';
                if (dob) {
                    // Приводим к формату DD.MM.YYYY если нужно
                    if (/^\d{4}-\d{2}-\d{2}/.test(dob)) {
                        const [y, m, d] = dob.split('-');
                        dob = `${d}.${m}.${y}`;
                    }
                }
                localStorage.setItem('analysis_patient_dob', dob);
                // Пол
                let gender = 'male';
                if (patient.gender) {
                    const g = patient.gender.toLowerCase();
                    if (g.startsWith('ж') || g === 'female' || g === 'женский') gender = 'female';
                    else if (g.startsWith('м') || g === 'male' || g === 'мужской') gender = 'male';
                }
                localStorage.setItem('analysis_patient_gender', gender);
                window.location.href = '../analysis/analysis.html';
            } else {
                alert('Пациент не найден');
            }
        };
    });
}

// --- Вспомогательная функция для форматирования даты YYYY-MM-DD/ISO -> DD.MM.YYYY ---
function formatDate(dateStr) {
    if (!dateStr) return '';
    // Если уже DD.MM.YYYY
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
    // Если ISO или YYYY-MM-DD
    let d = new Date(dateStr);
    if (!isNaN(d)) {
        return d.toLocaleDateString('ru-RU');
    }
    // Если не распарсилось, вернуть как есть
    return dateStr;
}

// Вспомогательная функция для форматирования пола
function formatGender(gender) {
    if (!gender) return '';
    if (gender === 'male' || gender === 'Мужской') return 'Мужской';
    if (gender === 'female' || gender === 'Женский') return 'Женский';
    return gender;
}

// Функция перевода типа приема
function translateAppointmentType(type) {
    if (!type) return 'Прием';

    const types = {
        'consultation': 'Консультация',
        'treatment': 'Лечение',
        'diagnostics': 'Диагностика',
        'follow_up': 'Контрольный осмотр',
        'emergency': 'Экстренный визит'
    };

    return types[type] || type;
}

// Функция получения детальных данных о пациенте
async function fetchPatientDetails(patientId) {
    try {
        // Пытаемся получить данные с сервера
        const response = await fetch(`${SERVER_BASE_URL}/api/patient-details/${patientId}`);

        if (!response.ok) {
            console.warn('Не удалось получить данные с сервера, используем базовые данные');
            return {
                patient: { id: patientId },
                diagnoses: [],
                appointments: [],
                analyses: [],
                doctors: [],
                recommendations: []
            };
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка получения данных пациента:', error);
        return {
            patient: { id: patientId },
            diagnoses: [],
            appointments: [],
            analyses: [],
            doctors: [],
            recommendations: []
        };
    }
}

// Функция для отображения модального окна с карточкой пациента
async function showPatientDetailsModal(patient) {
    // Создаем модальное окно, если его еще нет
    let modal = document.getElementById('patientDetailsModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'patientDetailsModal';
    modal.className = 'modal';

    // Создаем стиль для модального окна
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal {
            display: flex;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4);
            z-index: 1000;
            align-items: flex-start;
            justify-content: center;
            padding-top: 50px;
        }
        .modal-content {
            background-color: #fff;
            width: 800px;
            max-width: 95%;
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            overflow-x: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            position: relative;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #ddd;
        }
        .modal-title {
            font-weight: normal;
            font-size: 16px;
        }
        .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 0;
            margin: 0;
        }
        .modal-tabs {
            display: flex;
            border-bottom: 1px solid #ddd;
            padding: 0;
            overflow-x: auto;
        }
        .tab-button {
            padding: 10px 20px;
            background: none;
            border: none;
            cursor: pointer;
            position: relative;
            font-size: 14px;
            color: #333;
        }
        .tab-button.active {
            color: #00a0a0;
        }
        .tab-button.active:after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 100%;
            height: 3px;
            background-color: #00a0a0;
        }
        .modal-body {
            padding: 0 20px 20px 20px;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .history-empty {
            font-style: italic;
            color: #999;
            text-align: center;
            padding: 30px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th {
            background-color: #f5f5f5;
            text-align: left;
            padding: 10px;
            border: 1px solid #ddd;
            font-weight: normal;
        }
        .data-table td {
            padding: 10px;
            border: 1px solid #ddd;
        }
        .recommendation-item {
            padding: 15px;
            background-color: #f9f9f9;
            margin-bottom: 10px;
        }
        .recommendation-date {
            color: #00a0a0;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .recommendation-doctor {
            font-style: italic;
            color: #666;
            margin-bottom: 8px;
        }
    `;
    document.head.appendChild(modalStyle);

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <span class="modal-title">Карточка пациента</span>
                <button class="close-button" id="closePatientDetailsBtn">&times;</button>
            </div>
            <div class="modal-tabs">
                <button class="tab-button active" data-tab="info">Основная информация</button>
                <button class="tab-button" data-tab="diagnoses">История диагнозов</button>
                <button class="tab-button" data-tab="visits">История посещений</button>
                <button class="tab-button" data-tab="doctors">Врачи</button>
                <button class="tab-button" data-tab="recommendations">Рекомендации</button>
            </div>
            <div class="modal-body">
                <div id="tab-info" class="tab-content active"></div>
                <div id="tab-diagnoses" class="tab-content"></div>
                <div id="tab-visits" class="tab-content"></div>
                <div id="tab-doctors" class="tab-content"></div>
                <div id="tab-recommendations" class="tab-content"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Логика переключения вкладок
    modal.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Деактивируем все вкладки
            modal.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Активируем выбранную вкладку
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // Отображаем модальное окно с индикатором загрузки
    modal.style.display = 'flex';
    document.getElementById('tab-info').innerHTML = '<div style="text-align: center; padding: 20px;">Загрузка данных...</div>';

    try {
        // Получаем ID пациента из номера карты или ID
        const patientId = patient.cardNumber || patient.card_number || patient.id || '';

        // Если ID пациента доступен, пробуем получить детальные данные
        if (patientId) {
            try {
                const data = await fetchPatientDetails(patientId);

                // Объединяем полученные данные с уже имеющимися
                const fullPatient = { ...patient, ...data.patient };

                // Рендерим все вкладки
                renderBasicInfo(fullPatient);
                renderDiagnosesTab(data.diagnoses || []);
                renderVisitsTab(data.appointments || [], data.analyses || []);
                renderDoctorsTab(data.doctors || []);
                renderRecommendationsTab(data.recommendations || []);
            } catch (error) {
                console.error('Ошибка получения данных:', error);
                renderBasicInfo(patient);
                renderDiagnosesTab([]);
                renderVisitsTab([], []);
                renderDoctorsTab([]);
                renderRecommendationsTab([]);
            }
        } else {
            // Используем только базовые данные
            renderBasicInfo(patient);
            renderDiagnosesTab([]);
            renderVisitsTab([], []);
            renderDoctorsTab([]);
            renderRecommendationsTab([]);
        }
    } catch (error) {
        console.error('Ошибка отображения данных пациента:', error);
        document.getElementById('tab-info').innerHTML = `
            <div class="history-empty">
                Ошибка загрузки данных пациента. <br>
                ${error.message}
            </div>
        `;
    }

    // Кнопка закрытия
    modal.querySelector('#closePatientDetailsBtn').onclick = function() {
        modal.remove();
    };

    // Закрытие по клику вне окна
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
}

// Рендер вкладки с основной информацией
function renderBasicInfo(patient) {
    const tabContent = document.getElementById('tab-info');

    tabContent.innerHTML = `
        <div>
            <h3 style="font-weight: normal; font-size: 16px; margin: 10px 0 20px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Основная информация</h3>
            
            <div style="display: flex; flex-wrap: wrap; margin-bottom: 15px;">
                <div style="width: 50%; margin-bottom: 15px;">
                    <span style="display: inline-block; width: 120px; vertical-align: top;">ФИО:</span>
                    <span>${patient.name || patient.fullName || patient.full_name || '-'}</span>
                </div>
                <div style="width: 50%; margin-bottom: 15px;">
                    <span style="display: inline-block; width: 120px; vertical-align: top;">Дата рождения:</span>
                    <span>${formatDate(patient.birthDate || patient.birth_date) || '-'}</span>
                </div>
                <div style="width: 50%; margin-bottom: 15px;">
                    <span style="display: inline-block; width: 120px; vertical-align: top;">Номер карты:</span>
                    <span>${patient.cardNumber || patient.card_number || patient.id || '-'}</span>
                </div>
                <div style="width: 50%; margin-bottom: 15px;">
                    <span style="display: inline-block; width: 120px; vertical-align: top;">Телефон:</span>
                    <span>${patient.phone || '-'}</span>
                </div>
                <div style="width: 50%; margin-bottom: 15px;">
                    <span style="display: inline-block; width: 120px; vertical-align: top;">Email:</span>
                    <span>${patient.email || '-'}</span>
                </div>
                <div style="width: 50%; margin-bottom: 15px;">
                    <span style="display: inline-block; width: 120px; vertical-align: top;">Пол:</span>
                    <span>${formatGender(patient.gender) || '-'}</span>
                </div>
            </div>
        </div>
    `;
}

// Рендер вкладки с историей диагнозов
function renderDiagnosesTab(diagnoses) {
    const tabContent = document.getElementById('tab-diagnoses');

    if (!diagnoses || diagnoses.length === 0) {
        tabContent.innerHTML = '<div class="history-empty">История диагнозов отсутствует</div>';
        return;
    }

    // Сортируем по дате (от новых к старым)
    diagnoses.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });

    let html = '<div class="detail-header">История диагнозов</div>';
    html += '<table class="data-table">';
    html += `
        <thead>
            <tr>
                <th>Дата</th>
                <th>Диагноз</th>
                <th>Врач</th>
            </tr>
        </thead>
        <tbody>
    `;

    diagnoses.forEach(diagnosis => {
        html += `
            <tr>
                <td>${formatDate(diagnosis.date) || '-'}</td>
                <td>${diagnosis.diagnosis_text || diagnosis.text || '-'}</td>
                <td>${diagnosis.doctor_name || '-'}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    tabContent.innerHTML = html;
}

// Рендер вкладки с историей посещений
function renderVisitsTab(appointments, analyses) {
    const tabContent = document.getElementById('tab-visits');

    // Комбинируем визиты из приемов и анализов
    const visits = [];

    // Добавляем из приемов
    if (appointments && Array.isArray(appointments)) {
        appointments.forEach(appointment => {
            visits.push({
                date: appointment.date,
                type: translateAppointmentType(appointment.type),
                description: appointment.reason || 'Прием у врача',
                doctor: appointment.doctor_name || '-'
            });
        });
    }

    // Добавляем из анализов
    if (analyses && Array.isArray(analyses)) {
        analyses.forEach(analysis => {
            let uniquePathologies = [];

            if (analysis.pathologies && Array.isArray(analysis.pathologies)) {
                uniquePathologies = analysis.pathologies.map(p => p.name).filter(Boolean);
            }

            const pathologyList = uniquePathologies.join(', ');

            visits.push({
                date: analysis.date,
                type: 'Анализ снимка',
                description: pathologyList
                    ? `Выявлено: ${pathologyList}`
                    : 'Анализ рентгеновского снимка',
                doctor: analysis.doctor_name || '-'
            });
        });
    }

    // Сортируем по дате (от новых к старым)
    visits.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });

    if (visits.length === 0) {
        tabContent.innerHTML = '<div class="history-empty">История посещений отсутствует</div>';
        return;
    }

    let html = '<div class="detail-header">История посещений</div>';
    html += '<table class="data-table">';
    html += `
        <thead>
            <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Описание</th>
                <th>Врач</th>
            </tr>
        </thead>
        <tbody>
    `;

    visits.forEach(visit => {
        html += `
            <tr>
                <td>${formatDate(visit.date) || '-'}</td>
                <td>${visit.type || '-'}</td>
                <td>${visit.description || '-'}</td>
                <td>${visit.doctor || '-'}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    tabContent.innerHTML = html;
}

// Рендер вкладки с врачами
function renderDoctorsTab(doctors) {
    const tabContent = document.getElementById('tab-doctors');

    if (!doctors || doctors.length === 0) {
        tabContent.innerHTML = '<div class="history-empty">Информация о лечащих врачах отсутствует</div>';
        return;
    }

    let html = '<div class="detail-header">Лечащие врачи</div>';
    html += '<table class="data-table">';
    html += `
        <thead>
            <tr>
                <th>ФИО врача</th>
                <th>Специализация</th>
                <th>Последний прием</th>
            </tr>
        </thead>
        <tbody>
    `;

    doctors.forEach(doctor => {
        html += `
            <tr>
                <td>${doctor.name || '-'}</td>
                <td>${doctor.specialty || '-'}</td>
                <td>${formatDate(doctor.last_visit) || 'Нет данных'}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    tabContent.innerHTML = html;
}

// Рендер вкладки с рекомендациями
function renderRecommendationsTab(recommendations) {
    const tabContent = document.getElementById('tab-recommendations');

    if (!recommendations || recommendations.length === 0) {
        tabContent.innerHTML = '<div class="history-empty">История рекомендаций отсутствует</div>';
        return;
    }

    let html = '<div class="detail-header">История рекомендаций</div>';

    recommendations.forEach(rec => {
        html += `
            <div class="recommendation-item">
                <div class="recommendation-date">${rec.date ? formatDate(rec.date) : 'Дата не указана'}</div>
                <div class="recommendation-doctor">Врач: ${rec.doctor_name || '-'}</div>
                <div>${rec.text || '-'}</div>
            </div>
        `;
    });

    tabContent.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    // Обработчики для кнопок в таблице результатов
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const patientId = this.dataset.id;
            window.location.href = `patient_card.html?id=${patientId}`;
        });
    });

    const diagnoseButtons = document.querySelectorAll('.diagnose-btn');
    diagnoseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const patientId = this.dataset.id;
            window.location.href = `analysis.html?patient_id=${patientId}`;
        });
    });

    // Обработчик расширенного поиска
    const extendedSearchToggle = document.getElementById('extendedSearchToggle');
    const extendedSearch = document.getElementById('extendedSearch');

    extendedSearchToggle.addEventListener('click', function() {
        if (extendedSearch.style.display === 'none') {
            extendedSearch.style.display = 'block';
            extendedSearchToggle.querySelector('.toggle-icon').textContent = '−';
        } else {
            extendedSearch.style.display = 'none';
            extendedSearchToggle.querySelector('.toggle-icon').textContent = '+';
        }
    });

    // Обработчики кнопок поиска
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);

    // Поиск пациентов
    const searchPatientsBtn = document.getElementById('searchPatientsBtn');
    const patientsTable = document.querySelector('.patients-table');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');

    if (searchPatientsBtn && patientsTable && noResults && resultsCount) {
        searchPatientsBtn.addEventListener('click', handlePatientSearch);
    }

    // Динамическая загрузка докторов в select
    fetch(`${SERVER_BASE_URL}/api/doctors`)
        .then(res => res.json())
        .then(doctors => {
            const select = document.getElementById('attendingDoctor');
            if (select) {
                // Сохраняем выбранное значение, если было
                const prevValue = select.value;
                select.innerHTML = '<option value="">Все врачи</option>';
                doctors.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.full_name + (doc.specialty ? ` (${doc.specialty})` : '');
                    select.appendChild(option);
                });
                // Восстанавливаем выбранное значение, если было
                if (prevValue) select.value = prevValue;
            }
        })
        .catch(() => { /* ignore errors */ });

    // Получить всех пациентов из IndexedDB (store: 'patients')
    function getAllPatientsFromDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('DentalDB', 1);
            request.onerror = () => resolve([]);
            request.onsuccess = function(event) {
                const db = event.target.result;
                const tx = db.transaction('patients', 'readonly');
                const store = tx.objectStore('patients');
                const getAllReq = store.getAll();
                getAllReq.onsuccess = () => resolve(getAllReq.result || []);
                getAllReq.onerror = () => resolve([]);
            };
            request.onupgradeneeded = function(event) {
                // Если БД не существует, создаём store
                const db = event.target.result;
                if (!db.objectStoreNames.contains('patients')) {
                    db.createObjectStore('patients', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    // Обработка пагинации
    const paginationButtons = document.querySelectorAll('.pagination-btn');
    paginationButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', function() {
                // В реальном приложении здесь будет загрузка соответствующей страницы
                // Для демонстрации просто обновляем активную кнопку

                const activePage = document.querySelector('.pagination-btn.active');
                if (activePage) {
                    activePage.classList.remove('active');
                }

                // Если это не кнопка "..." и не "вперед/назад"
                if (this.textContent !== '...' && this.textContent !== '<' && this.textContent !== '>') {
                    this.classList.add('active');
                }
            });
        }
    });

    // Маска для телефона: +7 (___) ___-__-__
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 0) {
                if (value[0] !== '7' && value[0] !== '8') {
                    value = '7' + value;
                }

                // Форматируем +7 (XXX) XXX-XX-XX
                let formattedValue = '';

                if (value.length > 0) {
                    formattedValue = '+' + value[0];
                }

                if (value.length > 1) {
                    formattedValue += ' (' + value.substring(1, Math.min(4, value.length));
                }

                if (value.length > 4) {
                    formattedValue += ') ' + value.substring(4, Math.min(7, value.length));
                }

                if (value.length > 7) {
                    formattedValue += '-' + value.substring(7, Math.min(9, value.length));
                }

                if (value.length > 9) {
                    formattedValue += '-' + value.substring(9, Math.min(11, value.length));
                }

                e.target.value = formattedValue;
            }
        });
    }
});