const API_BASE_URL = window.location.origin + '/api';
let quill;

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    const isLoginPath = window.location.pathname.includes('ad-dw-p2s') && !window.location.pathname.includes('dashboard');
    
    if (!token && !isLoginPath) {
        window.location.href = '/ad-dw-p2s';
        return;
    }
    
    // Auto redirect if logged in
    if (token && isLoginPath) {
        window.location.href = '/ad-dw-p2s/dashboard';
        return;
    }

    if (window.location.pathname.includes('dashboard')) {
        initDashboard();
    }
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/ad-dw-p2s';
}

function getToken() {
    return localStorage.getItem('admin_token');
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('admin_token', data.token);
            window.location.href = '/ad-dw-p2s/dashboard';
        } else {
            errorDiv.innerText = data.message || 'Login failed';
        }
    } catch (error) {
        errorDiv.innerText = 'Server error. Is the backend running?';
    }
}

// UI Navigation
function showSection(sectionId, element) {
    document.querySelectorAll('.admin-panel-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`s-${sectionId}`).classList.add('active');
    
    if (element) {
        document.querySelectorAll('.admin-menu a').forEach(a => a.classList.remove('active'));
        element.classList.add('active');
    }
}

// Dashboard Initialization
async function initDashboard() {
    // Init Quill Editor
    quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Write your medical article here...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'clean']
            ]
        }
    });

    await loadStats();
    await loadArticles();
    await loadDoctors();
    await loadCategories();
}

async function loadStats() {
    const response = await fetch(`${API_BASE_URL}/stats`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if(response.ok) {
        const data = await response.json();
        document.getElementById('stat-articles').innerText = data.articles;
        document.getElementById('stat-doctors').innerText = data.doctors;
        document.getElementById('stat-categories').innerText = data.categories;
    }
}

// Articles
async function loadArticles() {
    const response = await fetch(`${API_BASE_URL}/articles`);
    const articles = await response.json();
    const tbody = document.getElementById('articles-table-body');
    tbody.innerHTML = '';
    
    articles.forEach(art => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${art.id}</td>
            <td>${art.title}</td>
            <td>${art.doctor_name || '-'}</td>
            <td>${art.date}</td>
            <td>
                <button class="action-btn delete-btn" onclick="deleteArticle(${art.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteArticle(id) {
    if(confirm('Are you sure you want to delete this article?')) {
        await fetch(`${API_BASE_URL}/articles/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        loadArticles();
        loadStats();
    }
}

async function submitArticle(e) {
    e.preventDefault();
    
    const title = document.getElementById('article-title').value;
    const short_desc = document.getElementById('article-short-desc').value;
    const doctor_id = document.getElementById('article-doctor').value;
    const category_id = document.getElementById('article-category').value;
    const content = quill.root.innerHTML;
    
    const imageFile = document.getElementById('article-image').files[0];
    const imageFile2 = document.getElementById('article-image2').files[0];
    const imageFile3 = document.getElementById('article-image3').files[0];
    let image_path = null;
    let image2_path = null;
    let image3_path = null;

    async function uploadSingleImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        const imgRes = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });
        if(!imgRes.ok) throw new Error("Upload failed");
        const imgData = await imgRes.json();
        return imgData.url;
    }

    try {
        if(imageFile) image_path = await uploadSingleImage(imageFile);
        if(imageFile2) image2_path = await uploadSingleImage(imageFile2);
        if(imageFile3) image3_path = await uploadSingleImage(imageFile3);
    } catch(err) {
        alert("Image upload failed");
        return;
    }

    // Submit Article
    const articleData = {
        title, short_description: short_desc, doctor_id, category_id, content, 
        image: image_path, image2: image2_path, image3: image3_path
    };

    const res = await fetch(`${API_BASE_URL}/articles`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify(articleData)
    });

    if(res.ok) {
        alert('Article Published!');
        e.target.reset();
        quill.root.innerHTML = '';
        showSection('articles', document.querySelector('.admin-menu li:nth-child(2) a'));
        loadArticles();
        loadStats();
    } else {
        alert('Failed to publish article');
    }
}

// Doctors
async function loadDoctors() {
    const response = await fetch(`${API_BASE_URL}/doctors`);
    const data = await response.json();
    
    const tbody = document.getElementById('doctors-table-body');
    const select = document.getElementById('article-doctor');
    
    tbody.innerHTML = '';
    select.innerHTML = '<option value="">Select Doctor</option>';
    
    data.forEach(item => {
        tbody.innerHTML += `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.specialization}</td></tr>`;
        select.innerHTML += `<option value="${item.id}">${item.name}</option>`;
    });
}

async function submitDoctor(e) {
    e.preventDefault();
    const name = document.getElementById('doc-name').value;
    const specialization = document.getElementById('doc-spec').value;
    const qualification = document.getElementById('doc-qual').value;
    const hospital_name = document.getElementById('doc-hosp').value;
    const booking_link = document.getElementById('doc-link').value;
    
    const res = await fetch(`${API_BASE_URL}/doctors`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ name, specialization, qualification, hospital_name, booking_link })
    });
    
    if(res.ok) {
        e.target.reset();
        loadDoctors();
        loadStats();
    }
}

// Categories
async function loadCategories() {
    const response = await fetch(`${API_BASE_URL}/categories`);
    const data = await response.json();
    
    const tbody = document.getElementById('categories-table-body');
    const select = document.getElementById('article-category');
    
    tbody.innerHTML = '';
    select.innerHTML = '<option value="">Select Category</option>';
    
    data.forEach(item => {
        tbody.innerHTML += `<tr><td>${item.id}</td><td>${item.name}</td></tr>`;
        select.innerHTML += `<option value="${item.id}">${item.name}</option>`;
    });
}

async function submitCategory(e) {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    
    const res = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ name })
    });
    
    if(res.ok) {
        e.target.reset();
        loadCategories();
        loadStats();
    }
}
