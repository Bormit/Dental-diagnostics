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
    }

    function closeModal() {
        createConclusionModal.style.display = 'none';
    }

    // Event Listeners for Modal Navigation
    createConclusionBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelConclusionBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    createConclusionModal.addEventListener('click', function(e) {
        if (e.target === createConclusionModal) {
            closeModal();
        }
    });

    // Conclusion Saving Logic
    saveConclusionBtn.addEventListener('click', function() {
        const form = document.getElementById('conclusionForm');

        if (form.checkValidity()) {
            // Collect form data
            const formData = {
                patient: document.getElementById('patientSearch').value,
                doctor: document.getElementById('conclusionDoctor').value,
                diagnosis: document.getElementById('conclusionDiagnosis').value,
                conclusionText: document.getElementById('conclusionText').value,
                recommendations: document.getElementById('conclusionRecommendations').value
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

    // File Upload Handling
    const fileUpload = document.querySelector('.file-upload');
    const fileInput = document.getElementById('xrayUpload');

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

    // Patient Search Functionality
    const patientSearchBtn = document.querySelector('.search-patient-btn');
    const patientSearchInput = document.getElementById('patientSearch');

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

    searchConclusionsBtn.addEventListener('click', function() {
        const searchParams = {
            patientName: document.getElementById('patientName').value,
            dateFrom: document.getElementById('dateFrom').value,
            dateTo: document.getElementById('dateTo').value,
            doctor: document.getElementById('doctor').value
        };

        // TODO: Implement actual search API call
        performConclusionSearch(searchParams);
    });

    function performConclusionSearch(params) {
        // Placeholder for server-side search
        console.log('Searching conclusions with params:', params);

        // In a real application, this would make an AJAX call
        // and update the table with results
    }

    clearSearchBtn.addEventListener('click', function() {
        // Reset search form
        document.getElementById('patientName').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('doctor').value = '';
    });

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

    // Initialize table actions
    setupTableActions();
});

// Функционал поиска пациентов по ФИО в заключениях
document.addEventListener('DOMContentLoaded', function() {
    // Находим нужные элементы DOM
    const patientNameInput = document.getElementById('patientName');
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const doctorSelect = document.getElementById('doctor');
    const searchBtn = document.getElementById('searchConclusionsBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    const resultsCount = document.getElementById('resultsCount');
    const noResultsBlock = document.getElementById('noResults');
    const tableRows = document.querySelectorAll('.conclusions-table tbody tr');
    const conclusionsTable = document.querySelector('.conclusions-table');
    
    // Добавляем обработчик события для кнопки поиска
    searchBtn.addEventListener('click', function() {
        performSearch();
    });
    
    // Добавляем обработчик для очистки формы
    clearBtn.addEventListener('click', function() {
        clearSearch();
    });
    
    // Поиск при нажатии Enter в поле ФИО
    patientNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Функция выполнения поиска
    function performSearch() {
        const patientName = patientNameInput.value.toLowerCase().trim();
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;
        const doctor = doctorSelect.value;
        
        // Счетчик найденных результатов
        let foundCount = 0;
        
        // Проверяем каждую строку в таблице
        tableRows.forEach(row => {
            const rowPatientName = row.cells[1].textContent.toLowerCase();
            const rowDate = row.cells[0].textContent;
            const rowDoctor = row.cells[2].textContent;
            
            // Проверяем соответствие всем критериям поиска
            let matchesName = true;
            let matchesDate = true;
            let matchesDoctor = true;
            
            // Проверяем ФИО пациента
            if (patientName && !rowPatientName.includes(patientName)) {
                matchesName = false;
            }
            
            // Проверяем период дат (в реальном приложении нужен парсинг даты)
            if (dateFrom || dateTo) {
                // Преобразуем дату из формата ДД.ММ.ГГГГ в объект Date
                const dateParts = rowDate.split('.');
                const rowDateObj = new Date(
                    parseInt(dateParts[2]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[0])
                );
                
                if (dateFrom && new Date(dateFrom) > rowDateObj) {
                    matchesDate = false;
                }
                
                if (dateTo && new Date(dateTo) < rowDateObj) {
                    matchesDate = false;
                }
            }
            
            // Проверяем врача
            if (doctor && !rowDoctor.includes(doctorSelect.options[doctorSelect.selectedIndex].text)) {
                matchesDoctor = false;
            }
            
            // Показываем или скрываем строку
            if (matchesName && matchesDate && matchesDoctor) {
                row.style.display = '';
                foundCount++;
                
                // Подсвечиваем совпадение в ФИО, если был поиск по ФИО
                if (patientName) {
                    const originalText = row.cells[1].textContent;
                    const highlightedText = originalText.replace(
                        new RegExp(patientName, 'gi'),
                        match => `<span class="search-highlight">${match}</span>`
                    );
                    row.cells[1].innerHTML = highlightedText;
                }
            } else {
                row.style.display = 'none';
            }
        });
        
        // Обновляем счетчик результатов
        resultsCount.textContent = foundCount;
        
        // Показываем или скрываем блок "нет результатов"
        if (foundCount === 0) {
            noResultsBlock.style.display = 'block';
            conclusionsTable.style.display = 'none';
        } else {
            noResultsBlock.style.display = 'none';
            conclusionsTable.style.display = 'table';
        }
    }
    
    // Функция очистки поиска
    function clearSearch() {
        patientNameInput.value = '';
        dateFromInput.value = '';
        dateToInput.value = '';
        doctorSelect.value = '';
        
        // Показываем все строки
        tableRows.forEach(row => {
            row.style.display = '';
            // Возвращаем оригинальный текст без подсветки
            const cell = row.cells[1];
            cell.innerHTML = cell.textContent;
        });
        
        // Обновляем счетчик результатов
        resultsCount.textContent = tableRows.length;
        
        // Скрываем блок "нет результатов"
        noResultsBlock.style.display = 'none';
        conclusionsTable.style.display = 'table';
    }
    
    // Добавляем стили для подсветки найденного текста
    const style = document.createElement('style');
    style.textContent = `
        .search-highlight {
            background-color: #ffeb3b;
            padding: 0 2px;
            border-radius: 2px;
        }
    `;
    document.head.appendChild(style);
});