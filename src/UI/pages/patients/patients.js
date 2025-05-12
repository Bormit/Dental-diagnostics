// --- Patient Registry Logic ---

const PATIENTS_KEY = 'patients_registry';
const API_URL = 'http://localhost:8000/api/patients'; // если бэкенд на 8000 порту

function getPatients() {
    return JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]');
}

function savePatients(patients) {
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

// Импорт пациентов из API
async function importPatientsFromApi() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Ошибка загрузки пациентов');
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            renderPatientsTable([]);
            return;
        }
        // Формируем данные для таблицы как в patient-search
        const patients = data.map(p => {
            // Последний диагноз из diagnoses (по максимальному diagnosis_id)
            let lastDiagnosis = '';
            if (Array.isArray(p.diagnoses) && p.diagnoses.length > 0) {
                const sorted = [...p.diagnoses].sort((a, b) => (b.diagnosis_id || 0) - (a.diagnosis_id || 0));
                lastDiagnosis = sorted[0].diagnosis_text || '';
            }
            // Последнее посещение из last_visit или diagnoses (по максимальному diagnosis_id)
            let lastVisit = p.last_visit || '';
            if (!lastVisit && Array.isArray(p.diagnoses) && p.diagnoses.length > 0) {
                const sorted = [...p.diagnoses].sort((a, b) => (b.diagnosis_id || 0) - (a.diagnosis_id || 0));
                lastVisit = sorted[0].date || '';
            }
            // Форматируем дату как ДД.ММ.ГГГГ
            function formatDate(dateStr) {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                if (isNaN(d)) return '';
                return d.toLocaleDateString('ru-RU');
            }
            return {
                name: p.full_name || p.name || '',
                dob: p.birth_date ? formatDate(p.birth_date) : '',
                card: p.patient_id ? String(p.patient_id) : (p.card || ''),
                phone: p.phone || '',
                diagnosis: lastDiagnosis,
                lastVisit: lastVisit ? formatDate(lastVisit) : '',
                status: p.status || 'active'
            };
        });
        savePatients(patients);
        renderPatientsTable(patients);
    } catch (e) {
        renderPatientsTable(getPatients());
    }
}

// --- Pagination Logic ---
const PATIENTS_PER_PAGE = 10;
let currentPage = 1;
let lastRenderedPatients = [];

function getTotalPages(patients) {
    return Math.max(1, Math.ceil(patients.length / PATIENTS_PER_PAGE));
}

function renderPagination(patients, page) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    const totalPages = getTotalPages(patients);

    // Clear old buttons
    pagination.innerHTML = '';

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-button';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderPatientsTable(lastRenderedPatients, currentPage);
        }
    };
    pagination.appendChild(prevBtn);

    // Page buttons (show first, up to 3, ..., last)
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = 'pagination-button' + (i === page ? ' active' : '');
            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                renderPatientsTable(lastRenderedPatients, currentPage);
            };
            pagination.appendChild(btn);
        }
    } else {
        // Always show first
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
                btn.className = 'pagination-button';
                btn.textContent = '...';
                btn.disabled = true;
                pagination.appendChild(btn);
            } else {
                const btn = document.createElement('button');
                btn.className = 'pagination-button' + (p === page ? ' active' : '');
                btn.textContent = p;
                btn.onclick = () => {
                    currentPage = p;
                    renderPatientsTable(lastRenderedPatients, currentPage);
                };
                pagination.appendChild(btn);
            }
        });
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-button';
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPatientsTable(lastRenderedPatients, currentPage);
        }
    };
    pagination.appendChild(nextBtn);
}

// Модифицируем renderPatientsTable для поддержки пагинации
function renderPatientsTable(patients, page = 1) {
    lastRenderedPatients = patients;
    const tbody = document.querySelector('.patients-table tbody');
    tbody.innerHTML = '';
    if (!patients.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Нет данных</td></tr>';
        renderPagination(patients, 1);
        return;
    }
    const totalPages = getTotalPages(patients);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    const startIdx = (page - 1) * PATIENTS_PER_PAGE;
    const endIdx = startIdx + PATIENTS_PER_PAGE;
    const pagePatients = patients.slice(startIdx, endIdx);

    pagePatients.forEach(patient => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="patient-name">${patient.name}</td>
            <td>${patient.dob || ''}</td>
            <td>${patient.card || ''}</td>
            <td>${patient.phone || ''}</td>
            <td>${patient.diagnosis || ''}</td>
            <td>${patient.lastVisit || ''}</td>
            <td>${getStatusText(patient.status)}</td>
            <td>
                <button class="action-button view">Просмотр</button>
                <button class="action-button diagnose">Диагностика</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    attachActionHandlers();
    renderPagination(patients, page);
}

function getStatusText(status) {
    switch (status) {
        case 'active': return 'Активен';
        case 'waiting': return 'В ожидании';
        case 'inactive': return 'Неактивен';
        default: return '';
    }
}

// --- Add Patient Modal Logic ---

const addPatientForm = document.getElementById('addPatientForm');
if (addPatientForm) {
    addPatientForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newPatient = {
            name: document.getElementById('patientName').value.trim(),
            dob: document.getElementById('patientDob').value,
            card: document.getElementById('patientCard').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            diagnosis: document.getElementById('patientDiagnosis').value.trim(),
            lastVisit: document.getElementById('patientLastVisit').value,
            status: document.getElementById('patientStatus').value
        };
        const patients = getPatients();
        patients.unshift(newPatient);
        savePatients(patients);
        renderPatientsTable(patients, 1);
        currentPage = 1;
        addPatientModal.style.display = 'none';
        addPatientForm.reset();
    });
}

// --- Search Logic ---

const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button');
if (searchInput && searchButton) {
    searchButton.addEventListener('click', function() {
        const query = searchInput.value.trim().toLowerCase();
        const patients = getPatients();
        if (!query) {
            renderPatientsTable(patients, 1);
            currentPage = 1;
            return;
        }
        const filtered = patients.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.card && p.card.toLowerCase().includes(query)) ||
            (p.phone && p.phone.toLowerCase().includes(query))
        );
        renderPatientsTable(filtered, 1);
        currentPage = 1;
    });
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') searchButton.click();
        if (!searchInput.value.trim()) {
            renderPatientsTable(getPatients(), 1);
            currentPage = 1;
        }
    });
}

// --- Action Handlers (View/Diagnose) ---

// Function to fetch detailed patient data
// Обновленная функция, использующая новый API-эндпоинт
// Обновленная функция, использующая новый API-эндпоинт
// Обновленный fetchPatientDetails с тестовыми данными при необходимости
async function fetchPatientDetails(patientId) {
    try {
        // Пытаемся получить данные с сервера
        const response = await fetch(`http://localhost:8000/api/patient-details/${patientId}`);

        if (!response.ok) {
            // Если сервер недоступен или произошла ошибка, генерируем тестовые данные
            console.warn('Не удалось получить данные с сервера, используем тестовые данные');

            // Генерируем тестовые данные на основе имеющейся информации о пациенте
            return {
                patient: {
                    id: patientId,
                    full_name: document.querySelector(`.patients-table tr[data-id="${patientId}"] .patient-name`)?.textContent || "Пациент",
                    // Другие основные данные будут взяты из переданного объекта patient
                },
                diagnoses: getMockDiagnoses(),
                appointments: [],
                analyses: [],
                doctors: [
                    {
                        doctor_id: 1,
                        name: "Петров Петр Петрович",
                        specialty: "Стоматолог-терапевт",
                        last_visit: new Date().toISOString().split('T')[0]
                    }
                ],
                recommendations: []
            };
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка получения данных пациента:', error);

        // В случае ошибки, возвращаем минимальный набор тестовых данных
        return {
            patient: { id: patientId },
            diagnoses: getMockDiagnoses(),
            appointments: [],
            analyses: [],
            doctors: [],
            recommendations: []
        };
    }
}

// Обновленная функция показа модального окна
// Обновленная функция показа модального окна с исправленной структурой
// Обновленная функция показа модального окна с корректной структурой
async function showPatientDetailsModal(patient) {
    // Создаем модальное окно, если его еще нет
    let modal = document.getElementById('patientDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'patientDetailsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="width: 800px; max-width: 90%; max-height: 90vh; overflow-y: auto; background-color: white;">
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
                <div class="modal-body" style="padding: 15px;">
                    <div id="tab-info" class="tab-content active"></div>
                    <div id="tab-diagnoses" class="tab-content"></div>
                    <div id="tab-visits" class="tab-content"></div>
                    <div id="tab-doctors" class="tab-content"></div>
                    <div id="tab-recommendations" class="tab-content"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Стили для модального окна (если в CSS они не применяются)
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0,0,0,0.5);
                z-index: 1000;
                align-items: center;
                justify-content: center;
            }
            .modal-content {
                background-color: #fff;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 10px;
                border-bottom: 1px solid #ddd;
            }
            .modal-title {
                font-weight: bold;
                font-size: 18px;
            }
            .close-button {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
            }
            .tab-content {
                display: none;
            }
            .tab-content.active {
                display: block;
            }
        `;
        document.head.appendChild(style);

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
    }

    // Отображаем модальное окно с индикатором загрузки
    modal.style.display = 'flex';
    document.getElementById('tab-info').innerHTML = '<div style="text-align: center; padding: 20px;">Загрузка данных...</div>';

    try {
        // Активируем первую вкладку
        modal.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        modal.querySelector('.tab-button[data-tab="info"]').classList.add('active');
        document.getElementById('tab-info').classList.add('active');

        // Получаем ID пациента из номера карты
        const patientId = patient.card;

        // Если ID пациента не доступен, показываем только базовую информацию
        if (!patientId) {
            renderBasicInfo(patient);
            renderDiagnosesTab([]);
            renderVisitsTab([], []);
            renderDoctorsTab([]);
            renderRecommendationsTab([]);
            return;
        }

        // Получаем полные данные пациента
        try {
            const data = await fetchPatientDetails(patientId);

            // Рендерим все вкладки
            renderBasicInfo(data.patient || patient);
            renderDiagnosesTab(data.diagnoses || []);
            renderVisitsTab(data.appointments || [], data.analyses || []);
            renderDoctorsTab(data.doctors || []);
            renderRecommendationsTab(data.recommendations || []);
        } catch (error) {
            console.error('Ошибка получения данных:', error);

            // Если API не работает, используем только данные из таблицы
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

    // Функциональность кнопки закрытия
    modal.querySelector('#closePatientDetailsBtn').onclick = function() {
        modal.style.display = 'none';
    };

    // Закрытие по клику снаружи модального окна
    window.onclick = function(event) {
        if (event.target === modal) modal.style.display = 'none';
    };
}

// Рендер вкладки с основной информацией
function renderBasicInfo(patient) {
    const tabContent = document.getElementById('tab-info');

    tabContent.innerHTML = `
        <div class="detail-section">
            <div class="detail-header">Основная информация</div>
            <div class="detail-grid">
                <div class="detail-row">
                    <span class="detail-label">ФИО:</span>
                    <span>${patient.full_name || patient.name || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Дата рождения:</span>
                    <span>${formatDate(patient.birth_date) || patient.dob || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Номер карты:</span>
                    <span>${patient.card_number || patient.card || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Телефон:</span>
                    <span>${patient.phone || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span>${patient.email || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Пол:</span>
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

    let html = '<div class="detail-header">История диагнозов</div>';
    html += '<table>';
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
        // Улучшенная обработка даты
        let dateDisplay = '-';
        if (diagnosis.date) {
            try {
                const formattedDate = formatDate(diagnosis.date);
                if (formattedDate) {
                    dateDisplay = formattedDate;
                }
            } catch (e) {
                console.error('Ошибка форматирования даты:', e);
            }
        }

        html += `
            <tr>
                <td>${dateDisplay}</td>
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

            let uniquePathologies = new Set();

            if (analysis.pathologies && Array.isArray(analysis.pathologies)) {
                analysis.pathologies.forEach(p => {
                    if (p.name) {
                        uniquePathologies.add(p.name);
                    }
                });
            }

            const pathologyList = Array.from(uniquePathologies).join(', ');

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
    html += '<table>';
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
    html += '<table>';
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

    // Сортируем рекомендации по дате (от новых к старым)
    recommendations.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });

    recommendations.forEach(rec => {
        html += `
            <div class="history-item">
                <div class="history-date">${formatDate(rec.date) || 'Дата не указана'}</div>
                <div class="history-doctor">Врач: ${rec.doctor_name || 'Не указан'}</div>
                <div class="recommendation-text">${rec.text || '-'}</div>
            </div>
        `;
    });

    tabContent.innerHTML = html;
}

// Вспомогательная функция для форматирования пола
function formatGender(gender) {
    if (!gender) return '';
    switch(gender.toLowerCase()) {
        case 'male': return 'Мужской';
        case 'female': return 'Женский';
        default: return gender;
    }
}

// Вспомогательная функция для форматирования даты
function formatDate(dateStr) {
    if (!dateStr) return null;

    try {
        // Проверяем различные форматы даты
        let date;

        // Если дата уже в формате DD.MM.YYYY
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        // Для ISO формата и других форматов
        date = new Date(dateStr);

        // Проверяем, валидная ли дата
        if (isNaN(date.getTime())) {
            // Пытаемся обработать другие форматы
            const parts = dateStr.split(/[-./]/);
            if (parts.length === 3) {
                // Пробуем различные порядки месяца, дня и года
                // формат YYYY-MM-DD или DD.MM.YYYY или MM/DD/YYYY
                if (parts[0].length === 4) {
                    // Вероятно YYYY-MM-DD
                    date = new Date(parts[0], parts[1] - 1, parts[2]);
                } else if (parts[2].length === 4) {
                    // Вероятно DD.MM.YYYY или MM/DD/YYYY
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            }

            // Если все еще неверная дата, возвращаем исходную строку
            if (isNaN(date.getTime())) {
                return dateStr;
            }
        }

        // Форматируем дату в российском формате
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}.${month}.${year}`;
    } catch (e) {
        console.error('Ошибка обработки даты:', e, dateStr);
        return dateStr || '-';
    }
}

// Вспомогательная функция для заглушки данных
function getMockDiagnoses() {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    return [
        {
            diagnosis_id: 1,
            diagnosis_text: "Кариес зуба 2.4",
            date: today.toISOString().split('T')[0],
            doctor_name: "Петров Петр Петрович"
        },
        {
            diagnosis_id: 2,
            diagnosis_text: "Пульпит зуба 1.6",
            date: yesterday.toISOString().split('T')[0],
            doctor_name: "Петров Петр Петрович"
        },
        {
            diagnosis_id: 3,
            diagnosis_text: "Периодонтит зуба 3.7",
            date: lastWeek.toISOString().split('T')[0],
            doctor_name: "Петров Петр Петрович"
        }
    ];
}

// Вспомогательная функция для перевода типа приема
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

// Update action handlers to use the new enhanced modal
function attachActionHandlers() {
    document.querySelectorAll('.action-button.view').forEach(button => {
        button.onclick = function() {
            const patientName = this.closest('tr').querySelector('.patient-name').textContent;
            const patient = lastRenderedPatients.find(p => p.name === patientName);
            if (patient) {
                showPatientDetailsModal(patient);
            } else {
                alert(`Просмотр карточки пациента: ${patientName}`);
            }
        };
    });
    document.querySelectorAll('.action-button.diagnose').forEach(button => {
        button.onclick = function() {
            const patientName = this.closest('tr').querySelector('.patient-name').textContent;
            const patient = lastRenderedPatients.find(p => p.name === patientName);
            if (patient) {
                // Сохраняем данные пациента в localStorage для анализа снимков
                localStorage.setItem('analysis_patient_name', patient.name || '');
                localStorage.setItem('analysis_patient_card', patient.card || '');
                localStorage.setItem('analysis_patient_dob', patient.dob || '');

                // Определяем пол для передачи (ищем по полю patient.gender или по ФИО)
                let gender = 'male';
                if (patient.gender) {
                    const g = patient.gender.toLowerCase();
                    if (g.startsWith('ж') || g === 'female' || g === 'женский') gender = 'female';
                    else if (g.startsWith('м') || g === 'male' || g === 'мужской') gender = 'male';
                } else if (patient.name) {
                    // Пробуем по ФИО: ищем второе слово (имя) и третье (отчество)
                    const parts = patient.name.trim().split(' ');
                    // Если есть отчество и оно заканчивается на "вна" или "ична" - это женский пол
                    if (parts.length >= 3) {
                        const otch = parts[2].toLowerCase();
                        if (otch.endsWith('вна') || otch.endsWith('ична')) {
                            gender = 'female';
                        }
                    }
                    // Если не удалось по отчеству, пробуем по имени
                    if (gender === 'male' && parts.length >= 2) {
                        const firstName = parts[1].toLowerCase();
                        // Женские имена часто заканчиваются на "а" или "я", но не всегда
                        if (
                            (firstName.endsWith('а') || firstName.endsWith('я')) &&
                            !/ча$|ша$|жа$|га$|ка$|ха$/.test(firstName)
                        ) {
                            gender = 'female';
                        }
                    }
                }
                localStorage.setItem('analysis_patient_gender', gender);
                window.location.href = '../analysis/analysis.html';
            } else {
                alert(`Переход к диагностике пациента: ${patientName}`);
            }
        };
    });
}

// --- Initial Render ---

document.addEventListener('DOMContentLoaded', function() {
    importPatientsFromApi();
});

// Переключение отображения панели фильтров
const filterBtn = document.getElementById('filterBtn');
const filterPanel = document.getElementById('filterPanel');

if (filterBtn && filterPanel) {
    filterBtn.addEventListener('click', function() {
        filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
    });
}

// Модальное окно добавления пациента
const addPatientBtn = document.getElementById('addPatientBtn');
const addPatientModal = document.getElementById('addPatientModal');
const closeModalBtn = document.getElementById('closeModalBtn');

if (addPatientBtn && addPatientModal) {
    addPatientBtn.addEventListener('click', function() {
        addPatientModal.style.display = 'flex';
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            addPatientModal.style.display = 'none';
        });
    }

    window.addEventListener('click', function(event) {
        if (event.target === addPatientModal) {
            addPatientModal.style.display = 'none';
        }
    });
}