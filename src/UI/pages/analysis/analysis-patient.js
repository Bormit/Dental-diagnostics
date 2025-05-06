document.addEventListener('DOMContentLoaded', function() {
    // Управление информацией о пациенте
    const clearPatientBtn = document.getElementById('clearPatientBtn');
    const searchPatientBtn = document.getElementById('searchPatientBtn');
    const patientInfoPanel = document.getElementById('patientInfoPanel');
    const noPatientWarning = document.getElementById('noPatientWarning');
    const patientHistoryPanel = document.getElementById('patientHistoryPanel');
    const noHistoryPanel = document.getElementById('noHistoryPanel');

    if (clearPatientBtn) {
        clearPatientBtn.addEventListener('click', function() {
            document.getElementById('patientName').value = '';
            document.getElementById('birthDate').value = '';
            document.getElementById('gender').value = 'male';
            document.getElementById('cardNumber').value = '';

            if (patientInfoPanel) patientInfoPanel.style.display = 'none';
            if (noPatientWarning) noPatientWarning.style.display = 'block';
            if (patientHistoryPanel) patientHistoryPanel.style.display = 'none';
            if (noHistoryPanel) noHistoryPanel.style.display = 'block';
        });
    }

    if (searchPatientBtn) {
        searchPatientBtn.addEventListener('click', function() {
            const patientName = document.getElementById('patientName').value.trim();
            const birthDate = document.getElementById('birthDate').value;
            const gender = document.getElementById('gender').value;
            const cardNumber = document.getElementById('cardNumber').value.trim();

            if (patientName && birthDate && cardNumber) {
                // Обновляем информацию о пациенте на странице
                document.querySelector('.patient-name').textContent = patientName;

                // Преобразуем дату в российский формат
                const dateObj = new Date(birthDate);
                document.querySelector('.patient-detail-value:nth-child(2)').textContent =
                    `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getFullYear()}`;
                document.querySelector('.patient-detail-value:nth-child(4)').textContent =
                    gender === 'male' ? 'Мужской' : 'Женский';
                document.querySelector('.patient-detail-value:nth-child(6)').textContent = cardNumber;

                if (patientInfoPanel) patientInfoPanel.style.display = 'block';
                if (noPatientWarning) noPatientWarning.style.display = 'none';

                // Загружаем историю снимков пациента
                loadPatientHistory(cardNumber);
            } else {
                showNotification('Ошибка', 'Пожалуйста, заполните все обязательные поля', 'error');
            }
        });
    }

    // Проверяем, выбран ли пациент
    checkPatientSelected();
});

// Функция проверки выбора пациента
function checkPatientSelected() {
    const patientInfoPanel = document.getElementById('patientInfoPanel');
    const noPatientWarning = document.getElementById('noPatientWarning');
    const patientHistoryPanel = document.getElementById('patientHistoryPanel');
    const noHistoryPanel = document.getElementById('noHistoryPanel');

    const patientName = document.getElementById('patientName').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();

    if (patientName && cardNumber) {
        if (patientInfoPanel) patientInfoPanel.style.display = 'block';
        if (noPatientWarning) noPatientWarning.style.display = 'none';
        if (patientHistoryPanel) patientHistoryPanel.style.display = 'block';
        if (noHistoryPanel) noHistoryPanel.style.display = 'none';

        // Загружаем историю снимков пациента
        loadPatientHistory(cardNumber);
    } else {
        if (patientInfoPanel) patientInfoPanel.style.display = 'none';
        if (noPatientWarning) noPatientWarning.style.display = 'block';
        if (patientHistoryPanel) patientHistoryPanel.style.display = 'none';
        if (noHistoryPanel) noHistoryPanel.style.display = 'block';
    }
}

// Функция загрузки истории снимков пациента
function loadPatientHistory(patientId) {
    const patientHistoryPanel = document.getElementById('patientHistoryPanel');

    if (!patientId || !patientHistoryPanel) return;

    // Показываем индикатор загрузки в панели истории
    patientHistoryPanel.innerHTML = '<div class="loading-history">Загрузка истории...</div>';

    // Отправляем запрос на сервер
    fetch(`${SERVER_BASE_URL}/api/patient-history/${patientId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сервера: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            renderPatientHistory(data.history);
        })
        .catch(error => {
            console.error('Ошибка при загрузке истории пациента:', error);
            patientHistoryPanel.innerHTML = '<div class="error-history">Ошибка при загрузке истории</div>';
        });
}

// Функция отображения истории снимков пациента
function renderPatientHistory(history) {
    const patientHistoryPanel = document.getElementById('patientHistoryPanel');

    if (!patientHistoryPanel) return;

    if (!history || history.length === 0) {
        patientHistoryPanel.innerHTML = '<div class="empty-history">История снимков отсутствует</div>';
        return;
    }

    let historyHtml = '';

    // Отображаем последние 3 записи
    const displayHistory = history.slice(0, 3);

    displayHistory.forEach(item => {
        const date = new Date(item.created_at);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;

        historyHtml += `
        <div class="history-item">
            <div class="history-date">${formattedDate}</div>
            <div class="history-actions">
                <a href="#" class="history-view" data-id="${item.image_id}">Просмотреть</a>
            </div>
        </div>
        `;
    });

    // Добавляем кнопку "Показать все", если есть больше записей
    if (history.length > 3) {
        historyHtml += `
        <div class="show-all-history">
            <button class="search-btn" id="showAllHistoryBtn">Показать все (${history.length})</button>
        </div>
        `;
    }

    patientHistoryPanel.innerHTML = historyHtml;

    // Добавляем обработчики событий
    patientHistoryPanel.querySelectorAll('.history-view').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const imageId = this.getAttribute('data-id');
            viewHistoricalImage(imageId);
        });
    });

    const showAllBtn = document.getElementById('showAllHistoryBtn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            showAllHistory(history);
        });
    }
}

// Функция просмотра снимка из истории
function viewHistoricalImage(imageId) {
    showNotification('Информация', `Просмотр исторического снимка с ID: ${imageId}`, 'info');
}

// Функция отображения всей истории снимков
function showAllHistory(history) {
    // Создаем модальное окно для отображения всей истории
    const modalHtml = `
    <div id="history-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>История снимков пациента</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="history-list">
                    ${generateHistoryList(history)}
                </div>
            </div>
        </div>
    </div>
    `;

    // Добавляем модальное окно на страницу
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Настраиваем обработчики событий
    const modal = document.getElementById('history-modal');
    const closeBtn = modal.querySelector('.close');

    // Закрытие модального окна
    closeBtn.addEventListener('click', function() {
        modal.remove();
    });

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(e) {
        if(e.target === modal) {
            modal.remove();
        }
    });

    // Добавляем обработчики для просмотра снимков
    modal.querySelectorAll('.history-view').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const imageId = this.getAttribute('data-id');
            viewHistoricalImage(imageId);
            modal.remove();
        });
    });

    // Показываем модальное окно
    modal.style.display = 'block';
}

// Генерация HTML для списка истории
function generateHistoryList(history) {
    if(!history || history.length === 0) {
        return '<div class="empty-history">История снимков отсутствует</div>';
    }

    let html = '';

    history.forEach(item => {
        const date = new Date(item.created_at);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
        const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        html += `
        <div class="history-item">
            <div class="history-info">
                <div class="history-date">${formattedDate} ${formattedTime}</div>
                <div class="history-details">Патологий: ${item.pathologies_count}</div>
            </div>
            <div class="history-actions">
                <a href="#" class="history-view" data-id="${item.image_id}">Просмотреть</a>
            </div>
        </div>
        `;
    });

    return html;
}