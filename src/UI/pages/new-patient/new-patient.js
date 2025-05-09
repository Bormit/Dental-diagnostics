document.addEventListener('DOMContentLoaded', function() {
  // Получение ссылок на элементы DOM
  const newPatientForm = document.getElementById('newPatientForm');
  const savePatientBtn = document.getElementById('savePatientBtn');
  const savePatientBtnBottom = document.getElementById('savePatientBtnBottom');
  const cancelBtn = document.getElementById('cancelBtn');
  const cancelBtnBottom = document.getElementById('cancelBtnBottom');
  const successModal = document.getElementById('successModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const goToListBtn = document.getElementById('goToListBtn');
  const goToCardBtn = document.getElementById('goToCardBtn');

  // Функция валидации формы
  function validateForm() {
    const requiredFields = newPatientForm.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.classList.add('invalid');
      } else {
        field.classList.remove('invalid');
      }
    });

    return isValid;
  }

  // Функция очистки формы
  function resetForm() {
    newPatientForm.reset();
    newPatientForm.querySelectorAll('.invalid').forEach(field => {
      field.classList.remove('invalid');
    });
  }

  // Функция для отображения модального окна
  function showModal() {
    successModal.style.display = 'flex';
  }

  // Функция скрытия модального окна
  function hideModal() {
    successModal.style.display = 'none';
  }

  // Функция для сбора данных формы
  function collectFormData() {
    return {
      lastName: document.getElementById('lastName').value.trim(),
      firstName: document.getElementById('firstName').value.trim(),
      middleName: document.getElementById('middleName').value.trim(),
      birthDate: document.getElementById('birthDate').value,
      gender: document.getElementById('gender').value,
      snils: document.getElementById('snils').value.trim(),
      phoneNumber: document.getElementById('phoneNumber').value.trim(),
      email: document.getElementById('email').value.trim(),
      address: document.getElementById('address').value.trim(),
      policyNumber: document.getElementById('policyNumber').value.trim(),
      policyCompany: document.getElementById('policyCompany').value.trim(),
      allergies: document.getElementById('allergies').value.trim(),
      chronicDiseases: document.getElementById('chronicDiseases').value.trim(),
      preferredDoctor: document.getElementById('preferredDoctor').value,
      sourceOfInfo: document.getElementById('sourceOfInfo').value,
      additionalInfo: document.getElementById('additionalInfo').value.trim(),
      consentForTreatment: document.getElementById('consentForTreatment').checked,
      consentForSMS: document.getElementById('consentForSMS').checked
    };
  }

  // Обработчики событий для сохранения формы
  async function handleSave(e) {
    e.preventDefault();

    if (validateForm()) {
      // Собираем данные формы
      const patientData = collectFormData();

      // Отправляем данные на сервер
      try {
        const response = await fetch('http://localhost:8000/api/patients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(patientData)
        });

        if (response.ok) {
          // Получаем номер карты из ответа (если сервер возвращает)
          const result = await response.json();
          const cardNumber = result.cardNumber || '12356';
          const cardNumberEl = document.querySelector('.card-number');
          if (cardNumberEl) cardNumberEl.textContent = cardNumber;

          showModal();
        } else {
          const err = await response.json();
          alert('Ошибка при сохранении пациента: ' + (err.error || 'Попробуйте еще раз.'));
        }
      } catch (err) {
        alert('Ошибка соединения с сервером.');
      }
    } else {
      alert('Пожалуйста, заполните все обязательные поля');

      // Прокручиваем к первому невалидному полю
      const firstInvalid = newPatientForm.querySelector('.invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
    }
  }

  // Обработчики отмены
  function handleCancel(e) {
    e.preventDefault();
    if (confirm('Вы уверены, что хотите отменить создание пациента? Все введенные данные будут потеряны.')) {
      resetForm();
      // В реальном приложении здесь будет редирект на страницу со списком пациентов
      window.location.href = 'patients.html';
    }
  }

  // Форматирование ввода СНИЛС
  const snilsInput = document.getElementById('snils');
  if (snilsInput) {
    snilsInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length > 9) {
        value = value.substring(0, 9) + ' ' + value.substring(9, 11);
      }

      if (value.length > 3) {
        value = value.substring(0, 3) + '-' + value.substring(3);
      }

      if (value.length > 7) {
        value = value.substring(0, 7) + '-' + value.substring(7);
      }

      e.target.value = value;
    });
  }

  // Форматирование ввода номера телефона
  const phoneInput = document.getElementById('phoneNumber');
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length > 0) {
        if (value[0] !== '7' && value[0] !== '8') {
          value = '7' + value;
        }

        // Форматируем +7 (XXX) XXX-XX-XX
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

  // Форматирование номера полиса ОМС
  const policyInput = document.getElementById('policyNumber');
  if (policyInput) {
    policyInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');

      // Ограничиваем длину до 16 цифр
      if (value.length > 16) {
        value = value.substring(0, 16);
      }

      e.target.value = value;
    });
  }

  // Привязка обработчиков событий
  if (savePatientBtn) savePatientBtn.addEventListener('click', handleSave);
  if (savePatientBtnBottom) savePatientBtnBottom.addEventListener('click', handleSave);
  if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
  if (cancelBtnBottom) cancelBtnBottom.addEventListener('click', handleCancel);
  if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);

  // Обработчики кнопок в модальном окне
  if (goToListBtn) {
    goToListBtn.addEventListener('click', function() {
      hideModal();
      window.location.href = '../patients/patients.html';
    });
  }

  if (goToCardBtn) {
    goToCardBtn.addEventListener('click', function() {
      hideModal();
      const cardNumber = document.querySelector('.card-number').textContent;
      window.location.href = `patient-card.html?id=${cardNumber}`;
    });
  }

  // Обработка нажатия клавиши Escape для закрытия модального окна
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && successModal.style.display === 'flex') {
      hideModal();
    }
  });

  // Закрытие модального окна при клике вне его контента
  window.addEventListener('click', function(e) {
    if (e.target === successModal) {
      hideModal();
    }
  });

  // Предотвращение отправки формы при нажатии Enter
  newPatientForm.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      return false;
    }
  });

  // Валидация при потере фокуса
  newPatientForm.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', function() {
      if (!this.value.trim()) {
        this.classList.add('invalid');
      } else {
        this.classList.remove('invalid');
      }
    });

    field.addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.remove('invalid');
      }
    });
  });
});