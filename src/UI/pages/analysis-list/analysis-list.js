/* Analysis List Page JavaScript */
const SERVER_BASE_URL = 'http://localhost:8000';
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let lastResults = [];

document.addEventListener('DOMContentLoaded', function() {
    // Search functionality 
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            // Получаем ID врача из select, как это сделано в conclusions.js
            const doctorId = document.getElementById('doctor')?.value || '';
            const params = {
                patientName: document.getElementById('patientName')?.value || '',
                dateFrom: document.getElementById('dateFrom').value || '',
                dateTo: document.getElementById('dateTo').value || '',
                doctor: doctorId // Теперь отправляем doctor вместо doctor_name
            };

            // Убираем пустые значения
            Object.keys(params).forEach(key =>
                (!params[key] || params[key] === '') && delete params[key]
            );

            console.log('Search params:', params); // Для отладки
            loadAnalysisPOST(params);
        });
    }

    // Clear filters
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            document.getElementById('status').value = '';
            loadAnalysisPOST({});
        });
    }

    // Load initial data
    loadAnalysisPOST();

    // Загрузка списка врачей
    loadDoctors();

    // Модальное окно для просмотра снимка
    const modal = document.createElement('div');
    modal.id = 'aiResultModal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    modal.innerHTML = `
        <div style="background:#fff;padding:24px 24px 12px 24px;border-radius:8px;max-width:90vw;max-height:90vh;position:relative;display:flex;flex-direction:column;align-items:center;">
            <button id="closeAiResultModal" style="position:absolute;top:8px;right:12px;font-size:22px;background:none;border:none;cursor:pointer;">&times;</button>
            <img id="aiResultModalImg" src="" alt="AI Result" style="max-width:80vw;max-height:80vh;display:block;">
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('closeAiResultModal').onclick = function() {
        modal.style.display = 'none';
        document.getElementById('aiResultModalImg').src = '';
    };
});

function loadAnalysisPOST(params = {}) {
    console.log('Sending request with params:', params);

    fetch(`${SERVER_BASE_URL}/api/analysis-results-search`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params || {})
    })
    .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log('Received data:', data); // Добавляем детальный вывод для отладки

        // Проверяем наличие пациентов и врачей в первых результатах
        if (Array.isArray(data) && data.length > 0) {
            console.log('First item sample:');
            console.log('patient_name:', data[0].patient_name);
            console.log('doctor_name:', data[0].doctor_name);
        }

        if (Array.isArray(data)) {
            renderAnalysisTable(data);
        } else {
            console.error('Data is not an array:', data);
            document.getElementById('noResults').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error loading analyses:', error);
        document.getElementById('noResults').style.display = 'block';
    });
}

function renderAnalysisTable(results, page = 1) {
    const tbody = document.getElementById('analysisTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!results || !results.length) {
        document.getElementById('noResults').style.display = 'block';
        document.querySelector('.analysis-table').style.display = 'none';
        return;
    }

    document.getElementById('noResults').style.display = 'none';
    document.querySelector('.analysis-table').style.display = 'table';

    // Группируем по уникальному analysis_id (чтобы не было дублей)
    const unique = {};
    results.forEach(result => {
        // Ключ - дата + пациент + врач + патологии (или analysis_id, если есть)
        const key = [
            result.date,
            result.patient_name,
            result.doctor_name,
            result.pathologies,
            result.ai_result_url,
            result.status
        ].join('|');
        if (!unique[key]) {
            unique[key] = result;
        }
    });

    Object.values(unique).forEach((result, idx) => {
        let aiResultCell = '-';
        if (result.ai_result_url) {
            aiResultCell = `<a href="#" class="ai-result-link" data-url="${result.ai_result_url}" data-idx="${idx}" style="color:#1565c0;text-decoration:underline;font-weight:500;">Посмотреть</a>`;
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px 12px;white-space:nowrap;font-size:15px;">${formatDate(result.date)}</td>
            <td style="padding:8px 12px;white-space:nowrap;font-size:15px;">${result.patient_name || '-'}</td>
            <td style="padding:8px 12px;white-space:nowrap;font-size:15px;">${result.doctor_name || '-'}</td>
            <td style="padding:8px 12px;white-space:normal;font-size:15px;">${result.pathologies || '-'}</td>
            <td style="padding:8px 12px;text-align:center;">${aiResultCell}</td>
            <td style="padding:8px 12px;white-space:nowrap;">${getStatusBadge(result.status)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Навешиваем обработчики на ссылки "Посмотреть"
    Array.from(document.getElementsByClassName('ai-result-link')).forEach(link => {
        link.onclick = function(e) {
            e.preventDefault();
            const url = this.getAttribute('data-url');
            const modal = document.getElementById('aiResultModal');
            const img = document.getElementById('aiResultModalImg');
            img.src = url;
            modal.style.display = 'flex';
        };
    });
}

function getStatusBadge(status) {
    const statusMap = {
        'completed': '<span class="status-badge success">Завершен</span>',
        'processing': '<span class="status-badge warning">В обработке</span>',
        'error': '<span class="status-badge error">Ошибка</span>'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
}

function loadDoctors() {
    fetch(`${SERVER_BASE_URL}/api/doctors`)
        .then(res => res.json())
        .then(doctors => {
            const doctorSelect = document.getElementById('doctor');
            if (!doctorSelect) return;
            const prevValue = doctorSelect.value;
            doctorSelect.innerHTML = '<option value="">Все врачи</option>';
            // Добавляем всех пользователей, включая admin (даже если specialty пустой)
            doctors.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id; // user_id
                let label = doc.full_name;
                // Всегда явно добавляем admin, даже если specialty и role не указаны
                if (doc.role && doc.role.toLowerCase() === 'admin') {
                    label += ' (Администратор)';
                } else if (doc.specialty && doc.specialty.trim() !== '') {
                    label += ` (${doc.specialty})`;
                }
                option.textContent = label;
                doctorSelect.appendChild(option);
            });
            // Если ни одного admin нет в списке, добавить вручную (fallback)
            if (![...doctorSelect.options].some(opt => opt.textContent.includes('Администратор'))) {
                const adminOption = document.createElement('option');
                adminOption.value = 'admin';
                adminOption.textContent = 'Администратор';
                doctorSelect.appendChild(adminOption);
            }
            doctorSelect.value = prevValue;
        });
}