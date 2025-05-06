window.selectedPatient = null; // Глобальная переменная для хранения выбранного пациента

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

            selectedPatient = null;

            if (patientInfoPanel) patientInfoPanel.style.display = 'none';
            if (noPatientWarning) noPatientWarning.style.display = 'block';
            if (patientHistoryPanel) patientHistoryPanel.style.display = 'none';
            if (noHistoryPanel) noHistoryPanel.style.display = 'block';
        });
    }

    if (searchPatientBtn) {
        searchPatientBtn.addEventListener('click', function() {
            let patientName = document.getElementById('patientName').value.trim();
            let birthDate = document.getElementById('birthDate').value;
            let gender = document.getElementById('gender').value;

            // Нормализация ФИО: убираем лишние пробелы, приводим к одному регистру
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

            if (patientName && birthDate && gender) {
                console.log('[DEBUG] Поиск пациента:', { name: patientName, birthDate, gender });
                // Выполняем поиск пациента по ФИО, дате рождения и полу
                fetch(`${SERVER_BASE_URL}/api/patient-search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: patientName,
                        birthDate: birthDate,
                        gender: gender
                    })
                })
                .then(response => {
                    console.log('[DEBUG] Ответ поиска пациента (raw):', response);
                    if (!response.ok) {
                        throw new Error('Ошибка сервера: ' + response.status);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('[DEBUG] Ответ поиска пациента (json):', data);
                    if (data && data.patient) {
                        selectedPatient = data.patient;

                        // Заполняем поля формы данными из сервера
                        document.getElementById('patientName').value = data.patient.name || '';
                        document.getElementById('birthDate').value = data.patient.birthDate || '';
                        document.getElementById('gender').value = data.patient.gender || 'male';
                        document.getElementById('cardNumber').value = data.patient.cardNumber || '';

                        // Проверяем наличие элементов перед обновлением
                        const patientNameEl = document.querySelector('.patient-name');
                        if (patientNameEl) patientNameEl.textContent = data.patient.name || '';

                        const detailValues = document.querySelectorAll('.patient-detail-value');
                        if (detailValues.length >= 3) {
                            // Преобразуем дату в российский формат
                            let dateStr = data.patient.birthDate;
                            let formattedDate = '';
                            if (dateStr && dateStr.includes('-')) {
                                // YYYY-MM-DD -> DD.MM.YYYY
                                const parts = dateStr.split('-');
                                if (parts.length === 3) {
                                    formattedDate = `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
                                }
                            }
                            detailValues[0].textContent = formattedDate || '';
                            detailValues[1].textContent = data.patient.gender === 'male' ? 'Мужской' : (data.patient.gender === 'female' ? 'Женский' : '');
                            detailValues[2].textContent = data.patient.cardNumber || '';
                        }

                        if (patientInfoPanel) patientInfoPanel.style.display = 'block';
                        if (noPatientWarning) noPatientWarning.style.display = 'none';

                        // Загружаем историю снимков пациента по patientId
                        loadPatientHistory(data.patient.id);

                        // Показываем панель истории
                        if (patientHistoryPanel) patientHistoryPanel.style.display = 'block';
                        if (noHistoryPanel) noHistoryPanel.style.display = 'none';
                    } else {
                        selectedPatient = null;
                        showNotification('Ошибка', 'Пациент не найден', 'error');
                        if (patientInfoPanel) patientInfoPanel.style.display = 'none';
                        if (noPatientWarning) noPatientWarning.style.display = 'block';
                        if (patientHistoryPanel) patientHistoryPanel.style.display = 'none';
                        if (noHistoryPanel) noHistoryPanel.style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('[DEBUG] Ошибка при поиске пациента:', error);
                    selectedPatient = null;
                    showNotification('Ошибка', 'Ошибка при поиске пациента', 'error');
                    if (patientInfoPanel) patientInfoPanel.style.display = 'none';
                    if (noPatientWarning) noPatientWarning.style.display = 'block';
                    if (patientHistoryPanel) patientHistoryPanel.style.display = 'none';
                    if (noHistoryPanel) noHistoryPanel.style.display = 'block';
                });
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

    // Используем выбранного пациента, если он есть
    if (selectedPatient && selectedPatient.id) {
        if (patientInfoPanel) patientInfoPanel.style.display = 'block';
        if (noPatientWarning) noPatientWarning.style.display = 'none';
        if (patientHistoryPanel) patientHistoryPanel.style.display = 'block';
        if (noHistoryPanel) noHistoryPanel.style.display = 'none';

        loadPatientHistory(selectedPatient.id);
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

    patientHistoryPanel.innerHTML = '<div class="loading-history">Загрузка истории...</div>';

    fetch(`${SERVER_BASE_URL}/api/patient-history/${patientId}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.history && data.history.length > 0) {
                renderPatientHistory(data.history);
            } else {
                patientHistoryPanel.innerHTML = '<div class="empty-history">История снимков отсутствует</div>';
            }
        })
        .catch(() => {
            patientHistoryPanel.innerHTML = '<div class="error-history">Ошибка при загрузке истории</div>';
        });
}

// Функция отображения истории снимков пациента
function renderPatientHistory(history) {
    const patientHistoryPanel = document.getElementById('patientHistoryPanel');
    if (!patientHistoryPanel) return;

    let html = '';
    history.slice(0, 3).forEach(item => {
        const date = new Date(item.upload_date);
        const formattedDate = date.toLocaleDateString('ru-RU') + ' ' +
            date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        html += `
        <div class="history-item">
            <div class="history-date">${formattedDate}</div>
            <div class="history-actions">
                <a href="#" class="history-view" data-id="${item.xray_id}" data-file="${item.file_path}">Просмотреть</a>
            </div>
        </div>
        `;
    });

    if (history.length > 3) {
        html += `<div class="show-all-history"><button class="search-btn" id="showAllHistoryBtn">Показать все (${history.length})</button></div>`;
    }

    patientHistoryPanel.innerHTML = html;

    // Обработчик для просмотра снимка (отображение в основной зоне)
    patientHistoryPanel.querySelectorAll('.history-view').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const imageId = this.getAttribute('data-id');
            const filePath = this.getAttribute('data-file');
            showHistoryImageInMainArea(imageId, filePath);
        });
    });

    // Обработчик для "Показать все"
    const showAllBtn = document.getElementById('showAllHistoryBtn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            showAllHistory(history);
        });
    }
}

// Отображение снимка из истории в основной зоне загрузки
function showHistoryImageInMainArea(imageId, filePath) {
    // Собираем абсолютный URL к файлу
    let imageUrl = filePath;
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
        imageUrl = SERVER_BASE_URL + '/' + imageUrl.replace(/^[\\/]+/, '').replace(/\\/g, '/');
    }

    // Скрываем превью и uploadArea
    const uploadArea = document.getElementById('uploadArea');
    const imagePreview = document.getElementById('imagePreview');
    if (uploadArea) uploadArea.style.display = 'none';
    if (imagePreview) imagePreview.style.display = 'none';

    // Показываем снимок в resultsSection (или создаём его)
    let resultsSection = document.getElementById('analysis-results-section');
    if (!resultsSection) {
        resultsSection = document.createElement('div');
        resultsSection.id = 'analysis-results-section';
        resultsSection.className = 'panel';
        const analysisLeft = document.querySelector('.analysis-left');
        if (analysisLeft) {
            analysisLeft.appendChild(resultsSection);
        } else {
            document.body.appendChild(resultsSection);
        }
    }
    resultsSection.style.display = 'block';
    resultsSection.innerHTML = '';

    // Заголовок
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<span>Просмотр снимка (ID: ${imageId})</span>
        <button class="search-btn" id="close-history-image-btn">Закрыть</button>`;

    // Контент
    const content = document.createElement('div');
    content.className = 'panel-content';

    // Проверка наличия изображения
    let imgHtml = '';
    if (imageUrl) {
        imgHtml = `<img src="${imageUrl}" alt="Снимок пациента" style="max-width:100%;max-height:400px;border:1px solid #eee;border-radius:4px;" onerror="this.style.display='none';document.getElementById('no-history-image').style.display='block';">`;
    }
    content.innerHTML = `
        <div style="text-align:center;">
            ${imgHtml}
            <div id="no-history-image" class="no-image" style="display:none;">Не удалось загрузить снимок</div>
        </div>
    `;

    resultsSection.appendChild(header);
    resultsSection.appendChild(content);

    // Кнопка "Закрыть" возвращает к загрузке снимка
    document.getElementById('close-history-image-btn').onclick = function() {
        resultsSection.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (imagePreview) imagePreview.style.display = 'none';
    };
}

// Функция отображения снимка из истории в модальном окне
function showHistoryImageModal(imageId, filePath) {
    // Собираем абсолютный URL к файлу (если нужно, скорректируйте путь)
    let imageUrl = filePath;
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
        // Если путь относительный, добавляем базовый URL
        imageUrl = SERVER_BASE_URL + '/' + imageUrl.replace(/^[\\/]+/, '').replace(/\\/g, '/');
    }

    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.zIndex = 3000;
    modal.innerHTML = `
      <div class="modal-content" style="max-width:600px">
        <span class="close" style="cursor:pointer;float:right;font-size:24px;">&times;</span>
        <h2>Просмотр снимка (ID: ${imageId})</h2>
        <div style="text-align:center;margin:20px 0;">
          <img src="${imageUrl}" alt="Снимок пациента" style="max-width:100%;max-height:400px;border:1px solid #eee;border-radius:4px;">
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close').onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

// Функция отображения всей истории снимков (модальное окно)
function showAllHistory(history) {
    let html = '<div class="history-list">';
    history.forEach(item => {
        const date = new Date(item.created_at || item.upload_date);
        const formattedDate = date.toLocaleDateString('ru-RU');
        html += `
        <div class="history-item">
            <div class="history-date">${formattedDate}</div>
            <div class="history-actions">
                <a href="#" class="history-view" data-id="${item.image_id || item.xray_id}">Просмотреть</a>
            </div>
        </div>
        `;
    });
    html += '</div>';

    // Простое модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Вся история снимков</h2>
        ${html}
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close').onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

// Функция просмотра снимка из истории
function viewHistoricalImage(imageId) {
    showNotification('Информация', `Просмотр исторического снимка с ID: ${imageId}`, 'info');
}

// Генерация HTML для списка истории
function generateHistoryList(history) {
    if(!history || history.length === 0) {
        return '<div class="empty-history">История снимков отсутствует</div>';
    }

    let html = '';

    history.forEach(item => {
        // Используем upload_date из xrays
        const date = new Date(item.upload_date);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
        const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        // pathologies_count может приходить с сервера, если реализовано на бэке
        html += `
        <div class="history-item">
            <div class="history-info">
                <div class="history-date">${formattedDate} ${formattedTime}</div>
                <div class="history-details">Патологий: ${item.pathologies_count !== undefined ? item.pathologies_count : '-'}</div>
            </div>
            <div class="history-actions">
                <a href="#" class="history-view" data-id="${item.xray_id}">Просмотреть</a>
            </div>
        </div>
        `;
    });

    return html;
}