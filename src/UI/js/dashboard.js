// Простая имитация загрузки файла
document.querySelector('.upload-zone')?.addEventListener('click', function() {
    alert('В реальной системе здесь будет открыто окно выбора файла');
});

// Имитация переключения даты
document.querySelectorAll('.calendar-arrow').forEach(arrow => {
    arrow.addEventListener('click', function() {
        alert('В реальной системе здесь будет изменена дата');
    });
});

// Имитация начала приема
document.querySelectorAll('.patient-actions button').forEach(button => {
    button.addEventListener('click', function() {
        alert('В реальной системе здесь будет начат прием пациента');
    });
});