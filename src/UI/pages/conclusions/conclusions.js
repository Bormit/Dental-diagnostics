const SERVER_BASE_URL = 'http://localhost:8000';
const CONCLUSIONS_PER_PAGE = 10;
let currentPage = 1;
let lastConclusions = [];

document.addEventListener('DOMContentLoaded', function() {
    // Modal Window Management
    const createConclusionBtn = document.getElementById('createConclusionBtn');
    const createConclusionModal = document.getElementById('createConclusionModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelConclusionBtn = document.getElementById('cancelConclusionBtn');
    const saveConclusionBtn = document.getElementById('saveConclusionBtn');

    // Modal Interaction Handlers
    function openModal() {
        createConclusionModal.style.display = 'flex';
        // Reset form when opening
        document.getElementById('conclusionForm').reset();
        // Установить сегодняшнюю дату по умолчанию
        const dateInput = document.getElementById('conclusionDate');
        if (dateInput) {
            const today = new Date();
            dateInput.value = today.toISOString().slice(0, 10);
        }
    }

    function closeModal() {
        createConclusionModal.style.display = 'none';
    }

    // Event Listeners for Modal Navigation
    if (createConclusionBtn) {
        createConclusionBtn.addEventListener('click', function() {
            window.location.href = '../analysis/analysis.html';
        });
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (cancelConclusionBtn) {
        cancelConclusionBtn.addEventListener('click', closeModal);
    }
    if (createConclusionModal) {
        createConclusionModal.addEventListener('click', function(e) {
            if (e.target === createConclusionModal) {
                closeModal();
            }
        });
    }

    // Conclusion Saving Logic
    if (saveConclusionBtn && createConclusionModal) {
        saveConclusionBtn.addEventListener('click', function() {
            const form = document.getElementById('conclusionForm');

            if (form.checkValidity()) {
                // Collect form data
                const formData = {
                    patient: document.getElementById('patientSearch').value,
                    doctor: document.getElementById('conclusionDoctor').value,
                    diagnosis: document.getElementById('conclusionDiagnosis').value,
                    conclusionText: document.getElementById('conclusionText').value,
                    recommendations: document.getElementById('conclusionRecommendations').value,
                    date: document.getElementById('conclusionDate').value // Новое поле
                };

                // TODO: Implement actual server-side save mechanism
                console.log('Saving conclusion:', formData);

                // Simulate server save
                setTimeout(() => {
                    alert('Заключение успешно сохранено');
                    closeModal();
                    refreshConclusionsList();
                }, 500);
            } else {
                form.reportValidity();
            }
        });
    }

    // File Upload Handling
    const fileUpload = document.querySelector('.file-upload');
    const fileInput = document.getElementById('xrayUpload');

    if (fileUpload && fileInput) {
        fileUpload.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const label = fileUpload.querySelector('.file-upload-label');

            if (file) {
                label.textContent = `Выбран файл: ${file.name}`;
                label.classList.add('file-selected');
            } else {
                label.textContent = 'Выберите файл или перетащите снимок сюда';
                label.classList.remove('file-selected');
            }
        });
    }

    // Patient Search Functionality
    const patientSearchBtn = document.querySelector('.search-patient-btn');
    const patientSearchInput = document.getElementById('patientSearch');

    if (patientSearchBtn && patientSearchInput) {
        patientSearchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const searchTerm = patientSearchInput.value.trim();

            if (searchTerm) {
                // TODO: Implement actual patient search API call
                searchPatients(searchTerm);
            } else {
                alert('Введите ФИО пациента для поиска');
            }
        });
    }

    function searchPatients(searchTerm) {
        // Placeholder for patient search logic
        // In a real application, this would be an API call
        console.log('Searching for patient:', searchTerm);

        // Mock patient results
        const mockPatients = [
            { id: 1, name: 'Петров Петр Петрович', cardNumber: '12345' },
            { id: 2, name: 'Иванова Анна Сергеевна', cardNumber: '67890' }
        ];

        // Display results (would typically be in a dropdown or modal)
        alert('Найдено пациентов: ' + mockPatients.length);
    }

    // Conclusions Search Functionality
    const searchConclusionsBtn = document.getElementById('searchConclusionsBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    // Динамическая загрузка докторов в select#doctor
    function loadDoctors() {
        fetch(`${SERVER_BASE_URL}/api/doctors`)
            .then(res => res.json())
            .then(doctors => {
                const doctorSelect = document.getElementById('doctor');
                if (!doctorSelect) return;
                const prevValue = doctorSelect.value;
                doctorSelect.innerHTML = '<option value="">Все врачи</option>';
                doctors.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc.id; // user_id
                    let label = doc.full_name;
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
    loadDoctors();

    if (searchConclusionsBtn) {
        searchConclusionsBtn.addEventListener('click', function() {
            const params = {
                patient_id: document.getElementById('patientName').value || '',
                date_from: document.getElementById('dateFrom').value || '',
                date_to: document.getElementById('dateTo').value || '',
                doctor_id: document.getElementById('doctor').value || '', // Теперь точно соответствует doctor_id из БД
                diagnosis_text: document.getElementById('diagnosis')?.value || '',
                treatment_plan: document.getElementById('recommendations')?.value || ''
            };

            // Убираем пустые значения
            Object.keys(params).forEach(key => 
                (!params[key] || params[key] === '') && delete params[key]
            );

            console.log('Search params:', params); // Для отладки
            loadConclusionsPOST(params);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            document.getElementById('patientName').value = '';
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            document.getElementById('doctor').value = '';
            if (document.getElementById('diagnosis')) document.getElementById('diagnosis').value = '';
            if (document.getElementById('recommendations')) document.getElementById('recommendations').value = '';
            loadConclusionsPOST({});
        });
    }

    // Table Action Handlers
    function setupTableActions() {
        const viewButtons = document.querySelectorAll('.view-btn');
        const editButtons = document.querySelectorAll('.edit-btn');

        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const conclusionId = this.dataset.id;
                viewConclusion(conclusionId);
            });
        });

        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const conclusionId = this.dataset.id;
                editConclusion(conclusionId);
            });
        });
    }

    function viewConclusion(id) {
        // TODO: Implement conclusion viewing logic
        console.log('Viewing conclusion:', id);
        // Open modal/navigate to detailed view
    }

    function editConclusion(id) {
        // TODO: Implement conclusion editing logic
        console.log('Editing conclusion:', id);
        // Populate modal with existing conclusion data
        openModal();
    }

    function refreshConclusionsList() {
        // TODO: Implement list refresh mechanism
        // This would typically involve an AJAX call to reload table data
        console.log('Refreshing conclusions list');
    }

    // Загрузка и отображение заключений из БД
    function loadConclusions(params = {}) {
        // Формируем query string из params
        const query = new URLSearchParams(params).toString();
        fetch(`${SERVER_BASE_URL}/api/conclusions${query ? '?' + query : ''}`)
            .then(res => res.json())
            .then(data => {
                renderConclusionsTable(data);
            });
    }

    function loadConclusionsPOST(params = {}) {
        fetch(`${SERVER_BASE_URL}/api/conclusions-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        })
        .then(res => res.json())
        .then(data => {
            currentPage = 1;
            renderConclusionsTable(data, currentPage);
        });
    }

    function renderConclusionsTable(conclusions, page = 1) {
        lastConclusions = conclusions;
        const tbody = document.querySelector('.conclusions-table tbody');
        const noResultsBlock = document.getElementById('noResults');
        const conclusionsTable = document.querySelector('.conclusions-table');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!conclusions || conclusions.length === 0) {
            if (noResultsBlock) noResultsBlock.style.display = 'block';
            if (conclusionsTable) conclusionsTable.style.display = 'none';
            renderConclusionsPagination([], 1);
            const resultsCount = document.getElementById('resultsCount');
            if (resultsCount) resultsCount.textContent = 0;
            return;
        } else {
            if (noResultsBlock) noResultsBlock.style.display = 'none';
            if (conclusionsTable) conclusionsTable.style.display = 'table';
        }

        const totalPages = Math.max(1, Math.ceil(conclusions.length / CONCLUSIONS_PER_PAGE));
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        const startIdx = (page - 1) * CONCLUSIONS_PER_PAGE;
        const endIdx = startIdx + CONCLUSIONS_PER_PAGE;
        const pageConclusions = conclusions.slice(startIdx, endIdx);

        pageConclusions.forEach(conc => {
            let dateTime = conc.date || '';
            if (conc.time) {
                dateTime = `${conc.date} ${conc.time}`;
            }
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateTime}</td>
                <td>${conc.patient || ''}</td>
                <td>${conc.doctor || ''}</td>
                <td>${conc.diagnosis_text || ''}</td>
                <!-- <td>${conc.status || ''}</td> -->
                <td>
                  <button class="table-btn view-btn" data-id="${conc.diagnosis_id}">Просмотр</button>
                  <button class="table-btn edit-btn" data-id="${conc.diagnosis_id}">Изменить</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        renderConclusionsPagination(conclusions, page);
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) resultsCount.textContent = conclusions.length;
    }

    function getConclusionsTotalPages(conclusions) {
        return Math.max(1, Math.ceil(conclusions.length / CONCLUSIONS_PER_PAGE));
    }

    function renderConclusionsPagination(conclusions, page) {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;
        const totalPages = getConclusionsTotalPages(conclusions);

        pagination.innerHTML = '';

        // Prev button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '&lt;';
        prevBtn.disabled = page === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderConclusionsTable(lastConclusions, currentPage);
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
                    renderConclusionsTable(lastConclusions, currentPage);
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
                        renderConclusionsTable(lastConclusions, currentPage);
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
                renderConclusionsTable(lastConclusions, currentPage);
            }
        };
        pagination.appendChild(nextBtn);
    }

    // При загрузке страницы — показать все заключения
    loadConclusionsPOST();

    // Поиск по фильтрам через POST
    document.getElementById('searchConclusionsBtn').addEventListener('click', function() {
        const params = {
            patientName: document.getElementById('patientName').value,
            dateFrom: document.getElementById('dateFrom').value,
            dateTo: document.getElementById('dateTo').value,
            doctor: document.getElementById('doctor').value,
            diagnosis: document.getElementById('diagnosis') ? document.getElementById('diagnosis').value : '',
            recommendations: document.getElementById('recommendations') ? document.getElementById('recommendations').value : '',
            status: document.getElementById('status') ? document.getElementById('status').value : ''
        };
        loadConclusionsPOST(params);
    });

    // Очистка фильтров
    document.getElementById('clearSearchBtn').addEventListener('click', function() {
        document.getElementById('patientName').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('doctor').value = '';
        if (document.getElementById('diagnosis')) document.getElementById('diagnosis').value = '';
        if (document.getElementById('recommendations')) document.getElementById('recommendations').value = '';
        if (document.getElementById('status')) document.getElementById('status').value = '';
        loadConclusionsPOST({});
    });

    // Initialize table actions
    setupTableActions();
});