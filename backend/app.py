import os
import sqlite3
import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.security import check_password_hash
from flask_cors import CORS
from werkzeug.utils import secure_filename

FRONTEND_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app = Flask(__name__)
app.config['SECRET_KEY'] = 'doctorwallah_super_secret_key_123!'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            token = token.split(" ")[1] # Bearer <token>
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing username or password'}), 400

    conn = get_db_connection()
    admin = conn.execute('SELECT * FROM admins WHERE username = ?', (username,)).fetchone()
    conn.close()

    if admin and check_password_hash(admin['password_hash'], password):
        # Generate token
        token = jwt.encode({
            'username': admin['username'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token})

    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    total_articles = conn.execute('SELECT COUNT(*) FROM articles').fetchone()[0]
    total_categories = conn.execute('SELECT COUNT(*) FROM categories').fetchone()[0]
    total_doctors = conn.execute('SELECT COUNT(*) FROM doctors').fetchone()[0]
    conn.close()
    return jsonify({
        'articles': total_articles,
        'categories': total_categories,
        'doctors': total_doctors
    })

@app.route('/api/categories', methods=['GET', 'POST'])
def categories():
    conn = get_db_connection()
    if request.method == 'POST':
        # Protect POST with simple check (in real app, use @token_required on specific methods)
        token = request.headers.get('Authorization')
        if not token: return jsonify({'message': 'Token missing'}), 401
        data = request.json
        name = data.get('name')
        if not name: return jsonify({'message': 'Name required'}), 400
        try:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO categories (name) VALUES (?)', (name,))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            return jsonify({'id': new_id, 'name': name}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'message': 'Category already exists'}), 400
    
    categories = conn.execute('SELECT * FROM categories').fetchall()
    conn.close()
    return jsonify([dict(c) for c in categories])

@app.route('/api/doctors', methods=['GET', 'POST'])
def doctors():
    conn = get_db_connection()
    if request.method == 'POST':
        token = request.headers.get('Authorization')
        if not token: return jsonify({'message': 'Token missing'}), 401
        data = request.json
        name = data.get('name')
        spec = data.get('specialization')
        qual = data.get('qualification')
        hosp = data.get('hospital_name')
        link = data.get('booking_link')
        
        if not name or not spec: return jsonify({'message': 'Missing data'}), 400
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO doctors (name, specialization, qualification, hospital_name, booking_link) VALUES (?, ?, ?, ?, ?)', 
            (name, spec, qual, hosp, link)
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': new_id, 'name': name, 'specialization': spec, 'qualification': qual, 'hospital_name': hosp, 'booking_link': link}), 201
        
    doctors = conn.execute('SELECT * FROM doctors').fetchall()
    conn.close()
    return jsonify([dict(d) for d in doctors])

@app.route('/api/articles', methods=['GET', 'POST'])
def articles():
    conn = get_db_connection()
    if request.method == 'POST':
        token = request.headers.get('Authorization')
        if not token: return jsonify({'message': 'Token missing'}), 401
        data = request.json
        # Validate data
        title = data.get('title')
        content = data.get('content')
        short_desc = data.get('short_description')
        doc_id = data.get('doctor_id')
        cat_id = data.get('category_id')
        image = data.get('image')
        image2 = data.get('image2')
        image3 = data.get('image3')
        date_str = datetime.datetime.now().strftime("%Y-%m-%d")

        if not all([title, content, doc_id, cat_id]):
            return jsonify({'message': 'Missing required fields'}), 400

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO articles (title, content, short_description, doctor_id, category_id, image, image2, image3, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (title, content, short_desc, doc_id, cat_id, image, image2, image3, date_str))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': new_id, 'message': 'Article created successfully'}), 201

    # GET request with optional filters
    search = request.args.get('search', '')
    cat_id = request.args.get('category', '')
    
    query = '''
        SELECT a.id, a.title, a.short_description, a.image, a.date, 
               d.name as doctor_name, c.name as category_name
        FROM articles a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE 1=1
    '''
    params = []
    
    if search:
        query += ' AND a.title LIKE ?'
        params.append(f'%{search}%')
    if cat_id:
        query += ' AND a.category_id = ?'
        params.append(cat_id)
        
    query += ' ORDER BY a.id DESC'
    
    articles = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(a) for a in articles])

@app.route('/api/articles/<int:id>', methods=['GET', 'DELETE'])
def article_detail(id):
    conn = get_db_connection()
    
    if request.method == 'DELETE':
        token = request.headers.get('Authorization')
        if not token: return jsonify({'message': 'Token missing'}), 401
        conn.execute('DELETE FROM articles WHERE id = ?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Article deleted'})

    query = '''
        SELECT a.*, d.name as doctor_name, d.specialization as doctor_specialization, 
               d.qualification as doctor_qualification, d.hospital_name as doctor_hospital, 
               d.booking_link as doctor_link, c.name as category_name
        FROM articles a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.id = ?
    '''
    article = conn.execute(query, (id,)).fetchone()
    conn.close()
    
    if article is None:
        return jsonify({'message': 'Article not found'}), 404
        
    return jsonify(dict(article))

@app.route('/api/upload', methods=['POST'])
def upload_file():
    token = request.headers.get('Authorization')
    if not token: return jsonify({'message': 'Token missing'}), 401

    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if file:
        filename = secure_filename(file.filename)
        # Add timestamp to prevent overwriting
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
        
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
        # Return the URL to access the image
        return jsonify({'url': f'/uploads/{unique_filename}'}), 200

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def index():
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

@app.route('/ad-dw-p2s')
def secret_admin():
    return send_from_directory(FRONTEND_FOLDER, 'admin/login.html')

@app.route('/ad-dw-p2s/dashboard')
def secret_dashboard():
    return send_from_directory(FRONTEND_FOLDER, 'admin/dashboard.html')

@app.route('/<path:filename>')
def frontend_static(filename):
    if filename.startswith('admin/'):
        return send_from_directory(FRONTEND_FOLDER, 'index.html') # Hide direct access
    file_path = os.path.join(FRONTEND_FOLDER, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(FRONTEND_FOLDER, filename)
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
