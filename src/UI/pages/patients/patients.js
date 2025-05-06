// Переключение отображения панели фильтров
const filterBtn = document.getElementById('filterBtn');
const filterPanel = document.getElementById('filterPanel');

if (filterBtn && filterPanel) {
    filterBtn.addEventListener('click', function() {
        filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
    });
}

// Модальное окно добавления пациента
const addPatientBtn = document.getElementById('addPatientBtn');
const addPatientModal = document.getElementById('addPatientModal');
const closeModalBtn = document.getElementById('closeModalBtn');

if (addPatientBtn && addPatientModal) {
    addPatientBtn.addEventListener('click', function() {
        addPatientModal.style.display = 'flex';
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            addPatientModal.style.display = 'none';
        });
    }

    window.addEventListener('click', function(event) {
        if (event.target === addPatientModal) {
            addPatientModal.style.display = 'none';
        }
    });
}

// Обработчики для кнопок действий
document.querySelectorAll('.action-button.view').forEach(button => {
    button.addEventListener('click', function() {
        const patientName = this.closest('tr').querySelector('.patient-name').textContent;
        alert(`Просмотр карточки пациента: ${patientName}`);
    });
});

document.querySelectorAll('.action-button.diagnose').forEach(button => {
    button.addEventListener('click', function() {
        const patientName = this.closest('tr').querySelector('.patient-name').textContent;
        alert(`Переход к диагностике пациента: ${patientName}`);
    });
});

// Пагинация
document.querySelectorAll('.pagination-button').forEach(button => {
    button.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            document.querySelector('.pagination-button.active')?.classList.remove('active');
            this.classList.add('active');
            // Здесь был бы код для загрузки соответствующей страницы данных
        }
    });
});