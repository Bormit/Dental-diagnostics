// patient-search.js - Функциональность для страницы поиска пациентов

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
    document.getElementById('searchPatientsBtn').addEventListener('click', searchPatients);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);

    // Поиск пациентов
    const searchPatientsBtn = document.getElementById('searchPatientsBtn');
    const patientsTable = document.querySelector('.patients-table');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');

    if (searchPatientsBtn && patientsTable && noResults && resultsCount) {
        searchPatientsBtn.addEventListener('click', function() {
            // Сбор данных формы
            const patientName = document.getElementById('patientName')?.value || '';
            const birthDate = document.getElementById('birthDate')?.value || '';
            const policyNumber = document.getElementById('policyNumber')?.value || '';
            const cardNumber = document.getElementById('cardNumber')?.value || '';
            const phoneNumber = document.getElementById('phoneNumber')?.value || '';
            const patientStatus = document.getElementById('patientStatus')?.value || '';

            // Расширенный поиск
            const diagnosis = document.getElementById('diagnosis')?.value || '';
            const attendingDoctor = document.getElementById('attendingDoctor')?.value || '';
            const visitDateFrom = document.getElementById('visitDateFrom')?.value || '';
            const visitDateTo = document.getElementById('visitDateTo')?.value || '';

            // В реальном приложении здесь будет AJAX-запрос к серверу
            // Для примера эмулируем результаты поиска

            // Проверяем, есть ли какие-либо критерии поиска
            const hasSearchCriteria = patientName || birthDate || policyNumber || cardNumber ||
                phoneNumber || patientStatus || diagnosis ||
                attendingDoctor || visitDateFrom || visitDateTo;

            if (!hasSearchCriteria) {
                alert('Пожалуйста, укажите хотя бы один критерий поиска');
                return;
            }

            // Эмуляция запроса к серверу
            simulateSearch(
                patientName,
                birthDate,
                policyNumber,
                cardNumber,
                phoneNumber,
                patientStatus,
                diagnosis,
                attendingDoctor,
                visitDateFrom,
                visitDateTo
            );
        });
    }

    // Эмуляция запроса к серверу
    function simulateSearch(patientName, birthDate, policyNumber, cardNumber, phoneNumber, patientStatus, diagnosis, attendingDoctor, visitDateFrom, visitDateTo) {
        // Эмулируем задержку сети
        const loadingStart = Date.now();

        // Добавляем индикатор загрузки
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

        setTimeout(() => {
            // Эмулируем результаты поиска
            const hasResults = shouldShowResults(patientName, cardNumber, phoneNumber);

            // Обновляем интерфейс
            if (patientsTable) patientsTable.style.display = hasResults ? 'table' : 'none';
            if (noResults) noResults.style.display = hasResults ? 'none' : 'block';

            if (resultsCount) {
                const count = hasResults ? 5 : 0;
                resultsCount.textContent = count;
            }

            // Удаляем индикатор загрузки
            if (loadingIndicator) {
                loadingIndicator.remove();
            }

            // Сбрасываем относительное позиционирование
            if (mainContent) {
                mainContent.style.position = '';
            }

            // Прокручиваем к результатам, если они есть
            if (hasResults && patientsTable) {
                patientsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (!hasResults && noResults) {
                noResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, Math.max(500, 1000 - (Date.now() - loadingStart))); // Минимум 500 мс для демонстрации загрузки
    }

    // Вспомогательная функция для эмуляции логики поиска
    function shouldShowResults(patientName, cardNumber, phoneNumber) {
        // Если поиск по карте "12345", эмулируем найденного пациента
        if (cardNumber === '12345') return true;

        // Если поиск по имени "Петров", эмулируем найденного пациента
        if (patientName && patientName.toLowerCase().includes('петров')) return true;

        // Если поиск по телефону с "123", эмулируем найденного пациента
        if (phoneNumber && phoneNumber.includes('123')) return true;

        // В других случаях эмулируем отсутствие результатов
        // По умолчанию все результаты отображаются для демонстрации
        return !patientName && !cardNumber && !phoneNumber;
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

    // Форматирование ввода номера телефона
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 0) {
                if (value[0] !== '7' && value[0] !== '8') {
                    value = '7' + value;
                }

                // Формат: +7 (XXX) XXX-XX-XX
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

// Функция поиска пациентов
function searchPatients() {
    // Здесь будет логика поиска
    console.log('Выполняется поиск пациентов...');

    // Для демонстрации - показываем результаты и скрываем блок "нет результатов"
    document.querySelector('.patients-table').style.display = 'table';
    document.querySelector('.pagination').style.display = 'flex';
    document.getElementById('noResults').style.display = 'none';
}

// Функция очистки полей поиска
function clearSearch() {
    const inputs = document.querySelectorAll('.search-input');
    inputs.forEach(input => {
        input.value = '';
    });
}