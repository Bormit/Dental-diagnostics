from flask import request


def setup_cors_middleware(app):
    @app.after_request
    def add_cors_headers(response):
        # Первым делом удаляем любые существующие CORS заголовки,
        # чтобы избежать дублирования
        if 'Access-Control-Allow-Origin' in response.headers:
            del response.headers['Access-Control-Allow-Origin']
        if 'Access-Control-Allow-Headers' in response.headers:
            del response.headers['Access-Control-Allow-Headers']
        if 'Access-Control-Allow-Methods' in response.headers:
            del response.headers['Access-Control-Allow-Methods']
        if 'Access-Control-Allow-Credentials' in response.headers:
            del response.headers['Access-Control-Allow-Credentials']

        origin = request.headers.get('Origin')
        allowed_origins = [
            "http://localhost:63343",
            "http://127.0.0.1:63343",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]

        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
            # Включаем все необходимые заголовки
            response.headers.add('Access-Control-Allow-Headers',
                                 'Content-Type, Authorization, Accept, Cache-Control, Pragma, X-Requested-With')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')

        # Для отладки
        print(f"CORS headers: {dict(response.headers)}")

        return response

    return app