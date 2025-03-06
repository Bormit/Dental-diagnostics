// Переключение вкладок
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

// Выбор зуба
const toothButtons = document.querySelectorAll('.tooth-button');
toothButtons.forEach(button => {
    button.addEventListener('click', function() {
        toothButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Переключение тепловой карты
const heatmapToggle = document.querySelector('.toggle-switch input');
if (heatmapToggle) {
    heatmapToggle.addEventListener('change', function() {
        // Код для переключения отображения тепловой карты
        console.log('Тепловая карта ' + (this.checked ? 'включена' : 'выключена'));
    });
}

// Обработка кнопок повторного анализа
document.querySelector('.btn-primary')?.addEventListener('click', function() {
    alert('Запуск повторного анализа снимка');
});