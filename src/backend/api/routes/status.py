from flask import Blueprint, jsonify
from datetime import datetime
import os
import tensorflow as tf
from ..config import MODEL_PATH, UPLOAD_FOLDER, RESULTS_FOLDER, SERVER_PORT, BASE_URL
from ..utils.common import get_folder_size

bp = Blueprint('status', __name__)

@bp.route('/api/status', methods=['GET'])
def get_status():
    try:
        # Проверяем, загружена ли модель
        from ..routes.analysis import load_model
        model_loaded = hasattr(load_model, 'model')

        # Проверяем, доступно ли GPU
        gpus = tf.config.experimental.list_physical_devices('GPU')

        response = {
            'status': 'ok',
            'server_time': datetime.now().isoformat(),
            'model_loaded': model_loaded,
            'model_path': MODEL_PATH,
            'model_exists': os.path.exists(MODEL_PATH),
            'gpu_available': len(gpus) > 0,
            'gpu_info': [str(gpu) for gpu in gpus] if gpus else None,
            'memory_info': {
                'upload_folder_size_mb': get_folder_size(UPLOAD_FOLDER) / (1024 * 1024),
                'results_folder_size_mb': get_folder_size(RESULTS_FOLDER) / (1024 * 1024)
            },
            'server_port': SERVER_PORT,
            'server_url': BASE_URL
        }

        return jsonify(response)
    except Exception as e:
        print(f"Ошибка при получении статуса: {str(e)}")
        return jsonify({'error': str(e), 'status': 'error'}), 500