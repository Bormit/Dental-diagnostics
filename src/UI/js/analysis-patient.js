document.addEventListener('DOMContentLoaded', function() {
    // Управление информацией о пациенте
    const clearPatientBtn = document.getElementById('clearPatientBtn');
    const searchPatientBtn = document.getElementById('searchPatientBtn');
    const patientInfoPanel = document.getElementById('patientInfoPanel');

    if (clearPatientBtn) {
        clearPatientBtn.addEventListener('click', function() {
            document.getElementById('patientName').value = '';
            document.getElementById('birthDate').value = '';
            document.getElementById('gender').value = 'male';
            document.getElementById('cardNumber').value = '';

            if (patientInfoPanel) patientInfoPanel.style.display = 'none';
            // Показываем предупреждение
            document.getElementById('noPatientWarning').style.display = 'block';
        });
    }

    if (searchPatientBtn) {
        searchPatientBtn.addEventListener('click', function() {
            const patientName = document.getElementById('patientName').value.trim();
            const birthDate = document.getElementById('birthDate').value;
            const gender = document.getElementById('gender').value;
            const cardNumber = document.getElementById('cardNumber').value.trim();

            if (patientName && birthDate && cardNumber) {
                // В реальном приложении здесь будет запрос на сервер

                // Обновляем информацию о пациенте на странице
                document.querySelector('.patient-name').textContent = patientName;

                // Преобразуем дату в российский формат
                const dateObj = new Date(birthDate);
                document.querySelector('.patient-detail-value:nth-child(2)').textContent = `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getFullYear()}`;
                document.querySelector('.patient-detail-value:nth-child(4)').textContent =
                    gender === 'male' ? 'Мужской' : 'Женский';
                document.querySelector('.patient-detail-value:nth-child(6)').textContent = cardNumber;

                patientInfoPanel.style.display = 'block';
                document.getElementById('noPatientWarning').style.display = 'none';
            } else {
                alert('Пожалуйста, заполните все обязательные поля');
            }
        });
    }
});