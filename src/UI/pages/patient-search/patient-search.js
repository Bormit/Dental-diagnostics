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
        console.log('[DEBUG] Обработка пациента:', p);
        console.log('[DEBUG] Диагнозы пациента:', p.diagnoses);

        let lastDiagnosis = '-';
        if (p.diagnoses && Array.isArray(p.diagnoses) && p.diagnoses.length > 0) {
            console.log('[DEBUG] Найдены диагнозы:', p.diagnoses.length);
            lastDiagnosis = p.diagnoses[0].diagnosis_text || '-';
            console.log('[DEBUG] Последний диагноз:', lastDiagnosis);
        } else {
            console.log('[DEBUG] Диагнозы не найдены');
        }
        
        let lastVisit = p.lastVisit || '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="patient-name">${p.name || p.fullName || ''}</td>
            <td>${formatDate(p.birthDate || p.birth_date)}</td>
            <td>${p.cardNumber || p.card_number || p.id || ''}</td>
            <td>${p.policyNumber || p.policy_number || ''}</td>
            <td>${p.phone || ''}</td>
            <td>${lastDiagnosis}</td>
            <td>${lastVisit}</td>
            <td>
                <button class="table-btn view-btn" data-id="${p.id || p.patient_id || ''}">Карта</button>
                <button class="table-btn diagnose-btn" data-id="${p.id || p.patient_id || ''}">Диагностика</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(patients, page);
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) resultsCount.textContent = patients.length;
}

// Функция форматирования даты YYYY-MM-DD -> DD.MM.YYYY
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('ru-RU');
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

    // Форматирование даты YYYY-MM-DD -> DD.MM.YYYY
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('ru-RU');
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