document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');

    loginBtn.addEventListener('click', function() {
        let isValid = true;
        const clinic = document.getElementById('clinic');
        const position = document.getElementById('position');
        const role = document.getElementById('role');

        // Проверка выбора клиники
        if (clinic.value === '' || clinic.selectedIndex === 0) {
            document.getElementById('clinic-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('clinic-error').style.display = 'none';
        }

        // Проверка выбора должности
        if (position.value === '' || position.selectedIndex === 0) {
            document.getElementById('position-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('position-error').style.display = 'none';
        }

        // Проверка выбора роли
        if (role.value === '' || role.selectedIndex === 0) {
            document.getElementById('role-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('role-error').style.display = 'none';
        }

        if (isValid) {
            // В реальном приложении здесь может быть AJAX-запрос на сервер для авторизации
            // После успешной авторизации перенаправляем на главную страницу
            window.location.href = "dashboard.html";
        }
    });

    // Дополнительно: очищаем ошибки при изменении селектов
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach(select => {
        select.addEventListener('change', function() {
            const errorId = this.id + '-error';
            document.getElementById(errorId).style.display = 'none';
        });
    });
});

document.getElementById('login-btn').addEventListener('click', function() {
  // Базовая валидация
  let isValid = true;
  const clinic = document.getElementById('clinic');
  const position = document.getElementById('position');
  const role = document.getElementById('role');
  
  if (clinic.value === "") {
    document.getElementById('clinic-error').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('clinic-error').style.display = 'none';
  }
  
  if (position.value === "") {
    document.getElementById('position-error').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('position-error').style.display = 'none';
  }
  
  if (role.value === "") {
    document.getElementById('role-error').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('role-error').style.display = 'none';
  }
  
  if (isValid) {
    // Успешная авторизация, переходим в личный кабинет
    window.location.href = 'acc.html';
  }
});