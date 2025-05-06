document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');

    // Новый обработчик событий авторизации
    async function handleLoginEvent() {
        let isValid = true;
        const username = document.getElementById('username');
        const password = document.getElementById('password');

        if (!username.value.trim()) {
            document.getElementById('username-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('username-error').style.display = 'none';
        }

        if (!password.value.trim()) {
            document.getElementById('password-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('password-error').style.display = 'none';
        }

        if (isValid) {
            try {
                const resp = await fetch('http://localhost:8000/api/auth/login', { // Явный адрес backend
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        username: username.value.trim(),
                        password: password.value
                    })
                });
                const data = await resp.json();
                if (resp.ok && data.access_token) {
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    // Используем только поле full_name
                    if (data.user && data.user.full_name) {
                        localStorage.setItem('user_fullname', data.user.full_name);
                    }
                    window.location.href = "../dashboard/dashboard.html";
                } else {
                    alert(data.error || 'Ошибка авторизации');
                }
            } catch (e) {
                alert('Ошибка соединения с сервером');
            }
        }
    }

    loginBtn.addEventListener('click', handleLoginEvent);

    // Очищаем ошибки при вводе
    ['username', 'password'].forEach(id => {
        document.getElementById(id).addEventListener('input', function() {
            document.getElementById(id + '-error').style.display = 'none';
        });
    });
});