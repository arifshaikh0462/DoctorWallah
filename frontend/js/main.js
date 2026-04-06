const API_BASE_URL = window.location.origin + '/api';
const UPLOADS_BASE_URL = window.location.origin;

// Global state
let allCategories = [];

// Fetch initial data
async function initApp() {
    await fetchCategories();
    
    // Check if we are on the home page
    const articlesContainer = document.getElementById('articles-grid');
    if (articlesContainer) {
        fetchArticles();
    }
    
    // Check if we are on the category page
    const categoryContainer = document.getElementById('category-articles-grid');
    if (categoryContainer) {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('id');
        fetchArticles(categoryId);
    }
    
    // Check if we are on the article detail page
    const articleDetailContainer = document.getElementById('article-detail');
    if (articleDetailContainer) {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        if(articleId) {
            fetchArticleDetail(articleId);
        }
    }
}

async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        allCategories = await response.json();
        
        const categoryList = document.getElementById('category-list');
        const mobileCategoriesList = document.getElementById('mobile-categories');
        const footerCategoriesList = document.getElementById('footer-categories');
        
        if (categoryList) {
            allCategories.forEach(cat => {
                const btn = document.createElement('a');
                btn.href = `category.html?id=${cat.id}`;
                btn.className = 'category-pill';
                btn.innerText = cat.name;
                categoryList.appendChild(btn);
            });
        }
        if (mobileCategoriesList) {
            allCategories.forEach(cat => {
                mobileCategoriesList.innerHTML += `<li><a href="category.html?id=${cat.id}">${cat.name}</a></li>`;
            });
        }
        if (footerCategoriesList) {
            allCategories.forEach(cat => {
                footerCategoriesList.innerHTML += `<a href="category.html?id=${cat.id}">${cat.name}</a>`;
            });
        }
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

async function fetchArticles(categoryId = null) {
    const container = document.getElementById(categoryId ? 'category-articles-grid' : 'articles-grid');
    const loader = document.getElementById('loader');
    
    if(loader) loader.style.display = 'flex';
    
    try {
        let url = `${API_BASE_URL}/articles`;
        if (categoryId) {
            url += `?category=${categoryId}`;
        }
        
        const response = await fetch(url);
        const articles = await response.json();
        
        if(loader) loader.style.display = 'none';
        
        if (articles.length === 0) {
            container.innerHTML = '<p>No articles found.</p>';
            return;
        }

        container.innerHTML = '';
        articles.forEach(article => {
            const imageUrl = article.image ? `${UPLOADS_BASE_URL}${article.image}` : 'https://via.placeholder.com/400x200?text=Medical+Article';
            const card = document.createElement('a');
            card.href = `article.html?id=${article.id}`;
            card.className = 'article-card';
            card.innerHTML = `
                <img src="${imageUrl}" alt="${article.title}" class="article-img">
                <div class="article-content">
                    <span class="article-category">${article.category_name || 'General'}</span>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-desc">${article.short_description || ''}</p>
                    <div class="article-meta">
                        <div class="doctor-info">
                            <i class="fa-solid fa-user-doctor"></i>
                            <span>${article.doctor_name || 'Unknown Author'}</span>
                        </div>
                        <span>${article.date || ''}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching articles:", error);
        if(loader) loader.style.display = 'none';
        container.innerHTML = '<p>Error loading articles. Please ensure backend is running.</p>';
    }
}

async function fetchArticleDetail(id) {
    const container = document.getElementById('article-detail');
    const titleElement = document.getElementById('article-title');
    const contentElement = document.getElementById('article-content');
    const metaElement = document.getElementById('article-meta');
    const imageElement = document.getElementById('article-image');

    try {
        const response = await fetch(`${API_BASE_URL}/articles/${id}`);
        if(!response.ok) throw new Error("Article not found");
        const article = await response.json();
        
        document.title = `${article.title} - DoctorWallah`;
        titleElement.innerText = article.title;
        
        metaElement.innerHTML = `
            <span><i class="fa-solid fa-user-doctor"></i> ${article.doctor_name} (${article.doctor_specialization})</span>
            <span><i class="fa-solid fa-calendar-days"></i> ${article.date}</span>
            <span><i class="fa-solid fa-tag"></i> ${article.category_name}</span>
        `;
        
        const imageUrl = article.image ? `${UPLOADS_BASE_URL}${article.image}` : 'https://via.placeholder.com/800x400?text=Medical+Article';
        imageElement.src = imageUrl;
        imageElement.alt = article.title;
        
        const imageUrl2 = article.image2 ? `<img class="article-hero-img" src="${UPLOADS_BASE_URL}${article.image2}" alt="Article Extra Image 1" style="margin-top: 20px;">` : '';
        const imageUrl3 = article.image3 ? `<img class="article-hero-img" src="${UPLOADS_BASE_URL}${article.image3}" alt="Article Extra Image 2" style="margin-top: 20px;">` : '';
        
        // Rendering Author Profile Box
        const authorBoxHtml = `
            <div class="author-bio-box">
                <div class="author-bio-header">
                    <div class="author-avatar">
                        <i class="fa-solid fa-user-doctor"></i>
                    </div>
                    <div class="author-info">
                        <h3>${article.doctor_name}</h3>
                        <p class="author-spec">${article.doctor_specialization} ${article.doctor_qualification ? `| ${article.doctor_qualification}` : ''}</p>
                        ${article.doctor_hospital ? `<p class="author-hosp"><i class="fa-regular fa-hospital"></i> ${article.doctor_hospital}</p>` : ''}
                    </div>
                </div>
                ${article.doctor_link ? `
                <div class="author-action">
                    <a href="${article.doctor_link}" target="_blank" class="btn-primary" style="width:100%; text-align:center; padding: 12px;">
                        <i class="fa-solid fa-calendar-check"></i> Book 1-on-1 Consultation
                    </a>
                </div>
                ` : ''}
            </div>
        `;

        // Render rich HTML content using innerHTML
        // Safe only if we trust the Admin input completely
        contentElement.innerHTML = `${article.content}
        ${authorBoxHtml}
        <div class="extra-images" style="display:flex; flex-direction:column; gap:20px; align-items:center; margin-top:30px;">
            ${imageUrl2}
            ${imageUrl3}
        </div>`;

    } catch (error) {
        container.innerHTML = '<h2>Article not found or error loading it.</h2>';
    }
}

function handleSearch(event) {
    event.preventDefault();
    const query = document.getElementById('search-input').value;
    if(query) {
        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
    }
}

window.toggleSubmenu = function(e, id) {
    e.preventDefault();
    const sub = document.getElementById(id);
    if(sub) sub.classList.toggle('open');
};

function buildMobileMenu() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Hamburger button
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    navbar.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    document.body.appendChild(overlay);

    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.innerHTML = `
        <div class="mobile-menu-header">
            <h3>Menu</h3>
            <button class="close-menu"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <ul class="mobile-nav">
            <li><a href="index.html">Home</a></li>
            <li class="has-submenu">
                <a href="#" onclick="toggleSubmenu(event, 'mobile-categories')">Categories <i class="fa-solid fa-chevron-down" style="font-size:12px;"></i></a>
                <ul class="submenu" id="mobile-categories"></ul>
            </li>
            <li class="has-submenu">
                <a href="#" onclick="toggleSubmenu(event, 'mobile-doctors')">Doctors <i class="fa-solid fa-chevron-down" style="font-size:12px;"></i></a>
                <ul class="submenu" id="mobile-doctors"></ul>
            </li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact</a></li>
        </ul>
    `;
    document.body.appendChild(menu);

    btn.onclick = () => { menu.classList.add('open'); overlay.classList.add('open'); };
    overlay.onclick = () => { menu.classList.remove('open'); overlay.classList.remove('open'); };
    menu.querySelector('.close-menu').onclick = () => { menu.classList.remove('open'); overlay.classList.remove('open'); };

    fetch(`${API_BASE_URL}/doctors`)
        .then(res => res.json())
        .then(docs => {
            const docUl = document.getElementById('mobile-doctors');
            if (docUl) {
                docs.forEach(doc => {
                    docUl.innerHTML += `<li><a href="index.html?search=${encodeURIComponent(doc.name)}">${doc.name} (${doc.specialization})</a></li>`;
                });
            }
        });
}

function buildFooter() {
    // Remove existing footer if any
    const existingFooter = document.querySelector('footer');
    if (existingFooter) {
        existingFooter.remove();
    }
    
    const wrapper = document.querySelector('.layout-wrapper');
    if (!wrapper) return;

    const footer = document.createElement('footer');
    footer.className = 'main-footer';
    footer.innerHTML = `
        <div class="container footer-grid">
            <div class="footer-col">
                <h3>Doctor<span>Wallah</span></h3>
                <p>Expert Health Advice, Right Here. Read high-quality, doctor-verified articles on diseases, prevention, and living a healthier life.</p>
            </div>
            <div class="footer-col">
                <h4>Quick Links</h4>
                <div class="footer-nav-vertical">
                    <a href="index.html">Home</a>
                    <a href="category.html">Categories</a>
                    <a href="about.html">About Us</a>
                    <a href="contact.html">Contact</a>
                </div>
            </div>
            <div class="footer-col">
                <h4>Categories</h4>
                <div class="footer-nav-vertical" id="footer-categories">
                    <!-- Populated via JS -->
                </div>
            </div>
        </div>
        <div class="container">
            <hr style="border-color: #444; margin: 20px 0;">
            <p class="copyright">&copy; 2026 DoctorWallah. All rights reserved. Consult a doctor before making medical decisions.</p>
        </div>
    `;
    wrapper.appendChild(footer);
}

// Global search handling
document.addEventListener('DOMContentLoaded', () => {
    buildMobileMenu();
    buildFooter();
    initApp();
    
    // Check if there's a search parameter on the home page specifically
    const articlesContainer = document.getElementById('articles-grid');
    if (articlesContainer) {
        const urlParams = new URLSearchParams(window.location.search);
        const search = urlParams.get('search');
        if(search) {
             const loader = document.getElementById('loader');
             if(loader) loader.style.display = 'flex';
             
             fetch(`${API_BASE_URL}/articles?search=${search}`)
                .then(res => res.json())
                .then(articles => {
                    if(loader) loader.style.display = 'none';
                    if (articles.length === 0) {
                        articlesContainer.innerHTML = '<p>No articles found for that search.</p>';
                        return;
                    }
                    articlesContainer.innerHTML = '';
                    articles.forEach(article => {
                        const imageUrl = article.image ? `${UPLOADS_BASE_URL}${article.image}` : 'https://via.placeholder.com/400x200?text=Medical+Article';
                        const card = document.createElement('a');
                        card.href = `article.html?id=${article.id}`;
                        card.className = 'article-card';
                        card.innerHTML = `
                            <img src="${imageUrl}" alt="${article.title}" class="article-img">
                            <div class="article-content">
                                <span class="article-category">${article.category_name || 'General'}</span>
                                <h3 class="article-title">${article.title}</h3>
                                <p class="article-desc">${article.short_description || ''}</p>
                                <div class="article-meta">
                                    <div class="doctor-info">
                                        <i class="fa-solid fa-user-doctor"></i>
                                        <span>${article.doctor_name || 'Unknown Author'}</span>
                                    </div>
                                    <span>${article.date || ''}</span>
                                </div>
                            </div>
                        `;
                        articlesContainer.appendChild(card);
                    });
                });
        }
    }
});
