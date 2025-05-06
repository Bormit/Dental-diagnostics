// Глобальные переменные для хранения результатов анализа и ID изображения
let analysisResults = null;
let currentImageId = null;
const SERVER_BASE_URL = 'http://localhost:8000'; // Определена в глобальной области видимости

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация элементов загрузки файла
    initFileUpload();

    // Проверка статуса сервера
    checkServerStatus();
});

// Инициализация области загрузки файла
function initFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const analyzeBtn = document.getElementById('analyzeBtn');

    // Обработка клика по области загрузки
    if(uploadArea) {
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });

        // Обработка перетаскивания файлов
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            if(e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });
    }

    // Обработка выбора файла
    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
            if(e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    // Обработка нажатия на кнопку анализа
    if(analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            analyzeImage();
        });
    }
}

// Функция обработки выбора файла
function handleFileSelect(file) {
    const uploadArea = document.getElementById('uploadArea');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');

    // Проверяем тип файла
    const fileType = file.type;
    const validImageTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'application/dicom'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.dcm'];

    let isValid = validImageTypes.includes(fileType);

    // Проверяем расширение для файлов без типа (например, .dcm)
    if(!isValid) {
        const fileName = file.name.toLowerCase();
        isValid = validExtensions.some(ext => fileName.endsWith(ext));
    }

    if(!isValid) {
        showNotification('Ошибка', 'Пожалуйста, выберите изображение в формате JPG, PNG, BMP, TIFF или DICOM', 'error');
        return;
    }

    // Отображаем превью изображения
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        uploadArea.style.display = 'none';
        imagePreview.style.display = 'block';

        // Скрываем секцию результатов, если она была видна
        const resultsSection = document.getElementById('analysis-results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// Функция анализа изображения
function analyzeImage() {
    const fileInput = document.getElementById('fileInput');

    if(!fileInput.files || fileInput.files.length === 0) {
        showNotification('Ошибка', 'Пожалуйста, выберите файл снимка', 'error');
        return;
    }

    // Проверяем, выбран ли пациент (иначе сервер вернет 422)
    if (!window.selectedPatient || !window.selectedPatient.id) {
        hideLoader();
        showNotification('Ошибка', 'Пожалуйста, выберите пациента перед анализом снимка', 'error');
        return;
    }

    // Показываем индикатор загрузки
    showLoader('Анализ снимка...');

    // Создаем объект FormData для отправки файла
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('visualization', 'true');

    // Добавляем информацию о пациенте, если она есть
    const patientName = document.getElementById('patientName').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();

    // Используем selectedPatient, если он есть
    if (window.selectedPatient && window.selectedPatient.id) {
        formData.append('patient_id', window.selectedPatient.id);
    } else if (cardNumber) {
        formData.append('card_number', cardNumber);
    }
    if (patientName) {
        formData.append('patient_name', patientName);
    }

    // Получаем токен из localStorage (или другого места, где вы его храните)
    const token = localStorage.getItem('access_token');

    // Отправляем запрос на сервер
    fetch(SERVER_BASE_URL + '/api/analyze', {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': 'Bearer ' + token } : undefined
    })
        .then(response => {
            if (response.status === 401) {
                hideLoader();
                showNotification('Ошибка', 'Необходима авторизация. Пожалуйста, войдите в систему.', 'error');
                throw new Error('Необходима авторизация');
            }
            if (response.status === 422) {
                hideLoader();
                showNotification('Ошибка', 'Пожалуйста, выберите пациента и заполните все обязательные поля.', 'error');
                throw new Error('Некорректные данные запроса');
            }
            if(!response.ok) {
                throw new Error('Ошибка сервера: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            // Скрываем индикатор загрузки
            hideLoader();

            // Отладочная информация
            console.log('Ответ сервера:', data);
            console.log('URL визуализации до обработки:', data.visualization_url);

            // Сохраняем результаты и ID изображения
            analysisResults = data;
            currentImageId = data.metadata.file_name;

            // Добавляем базовый URL сервера к пути изображения, если нужно
            if(data.visualization_url && !data.visualization_url.startsWith('http')) {
                data.visualization_url = SERVER_BASE_URL + data.visualization_url;
                console.log('URL визуализации после обработки:', data.visualization_url);
            }

            // Отображаем результаты
            showResults(data);

            // --- ДОБАВЛЕНО: обновить историю снимков пациента ---
            if (window.selectedPatient && window.selectedPatient.id && typeof window.loadPatientHistory === 'function') {
                window.loadPatientHistory(window.selectedPatient.id);
            }
        })
        .catch(error => {
            hideLoader();
            showNotification('Ошибка', 'Ошибка при анализе снимка: ' + error.message, 'error');
            console.error('Ошибка:', error);
        });
}

// Функция отображения результатов анализа
function showResults(data) {
    console.log('Показываем результаты, URL изображения:', data.visualization_url);

    // Скрываем область загрузки файла
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.style.display = 'none';
    }

    // Скрываем предварительный просмотр изображения
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }

    // Создаем или обновляем секцию с результатами
    let resultsSection = document.getElementById('analysis-results-section');

    if (!resultsSection) {
        // Если секции нет, создаем новую
        resultsSection = document.createElement('div');
        resultsSection.id = 'analysis-results-section';
        resultsSection.className = 'panel';

        // Добавляем секцию в анализ-контейнер
        const analysisLeft = document.querySelector('.analysis-left');
        if (analysisLeft) {
            analysisLeft.appendChild(resultsSection);
        } else {
            // Если нет контейнера, добавляем после кнопки анализа
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn && analyzeBtn.parentNode) {
                analyzeBtn.parentNode.parentNode.appendChild(resultsSection);
            } else {
                // Запасной вариант - добавляем в main-content
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.appendChild(resultsSection);
                } else {
                    // Крайний случай - добавляем в body
                    document.body.appendChild(resultsSection);
                }
            }
        }
    }

    // Очищаем существующую секцию
    resultsSection.innerHTML = '';

    // Создаем заголовок секции
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<span>Результаты анализа</span>' +
        '<button class="search-btn" id="reanalyze-btn">Повторный анализ</button>';

    // Создаем содержимое секции
    const content = document.createElement('div');
    content.className = 'panel-content';

    // Создаем контейнер для результатов
    const resultsContainer = document.createElement('div');
    resultsContainer.style.display = 'flex';
    resultsContainer.style.flexWrap = 'wrap';
    resultsContainer.style.gap = '20px';

    // Добавляем изображение визуализации
    const imageContainer = document.createElement('div');
    imageContainer.style.flex = '1';
    imageContainer.style.minWidth = '300px';
    imageContainer.style.textAlign = 'center';

    if (data.visualization_url) {
        const image = document.createElement('img');
        image.src = data.visualization_url;
        image.alt = 'Визуализация результатов';
        image.style.maxWidth = '100%';
        image.style.borderRadius = '4px';
        image.style.border = '1px solid #eee';

        // Обработка ошибки загрузки изображения
        image.onerror = function() {
            this.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23f8f9fa%22%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20fill%3D%22%23999%22%3E%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%20%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B8%20%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%3C%2Ftext%3E%3C%2Fsvg%3E';
            this.alt = 'Ошибка загрузки изображения';
        };

        imageContainer.appendChild(image);
    } else {
        const noImage = document.createElement('div');
        noImage.textContent = 'Визуализация недоступна';
        noImage.style.padding = '30px';
        noImage.style.backgroundColor = '#f8f9fa';
        noImage.style.border = '1px dashed #ddd';
        noImage.style.borderRadius = '4px';
        noImage.style.color = '#666';
        imageContainer.appendChild(noImage);
    }

    // Создаем блок для информации о результатах
    const resultsInfo = document.createElement('div');
    resultsInfo.style.flex = '1';
    resultsInfo.style.minWidth = '300px';

    // Блок с вкладками
    const tabs = document.createElement('div');
    tabs.className = 'results-tabs';
    tabs.innerHTML = '<div class="tab active" data-tab="pathologies">Патологии</div>' +
        '<div class="tab" data-tab="conclusion">Заключение</div>';

    // Контент вкладок
    const tabContents = document.createElement('div');
    tabContents.className = 'tab-contents';

    // Вкладка с патологиями
    const pathologiesTab = document.createElement('div');
    pathologiesTab.id = 'pathologies-tab';
    pathologiesTab.className = 'tab-content active';

    const pathologiesTitle = document.createElement('h3');
    pathologiesTitle.textContent = 'Обнаруженные патологии:';
    pathologiesTitle.style.marginBottom = '10px';

    const pathologiesList = document.createElement('div');
    pathologiesList.className = 'pathologies-list';
    pathologiesList.innerHTML = generateDentalChart(data.results.regions);

    const additionalInfo = document.createElement('div');
    additionalInfo.className = 'results-info';
    additionalInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">Время анализа:</span>
            <span class="info-value">${data.metadata.analysis_time.toFixed(2)} сек</span>
        </div>
        <div class="info-item">
            <span class="info-label">Размер снимка:</span>
            <span class="info-value">${data.metadata.image_size[1]} x ${data.metadata.image_size[0]}</span>
        </div>
    `;

    pathologiesTab.appendChild(pathologiesTitle);
    pathologiesTab.appendChild(pathologiesList);
    pathologiesTab.appendChild(additionalInfo);

    // Вкладка с заключением
    const conclusionTab = document.createElement('div');
    conclusionTab.id = 'conclusion-tab';
    conclusionTab.className = 'tab-content';
    conclusionTab.style.display = 'none';

    conclusionTab.innerHTML = `
        <h3>Заключение врача:</h3>
        <textarea id="doctor-conclusion" class="doctor-input" placeholder="Введите заключение..."></textarea>
        
        <h3>Рекомендации:</h3>
        <textarea id="doctor-recommendations" class="doctor-input" placeholder="Введите рекомендации..."></textarea>
        
        <div class="results-actions">
            <button id="save-conclusion-btn" class="btn-primary">Сохранить заключение</button>
            <button id="print-results-btn" class="btn-secondary">Печать</button>
        </div>
    `;

    // Добавляем вкладки в контейнер
    tabContents.appendChild(pathologiesTab);
    tabContents.appendChild(conclusionTab);

    // Собираем блок с информацией
    resultsInfo.appendChild(tabs);
    resultsInfo.appendChild(tabContents);

    // Добавляем все в контейнер результатов
    resultsContainer.appendChild(imageContainer);
    resultsContainer.appendChild(resultsInfo);

    // Добавляем контейнер в содержимое секции
    content.appendChild(resultsContainer);

    // Собираем секцию целиком
    resultsSection.appendChild(header);
    resultsSection.appendChild(content);

    // Отображаем секцию
    resultsSection.style.display = 'block';

    // Добавляем обработчики событий

    // Обработчик повторного анализа
    document.getElementById('reanalyze-btn').addEventListener('click', function() {
        if (uploadArea) uploadArea.style.display = 'block';
        if (imagePreview) imagePreview.style.display = 'none';
        resultsSection.style.display = 'none';
    });

    // Обработчик переключения вкладок
    const tabButtons = document.querySelectorAll('.results-tabs .tab');
    tabButtons.forEach(tab => {
        tab.addEventListener('click', function() {
            // Убираем активный класс со всех вкладок
            tabButtons.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей вкладке
            this.classList.add('active');

            // Скрываем все контенты вкладок
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });

            // Показываем нужный контент
            const tabName = this.getAttribute('data-tab');
            document.getElementById(tabName + '-tab').style.display = 'block';
        });
    });

    // Обработчик сохранения заключения
    document.getElementById('save-conclusion-btn').addEventListener('click', function() {
        saveConclusion();
    });

    // Обработчик печати
    document.getElementById('print-results-btn').addEventListener('click', function() {
        printResults();
    });

    console.log('Результаты анализа успешно добавлены на страницу');
}

// Генерация HTML для списка патологий
function generateDentalChart(regions) {
    if(!regions || regions.length === 0) {
        return '<div class="no-pathologies">Патологии не обнаружены</div>';
    }

    // Группируем патологии по типу для устранения дубликатов
    const groupedPathologies = {};
    regions.forEach(region => {
        const classId = region.class_id;
        if (!groupedPathologies[classId]) {
            groupedPathologies[classId] = {
                class_id: classId,
                class_name: region.class_name,
                count: 0,
                highest_probability: 0
            };
        }
        groupedPathologies[classId].count++;
        groupedPathologies[classId].highest_probability = Math.max(
            groupedPathologies[classId].highest_probability,
            region.probability
        );
    });

    // Отображаем сгруппированные патологии
    let html = '';
    Object.values(groupedPathologies).forEach(pathology => {
        const isRare = pathology.class_id === 3 || pathology.class_id === 4;
        const rareIcon = isRare ? '★ ' : '';
        const rareClass = isRare ? 'rare-pathology' : '';
        html += `
        <div class="pathology-item ${rareClass}">
            <div class="pathology-name">${rareIcon}${pathology.class_name} (${pathology.count} шт.)</div>
            <div class="pathology-probability">
                <div class="probability-bar">
                    <div class="probability-fill" style="width: ${pathology.highest_probability * 100}%"></div>
                </div>
                <div class="probability-value">до ${(pathology.highest_probability * 100).toFixed(1)}%</div>
            </div>
        </div>
        `;
    });

    return html;
}

// Функция сохранения заключения
function saveConclusion() {
    const conclusion = document.getElementById('doctor-conclusion').value.trim();
    const recommendations = document.getElementById('doctor-recommendations').value.trim();

    if(!conclusion) {
        showNotification('Ошибка', 'Пожалуйста, введите заключение', 'error');
        return;
    }

    // Используем selectedPatient, если он есть
    let patientId = '';
    if (window.selectedPatient && window.selectedPatient.id) {
        patientId = window.selectedPatient.id;
    } else {
        patientId = document.getElementById('cardNumber').value.trim() || 'unknown';
    }

    // Показываем индикатор загрузки
    showLoader('Сохранение заключения...');

    // Подготавливаем данные для отправки
    const conclusionData = {
        patient_id: patientId,
        image_id: currentImageId,
        conclusion: conclusion,
        recommendations: recommendations,
        pathologies: analysisResults.results.regions
    };

    // Отправляем запрос на сервер
    fetch(SERVER_BASE_URL + '/api/save-conclusion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(conclusionData)
    })
        .then(response => {
            if(!response.ok) {
                throw new Error('Ошибка сервера: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            hideLoader();
            showNotification('Успех', 'Заключение успешно сохранено', 'success');
        })
        .catch(error => {
            hideLoader();
            showNotification('Ошибка', 'Ошибка при сохранении заключения: ' + error.message, 'error');
            console.error('Ошибка:', error);
        });
}

// Функция печати результатов
function printResults() {
    // Создаем версию для печати
    const printWindow = window.open('', '_blank');

    const patientName = document.getElementById('patientName').value.trim() || 'Пациент не выбран';
    const cardNumber = document.getElementById('cardNumber').value.trim() || '-';

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Результаты анализа - ${patientName}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
            .pathology-item { margin-bottom: 10px; padding: 5px; border: 1px solid #eee; }
            .pathology-name { font-weight: bold; }
            .result-image { max-width: 100%; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .doctor-input { margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Результаты анализа рентгеновского снимка</h1>
            <p>Пациент: ${patientName}</p>
            <p>Карта №: ${cardNumber}</p>
            <p>Дата: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
            <h2>Визуализация результатов</h2>
            <img class="result-image" src="${analysisResults.visualization_url}" alt="Визуализация результатов" onerror="this.alt='Ошибка загрузки изображения'; this.style.display='none';">
        </div>
        
        <div class="section">
            <h2>Обнаруженные патологии</h2>
            <div class="pathologies-list">
                ${generatePathologiesListForPrint(analysisResults.results.regions)}
            </div>
        </div>
        
        <div class="section">
            <h2>Заключение врача</h2>
            <div class="doctor-input">${document.getElementById('doctor-conclusion').value || 'Заключение не предоставлено'}</div>
        </div>
        
        <div class="section">
            <h2>Рекомендации</h2>
            <div class="doctor-input">${document.getElementById('doctor-recommendations').value || 'Рекомендации не предоставлены'}</div>
        </div>
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Запускаем печать после загрузки изображения
    const img = printWindow.document.querySelector('.result-image');
    if (img) {
        img.onload = function() {
            printWindow.print();
        };

        // Если изображение не загрузится за 3 секунды, все равно печатаем
        setTimeout(function() {
            printWindow.print();
        }, 3000);
    } else {
        printWindow.print();
    }
}

// Генерация HTML для списка патологий для печати
// Обновите функцию generatePathologiesListForPrint

function generatePathologiesListForPrint(regions) {
    if(!regions || regions.length === 0) {
        return '<p>Патологии не обнаружены</p>';
    }

    // Группируем патологии по типу для устранения дубликатов
    const groupedPathologies = {};
    regions.forEach(region => {
        const classId = region.class_id;
        if (!groupedPathologies[classId]) {
            groupedPathologies[classId] = {
                class_id: classId,
                class_name: region.class_name,
                count: 0,
                highest_probability: 0
            };
        }

        groupedPathologies[classId].count++;
        groupedPathologies[classId].highest_probability = Math.max(
            groupedPathologies[classId].highest_probability,
            region.probability
        );
    });

    // Отображаем сгруппированные патологии
    let html = '';
    Object.values(groupedPathologies).forEach(pathology => {
        const isRare = pathology.class_id === 3 || pathology.class_id === 4;
        const rareIcon = isRare ? '★ ' : '';

        html += `
        <div class="pathology-item">
            <div class="pathology-name">${rareIcon}${pathology.class_name} (${pathology.count} шт.)</div>
            <div class="pathology-probability">Максимальная вероятность: ${(pathology.highest_probability * 100).toFixed(1)}%</div>
        </div>
        `;
    });

    return html;
}

// Функция отображения индикатора загрузки
function showLoader(message) {
    // Создаем элемент индикатора, если его нет
    if(!document.getElementById('loader')) {
        const loader = document.createElement('div');
        loader.id = 'loader';
        loader.className = 'loader-overlay';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-message"></div>
            </div>
        `;
        document.body.appendChild(loader);
    }

    // Обновляем сообщение и показываем индикатор
    document.querySelector('#loader .loader-message').textContent = message || 'Загрузка...';
    document.getElementById('loader').style.display = 'flex';
}

// Функция скрытия индикатора загрузки
function hideLoader() {
    const loader = document.getElementById('loader');
    if(loader) {
        loader.style.display = 'none';
    }
}

// Функция проверки статуса сервера
function checkServerStatus() {
    fetch(SERVER_BASE_URL + '/api/status')
        .then(response => response.json())
        .then(data => {
            if(data.status === 'ok') {
                console.log('Сервер доступен:', data);
            } else {
                showNotification('Предупреждение', 'Сервер недоступен или работает с ошибками', 'warning');
            }
        })
        .catch(error => {
            console.error('Ошибка при проверке статуса сервера:', error);
            showNotification('Ошибка', 'Не удалось подключиться к серверу. Пожалуйста, проверьте соединение.', 'error');
        });
}

// Функция отображения уведомлений
function showNotification(title, message, type) {
    // Создаем элемент уведомления, если его нет
    if(!document.getElementById('notification')) {
        const notification = document.createElement('div');
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

        // Обработчик закрытия уведомления
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.classList.remove('show');
        });
    }

    const notification = document.getElementById('notification');
    notification.className = 'notification ' + (type || 'info');
    notification.querySelector('.notification-title').textContent = title;
    notification.querySelector('.notification-message').textContent = message;

    // Показываем уведомление
    notification.classList.add('show');

    // Автоматически скрываем через 5 секунд
    setTimeout(function() {
        notification.classList.remove('show');
    }, 5000);
}