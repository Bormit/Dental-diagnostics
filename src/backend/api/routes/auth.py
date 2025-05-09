from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from ..models.models import User
from ..db import db

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', '*')
        response.headers.add('Access-Control-Allow-Methods', '*')
        return response

    try:
        data = request.get_json()
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Необходимо указать имя пользователя и пароль'}), 400

        user = User.query.filter_by(username=data['username']).first()
        if user and user.check_password(data['password']):
            user_info = {
                'user_id': user.user_id,
                'username': user.username,
                'role': user.role
            }
            access_token = create_access_token(identity=str(user.user_id), additional_claims=user_info)
            return jsonify({
                'access_token': access_token,
                'user': {
                    'user_id': user.user_id,
                    'username': user.username,
                    'role': user.role,
                    'full_name': user.full_name
                }
            })
        return jsonify({'error': 'Неверное имя пользователя или пароль'}), 401
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        required = ['username', 'password', 'full_name', 'role']
        if not data or not all(k in data for k in required):
            return jsonify({'error': 'Необходимо заполнить все поля'}), 400
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Пользователь уже существует'}), 409
        user = User(
            username=data['username'],
            full_name=data['full_name'],
            role=data['role'],
            specialty=data.get('specialty')
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Пользователь зарегистрирован'}), 201
    except Exception as e:
        print(f"Ошибка при регистрации: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    claims = get_jwt()
    return jsonify({'user': claims})
