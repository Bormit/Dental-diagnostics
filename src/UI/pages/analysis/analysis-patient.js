window.selectedPatient = null; // Глобальная переменная для хранения выбранного пациента

document.addEventListener('DOMContentLoaded', function() {
    // Управление информацией о пациенте
    const clearPatientBtn = document.getElementById('clearPatientBtn');
    const searchPatientBtn = document.getElementById('searchPatientBtn');
    const patientInfoPanel = document.getElementById('patientInfoPanel');
    const noPatientWarning = document.getElementById('noPatientWarning');
    const patientHistoryPanel = document.getElementById('patientHistoryPanel');
    const noHistoryPanel = document.getElementById('noHistoryPanel');

    // --- Автозаполнение из localStorage (если переход с карточки пациента) ---
    const lsName = localStorage.getItem('analysis_patient_name');
    const lsCard = localStorage.getItem('analysis_patient_card');
    const lsDob = localStorage.getItem('analysis_patient_dob');
    const lsGender = localStorage.getItem('analysis_patient_gender');
    if (lsName || lsCard || lsDob || lsGender) {
        if (lsName) document.getElementById('patientName').value = lsName;
        if (lsCard) document.getElementById('cardNumber').value = lsCard;
        if (lsDob) {
            // Преобразуем дату в формат yyyy-mm-dd для input[type=date]
            let dob = lsDob;
            if (/^\d{2}\.\d{2}\.\d{4}$/.test(dob)) {
                // DD.MM.YYYY -> YYYY-MM-DD
                const [d, m, y] = dob.split('.');
                document.getElementById('birthDate').value = `${y}-${m}-${d}`;
            } else {
                document.getElementById('birthDate').value = dob;
            }
        }
        // Устанавливаем пол, если был передан
        if (lsGender && (lsGender === 'male' || lsGender === 'female')) {
            document.getElementById('gender').value = lsGender;
        } else {
            document.getElementById('gender').value = 'male';
        }

        // Сбросим значения в localStorage, чтобы не мешали при следующих переходах
        localStorage.removeItem('analysis_patient_name');
        localStorage.removeItem('analysis_patient_card');
        localStorage.removeItem('analysis_patient_dob');
        localStorage.removeItem('analysis_patient_gender');

        // --- Автоматически инициируем выбор пациента ---
        // Если есть ФИО, дата рождения и пол, инициируем поиск
        const patientName = document.getElementById('patientName').value.trim();
        const birthDate = document.getElementById('birthDate').value;
        const gender = document.getElementById('gender').value;
        if (patientName && birthDate && gender) {
            // Триггерим клик по кнопке поиска пациента
            if (typeof document.getElementById('searchPatientBtn').click === 'function') {
                setTimeout(() => {
                    document.getElementById('searchPatientBtn').click();
                }, 100);
            }
        }
    }

    // --- Автозаполнение пациента по patient_id из URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const patientIdFromUrl = urlParams.get('patient_id');
    if (patientIdFromUrl) {
        fetch(`${SERVER_BASE_URL}/api/patient-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardNumber: patientIdFromUrl })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.patient) {
                selectedPatient = data.patient;
                document.getElementById('patientName').value = data.patient.name || '';
                document.getElementById('birthDate').value = data.patient.birthDate || '';
                document.getElementById('gender').value = data.patient.gender || 'male';
                document.getElementById('cardNumber').value = data.patient.cardNumber || '';

                // --- Добавлено: обновление patientInfoPanel ---
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

                loadPatientHistory(data.patient.id);

                if (patientHistoryPanel) patientHistoryPanel.style.display = 'block';
                if (noHistoryPanel) noHistoryPanel.style.display = 'none';

                const resultsSection = document.getElementById('analysis-results-section');
                if (resultsSection) {
                    resultsSection.style.display = 'none';
                    resultsSection.innerHTML = '';
                }
            }
        });
    }

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

            // Очищаем результаты анализа
            const resultsSection = document.getElementById('analysis-results-section');
            if (resultsSection) {
                resultsSection.style.display = 'none';
                resultsSection.innerHTML = '';
            }
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

                        // Очищаем результаты анализа при выборе другого пациента
                        const resultsSection = document.getElementById('analysis-results-section');
                        if (resultsSection) {
                            resultsSection.style.display = 'none';
                            resultsSection.innerHTML = '';
                        }
                    } else {
                        selectedPatient = null;
                        showNotification('Ошибка', 'Пациент не найден', 'error');
                        if (patientInfoPanel) patientInfoPanel.style.display = 'none';
                        if (noPatientWarning) noPatientWarning.style.display = 'block';
                        if (patientHistoryPanel) patientHistoryPanel.style.display = 'none';
                        if (noHistoryPanel) noHistoryPanel.style.display = 'block';

                        // Очищаем результаты анализа если пациент не найден
                        const resultsSection = document.getElementById('analysis-results-section');
                        if (resultsSection) {
                            resultsSection.style.display = 'none';
                            resultsSection.innerHTML = '';
                        }
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

                    // Очищаем результаты анализа при ошибке поиска
                    const resultsSection = document.getElementById('analysis-results-section');
                    if (resultsSection) {
                        resultsSection.style.display = 'none';
                        resultsSection.innerHTML = '';
                    }
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

    // Группируем по analysis_id (только уникальные анализы)
    const uniqueAnalyses = {};
    history.forEach(item => {
        if (item.analysis_id && !uniqueAnalyses[item.analysis_id]) {
            uniqueAnalyses[item.analysis_id] = item;
        }
    });

    const analysesArr = Object.values(uniqueAnalyses);

    // Если нет истории, показываем сообщение
    if (analysesArr.length === 0) {
        patientHistoryPanel.innerHTML = '<div class="empty-history">История снимков отсутствует</div>';
        return;
    }

    let html = '';
    analysesArr.slice(0, 3).forEach(item => {
        let formattedDate = '-';
        if (item.upload_date && item.upload_date !== 'null' && item.upload_date !== '') {
            const date = new Date(item.upload_date);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('ru-RU') + ' ' +
                    date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
        }
        // Добавим отладку для analysis_id
        html += `
        <div class="history-item">
            <div class="history-date">${formattedDate}</div>
            <div class="history-actions">
                <a href="#" class="history-view" data-id="${item.analysis_id}" 
                   data-diagnosis="${encodeURIComponent(item.diagnosis_text || '')}"
                   data-plan="${encodeURIComponent(item.treatment_plan || '')}"
                   onclick="console.log('[DEBUG] Клик по Просмотреть, analysis_id:', '${item.analysis_id}')">Просмотреть</a>
            </div>
        </div>
        `;
    });

    if (analysesArr.length > 3) {
        html += `<div class="show-all-history"><button class="search-btn" id="showAllHistoryBtn">Показать все (${analysesArr.length})</button></div>`;
    }

    patientHistoryPanel.innerHTML = html;

    // Обработчик для просмотра снимка (открытие модального окна)
    patientHistoryPanel.querySelectorAll('.history-view').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const analysisId = this.getAttribute('data-id');
            const diagnosisText = decodeURIComponent(this.getAttribute('data-diagnosis') || '');
            const treatmentPlan = decodeURIComponent(this.getAttribute('data-plan') || '');
            console.log('[DEBUG] Клик по Просмотреть, analysisId:', analysisId);
            if (analysisId && analysisId !== 'undefined' && analysisId !== 'null') {
                showHistoryImageModal(analysisId, diagnosisText, treatmentPlan);
            } else {
                showNotification('Ошибка', 'Некорректный идентификатор снимка', 'error');
            }
        });
    });

    // Обработчик для "Показать все"
    const showAllBtn = document.getElementById('showAllHistoryBtn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            showAllHistory(analysesArr);
        });
    }
}

// Модальное окно для просмотра снимка и патологий из истории
function showHistoryImageModal(analysisId, diagnosisText, treatmentPlan) {
    console.log('[DEBUG] showHistoryImageModal called with analysisId:', analysisId);
    fetch(`${SERVER_BASE_URL}/api/analysis-result/${analysisId}`)
        .then(response => {
            console.log('[DEBUG] /api/analysis-result response:', response);
            return response.json();
        })
        .then(data => {
            console.log('[DEBUG] /api/analysis-result data:', data);

            // Визуализация
            let imageHtml = '';
            if (data.visualization_url) {
                console.log('[DEBUG] visualization_url:', data.visualization_url);
                imageHtml = `<img src="${data.visualization_url}" alt="Снимок пациента" style="display:block;max-width:95vw;max-height:60vh;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.5);background:#fff;margin-bottom:20px;" onerror="console.log('[DEBUG] Ошибка загрузки изображения:', this.src); this.style.display='none';">`;
            } else {
                console.log('[DEBUG] Нет visualization_url');
                imageHtml = `<div class="no-image" style="margin-bottom:20px;">Визуализация недоступна</div>`;
            }

            // Патологии
            let pathologiesHtml = '';
            if (data.regions && data.regions.length > 0) {
                console.log('[DEBUG] regions:', data.regions);
                pathologiesHtml = '<div class="pathologies-list">' + generateDentalChart(data.regions) + '</div>';
            } else {
                console.log('[DEBUG] regions пустой или отсутствует');
                pathologiesHtml = '<div class="no-pathologies">Патологии не обнаружены</div>';
            }

            // Заключение и план лечения
            let conclusionHtml = '';
            if (diagnosisText || treatmentPlan) {
                conclusionHtml = `
                  <div style="margin-top:20px;">
                    <h3 style="margin-bottom:8px;">Заключение врача</h3>
                    <div style="background:#f9f9f9;padding:10px 12px;border-radius:5px;margin-bottom:10px;white-space:pre-line;">${diagnosisText ? diagnosisText : '<span style="color:#aaa;">Нет заключения</span>'}</div>
                    <h3 style="margin-bottom:8px;">Рекомендации</h3>
                    <div style="background:#f9f9f9;padding:10px 12px;border-radius:5px;white-space:pre-line;">${treatmentPlan ? treatmentPlan : '<span style="color:#aaa;">Нет рекомендаций</span>'}</div>
                  </div>
                `;
            }

            // Создаем модальное окно
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.8)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = 9999;

            modal.innerHTML = `
              <div class="modal-content" style="background:#fff;max-width:700px;max-height:90vh;overflow-y:auto;position:relative;padding:32px 24px 24px 24px;border-radius:8px;">
                <span class="close" style="position:absolute;top:10px;right:20px;cursor:pointer;font-size:32px;color:#333;z-index:2;">&times;</span>
                <h2 style="margin-bottom:20px;">Просмотр снимка (ID: ${analysisId})</h2>
                ${imageHtml}
                <h3 style="margin-bottom:10px;">Обнаруженные патологии</h3>
                ${pathologiesHtml}
                ${conclusionHtml}
              </div>
            `;
            document.body.appendChild(modal);

            // Закрытие по крестику
            modal.querySelector('.close').onclick = () => modal.remove();
            // Закрытие по клику вне модального окна
            modal.onclick = e => {
                if (e.target === modal) modal.remove();
            };
        })
        .catch((err) => {
            console.error('[DEBUG] Ошибка при получении анализа:', err);
            showNotification('Ошибка', 'Не удалось загрузить результаты анализа', 'error');
        });
}

// Функция отображения всей истории снимков (модальное окно)
function showAllHistory(history) {
    // Группируем по analysis_id (только уникальные анализы)
    const uniqueAnalyses = {};
    history.forEach(item => {
        if (item.analysis_id && !uniqueAnalyses[item.analysis_id]) {
            uniqueAnalyses[item.analysis_id] = item;
        }
    });
    const analysesArr = Object.values(uniqueAnalyses);

    let html = '<div class="history-list">';
    analysesArr.forEach(item => {
        let formattedDate = '-';
        if (item.upload_date && item.upload_date !== 'null' && item.upload_date !== '') {
            const date = new Date(item.upload_date);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('ru-RU') + ' ' +
                    date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
        }
        html += `
        <div class="history-item">
            <div class="history-date">${formattedDate}</div>
            <div class="history-actions">
                <a href="#" class="history-view" 
                   data-id="${item.analysis_id}" 
                   data-diagnosis="${encodeURIComponent(item.diagnosis_text || '')}"
                   data-plan="${encodeURIComponent(item.treatment_plan || '')}"
                >Просмотреть</a>
            </div>
        </div>
        `;
    });
    html += '</div>';

    // Простое модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 9999;

    modal.innerHTML = `
      <div class="modal-content" style="background:#fff;max-width:600px;max-height:90vh;overflow-y:auto;position:relative;padding:32px 24px 24px 24px;border-radius:8px;">
        <span class="close" style="position:absolute;top:10px;right:20px;cursor:pointer;font-size:32px;color:#333;z-index:2;">&times;</span>
        <h2 style="margin-bottom:20px;">Вся история снимков</h2>
        ${html}
      </div>
    `;
    document.body.appendChild(modal);

    // Закрытие по крестику
    modal.querySelector('.close').onclick = () => modal.remove();
    // Закрытие по клику вне модального окна
    modal.onclick = e => {
        if (e.target === modal) modal.remove();
    };

    // Обработчик для просмотра снимка (открытие модального окна)
    modal.querySelectorAll('.history-view').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const analysisId = this.getAttribute('data-id');
            const diagnosisText = decodeURIComponent(this.getAttribute('data-diagnosis') || '');
            const treatmentPlan = decodeURIComponent(this.getAttribute('data-plan') || '');
            if (analysisId && analysisId !== 'undefined' && analysisId !== 'null') {
                showHistoryImageModal(analysisId, diagnosisText, treatmentPlan);
            } else {
                showNotification('Ошибка', 'Некорректный идентификатор снимка', 'error');
            }
        });
    });
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