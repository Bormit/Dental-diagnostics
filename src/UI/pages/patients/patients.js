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
        // Приводим данные к нужному формату для таблицы
        const patients = data.map(p => ({
            name: p.full_name || p.name || '',
            dob: p.birth_date ? p.birth_date.slice(0, 10) : '',
            card: p.patient_id ? String(p.patient_id) : (p.card || ''),
            phone: p.phone || '',
            diagnosis: p.last_diagnosis || '',
            lastVisit: p.last_visit ? p.last_visit.slice(0, 10) : '',
            status: p.status || 'active'
        }));
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

function attachActionHandlers() {
    document.querySelectorAll('.action-button.view').forEach(button => {
        button.onclick = function() {
            const patientName = this.closest('tr').querySelector('.patient-name').textContent;
            alert(`Просмотр карточки пациента: ${patientName}`);
        };
    });
    document.querySelectorAll('.action-button.diagnose').forEach(button => {
        button.onclick = function() {
            const patientName = this.closest('tr').querySelector('.patient-name').textContent;
            alert(`Переход к диагностике пациента: ${patientName}`);
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