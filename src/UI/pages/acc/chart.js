// chart.js - отдельный модуль для работы с графиком статистики

// Функция инициализации графика
window.renderDiagnosticsChart = function() {
    console.log("Вызов функции отрисовки графика диагностики");

    const chartContainer = document.getElementById('diagnostics-chart');
    if (!chartContainer) {
        console.error("Контейнер для графика не найден!");
        return;
    }

    // Очищаем контейнер
    chartContainer.innerHTML = '';

    // Настраиваем размеры и стили контейнера
    // Не устанавливаем фиксированную высоту, а используем высоту контейнера
    chartContainer.style.overflowX = 'auto';
    chartContainer.style.overflowY = 'hidden';
    chartContainer.style.position = 'relative';

    // Создаем обертку для горизонтального центрирования содержимого
    const chartWrapper = document.createElement('div');
    chartWrapper.style.minWidth = '100%';
    chartWrapper.style.display = 'flex';
    chartWrapper.style.justifyContent = 'center';
    chartContainer.appendChild(chartWrapper);

    // Получаем данные диагностики из таблицы
    const tableBody = document.getElementById('diagnostics-table-body');
    if (!tableBody || !tableBody.rows || tableBody.rows.length === 0) {
        console.error("Таблица с данными не найдена или пуста");
        chartContainer.innerHTML = '<div class="chart-placeholder">Нет данных для отображения</div>';
        return;
    }

    // Собираем данные из таблицы
    const data = [];
    for (let i = 0; i < tableBody.rows.length; i++) {
        const row = tableBody.rows[i];
        const cells = row.cells;

        if (cells.length >= 4) {
            data.push({
                diagnosis: cells[0].textContent,
                count: parseInt(cells[1].textContent, 10) || 0,
                accuracy: parseInt(cells[2].textContent.replace('%', ''), 10) || 0,
                efficiency: parseInt(cells[3].textContent.replace('%', ''), 10) || 0
            });
        }
    }

    console.log("Собранные данные:", data);

    if (data.length === 0) {
        chartContainer.innerHTML = '<div class="chart-placeholder">Не удалось извлечь данные из таблицы</div>';
        return;
    }

    // Вычисляем размеры на основе контейнера и данных
    // Определяем минимальную ширину для каждой группы
    const itemMinWidth = 200;
    const totalMinWidth = data.length * itemMinWidth;

    // Определяем высоту canvas из высоты родительского контейнера
    // Но не меньше 300px
    const containerHeight = Math.max(300, chartContainer.clientHeight - 40); // 40px для индикатора скролла

    // Создаем canvas с вычисленными размерами
    const canvas = document.createElement('canvas');
    canvas.height = containerHeight;
    canvas.width = Math.max(totalMinWidth, chartContainer.clientWidth);
    chartWrapper.appendChild(canvas);

    // Получаем 2D контекст
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Не удалось получить 2D контекст canvas");
        chartContainer.innerHTML = '<div class="chart-placeholder">Ошибка инициализации графика</div>';
        return;
    }

    // Цвета для графика
    const colors = {
        count: '#e67e22',      // Оранжевый
        accuracy: '#3498db',    // Синий
        efficiency: '#2ecc71'   // Зеленый
    };

    // Отрисовка графика
    renderChart(ctx, data, canvas.width, canvas.height, colors);

    // Добавляем индикатор скролла, если он нужен
    if (canvas.width > chartContainer.clientWidth) {
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'scroll-indicator';
        scrollIndicator.innerHTML = '← <span style="animation: pulse 2s infinite;">Прокрутите для просмотра всей диаграммы</span> →';
        scrollIndicator.style.position = 'absolute';
        scrollIndicator.style.bottom = '0';
        scrollIndicator.style.left = '0';
        scrollIndicator.style.right = '0';
        scrollIndicator.style.textAlign = 'center';
        scrollIndicator.style.padding = '5px';
        scrollIndicator.style.backgroundColor = '#f0f8ff';
        scrollIndicator.style.borderTop = '1px solid #ccc';
        scrollIndicator.style.fontSize = '12px';
        scrollIndicator.style.color = '#0066cc';
        scrollIndicator.style.fontWeight = 'bold';

        chartContainer.appendChild(scrollIndicator);

        // Добавляем стиль анимации, если его еще нет
        if (!document.getElementById('pulse-animation-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation-style';
            style.textContent = `
            @keyframes pulse {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
            }`;
            document.head.appendChild(style);
        }
    }
};

// Функция отрисовки графика
function renderChart(ctx, data, width, height, colors) {
    console.log("Отрисовка графика:", {width, height, dataLength: data.length});

    // Определяем отступы и размеры
    const paddingTop = 50;     // Отступ сверху для легенды
    const paddingBottom = 60;  // Отступ снизу для названий патологий
    const paddingLeft = 60;    // Отступ слева для оси Y
    const paddingRight = 30;   // Отступ справа

    // Вычисляем размеры области графика
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Очистка канваса
    ctx.clearRect(0, 0, width, height);

    // Рисуем оси
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(width - paddingRight, height - paddingBottom);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Горизонтальные линии и метки процентов
    for (let i = 0; i <= 10; i++) {
        const y = paddingTop + (chartHeight - (i * chartHeight / 10));
        const value = i * 10;

        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.strokeStyle = '#eee';
        ctx.stroke();

        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(value + '%', paddingLeft - 8, y);
    }

    // Количество патологий и ширина каждой группы
    const numGroups = data.length;
    const groupSpacing = 60; // Пространство между группами
    const availableWidth = chartWidth - (groupSpacing * (numGroups - 1));
    const groupWidth = availableWidth / numGroups;

    // Параметры баров
    const barWidth = Math.min(60, groupWidth / 4);
    const barSpacing = Math.min(10, barWidth / 5);

    // Отрисовка групп баров
    data.forEach((item, index) => {
        // Вычисляем позицию группы
        const groupX = paddingLeft + index * (groupWidth + groupSpacing);
        const groupCenterX = groupX + groupWidth / 2;

        // Отображаем название патологии горизонтально под осью
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Добавляем текст без наклона и переноса
        ctx.fillText(item.diagnosis, groupCenterX, height - paddingBottom + 10);

        // Вычисляем высоты столбцов
        // ВАЖНО: Здесь не масштабируем количество случаев к процентам
        // Отображаем "сырое" количество как есть, для правильной визуализации
        const countHeight = (item.count / 100) * chartHeight;
        const accuracyHeight = (item.accuracy / 100) * chartHeight;
        const efficiencyHeight = (item.efficiency / 100) * chartHeight;

        // Вычисляем позицию первого бара в группе
        const firstBarX = groupCenterX - (3 * barWidth + 2 * barSpacing) / 2;

        // Бар количества случаев
        ctx.fillStyle = colors.count;
        ctx.fillRect(firstBarX, height - paddingBottom - countHeight, barWidth, countHeight);

        // Бар точности ИИ
        ctx.fillStyle = colors.accuracy;
        ctx.fillRect(firstBarX + barWidth + barSpacing, height - paddingBottom - accuracyHeight, barWidth, accuracyHeight);

        // Бар эффективности
        ctx.fillStyle = colors.efficiency;
        ctx.fillRect(firstBarX + 2 * (barWidth + barSpacing), height - paddingBottom - efficiencyHeight, barWidth, efficiencyHeight);

        // Подписи значений над барами
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Для каждого бара добавляем значение над ним
        ctx.fillText(item.count.toString(), firstBarX + barWidth / 2, height - paddingBottom - countHeight - 5);
        ctx.fillText(item.accuracy + '%', firstBarX + barWidth + barSpacing + barWidth / 2, height - paddingBottom - accuracyHeight - 5);
        ctx.fillText(item.efficiency + '%', firstBarX + 2 * (barWidth + barSpacing) + barWidth / 2, height - paddingBottom - efficiencyHeight - 5);
    });

    // Легенда
    const legendY = 20;
    const legendSpacing = 150;

    // Количество случаев
    ctx.fillStyle = colors.count;
    ctx.fillRect(paddingLeft, legendY, 12, 12);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Количество случаев', paddingLeft + 18, legendY + 6);

    // Точность ИИ
    ctx.fillStyle = colors.accuracy;
    ctx.fillRect(paddingLeft + legendSpacing, legendY, 12, 12);
    ctx.fillStyle = '#333';
    ctx.fillText('Точность ИИ', paddingLeft + legendSpacing + 18, legendY + 6);

    // Эффективность
    ctx.fillStyle = colors.efficiency;
    ctx.fillRect(paddingLeft + 2 * legendSpacing, legendY, 12, 12);
    ctx.fillStyle = '#333';
    ctx.fillText('Эффективность лечения', paddingLeft + 2 * legendSpacing + 18, legendY + 6);
}

// Функция обновления графика при изменении размеров окна
window.updateChartOnResize = function() {
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            window.renderDiagnosticsChart();
        }, 300);
    });
};

// Автоинициализация при загрузке скрипта
document.addEventListener('DOMContentLoaded', function() {
    console.log("chart.js загружен, устанавливаем обработчик изменения размера окна");
    window.updateChartOnResize();
});