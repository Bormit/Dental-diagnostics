document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');

    // Новый обработчик событий авторизации
    async function handleLoginEvent() {
        let isValid = true;
        const username = document.getElementById('username');
        const password = document.getElementById('password');

        // Debug: выводим значения username и password
        console.debug('[login] Username:', username.value);
        console.debug('[login] Password:', password.value);

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
                console.debug('[login] Sending fetch to /api/auth/login');
                const resp = await fetch('http://127.0.0.1:8000/api/auth/login', { // Явный адрес backend
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        username: username.value.trim(),
                        password: password.value
                    })
                });
                console.debug('[login] Fetch response status:', resp.status);
                const data = await resp.json();
                console.debug('[login] Response data:', data);
                if (resp.ok && data.access_token) {
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    // Используем только поле full_name
                    if (data.user && data.user.full_name) {
                        localStorage.setItem('user_fullname', data.user.full_name);
                    }
                    // Сохраняем user_id для фильтрации пациентов по врачу
                    if (data.user && data.user.user_id) {
                        localStorage.setItem('user_id', data.user.user_id);
                    }
                    window.location.href = "../dashboard/dashboard.html";
                } else {
                    // Сообщение об ошибке на русском
                    console.warn('[login] Auth error:', data.error);
                    alert(data.error || 'Ошибка авторизации. Проверьте правильность логина и пароля.');
                }
            } catch (e) {
                // Добавим подробный вывод для CORS/соединения
                console.error('[login] Connection error:', e);
                if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
                    alert('Ошибка соединения с сервером. Проверьте, что сервер запущен и разрешает CORS (кросс-доменные запросы).');
                } else {
                    alert('Ошибка соединения с сервером: ' + e.message);
                }
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