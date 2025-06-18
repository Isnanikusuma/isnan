// MVP Architecture Implementation

// Model
class StoryModel {
    constructor() {
        this.baseUrl = 'https://story-api.dicoding.dev/v1';
        this.token = localStorage.getItem('token') || null;
    }

    
     async getNotifications() {
        try {
            const response = await fetch(`${this.baseUrl}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const data = await response.json();
            if (data.error) {
                throw new Error(data.message);
            }
            return data.notifications || [];
        } catch (error) {
            throw error;
        }
    }

    // Jika API asli tidak ada, gunakan dummy untuk demo
    async getNotificationsDummy() {
        // Simulasi notifikasi
        return [
            {
                id: 'notif1',
                title: 'Cerita Baru Telah Ditambahkan!',
                message: 'Lihat cerita terbaru dari komunitas.',
                read: false,
                createdAt: new Date().toISOString(),
            },
            {
                id: 'notif2',
                title: 'Update Aplikasi',
                message: 'Versi terbaru aplikasi telah tersedia.',
                read: true,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
            }
        ];
    }
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message);
            }

            this.token = data.loginResult.token;
            localStorage.setItem('token', this.token);
            return data;
        } catch (error) {
            throw error;
        }
    }

    async register(name, email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message);
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    async getStories() {
        try {
            const response = await fetch(`${this.baseUrl}/stories`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message);
            }

            return data.listStory;
        } catch (error) {
            throw error;
        }
    }

    async addStory(description, photo, lat, lon) {
        try {
            const formData = new FormData();
            formData.append('description', description);
            formData.append('photo', photo);
            if (lat && lon) {
                formData.append('lat', lat);
                formData.append('lon', lon);
            }

            const response = await fetch(`${this.baseUrl}/stories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message);
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('token');
    }

    isLoggedIn() {
        return !!this.token;
    }
}
    
// View
class StoryView {
    constructor() {
        this.currentPage = null;
        this.navLinks = document.getElementById('nav-links');
        this.mainContent = document.getElementById('main-content');
        this.map = null;
        this.addStoryMap = null;
        this.currentStream = null;
        this.selectedLocation = null;
        this.capturedPhotoBlob = null;
    }

    showPage(pageId) {
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;

            // Use View Transition API if supported
            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    this.updateNavigation();
                });
            } else {
                this.updateNavigation();
            }
        }
    }

    updateNavigation() {
        const isLoggedIn = window.storyModel.isLoggedIn();
        
        if (isLoggedIn) {
            this.navLinks.innerHTML = `
                <a href="#stories" class="nav-link">Cerita</a>
                <a href="#add-story" class="nav-link">Tambah Cerita</a>
                <a href="#notifications" class="nav-link">Notifikasi</a>
                <a href="#" class="nav-link" id="logout-btn">Logout</a>
            `;
        } else {
            this.navLinks.innerHTML = `
                <a href="#login" class="nav-link">Login</a>
                <a href="#register" class="nav-link">Register</a>
            `;
        }

        // Update active nav link
        const navLinkElements = document.querySelectorAll('.nav-link');
        navLinkElements.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${this.currentPage.replace('-page', '')}`) {
                link.classList.add('active');
            }
        });
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        const targetPage = document.querySelector('.page.active');
        targetPage.insertBefore(alertDiv, targetPage.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    renderStories(stories) {
        const container = document.getElementById('stories-container');
        
        if (stories.length === 0) {
            container.innerHTML = '<p>Belum ada cerita yang tersedia.</p>';
            return;
        }

        const storiesGrid = document.createElement('div');
        storiesGrid.className = 'stories-grid';
        
        stories.forEach(story => {
            const storyCard = document.createElement('article');
            storyCard.className = 'story-card';
            storyCard.innerHTML = `
                <img src="${story.photoUrl}" alt="${story.description}" class="story-image" loading="lazy">
                <div class="story-content">
                    <h2 class="story-title">${story.name}</h2>
                    <p class="story-description">${story.description}</p>
                    <div class="story-meta">
                        <span>ID: ${story.id}</span>
                        <span>${new Date(story.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
            `;
            storiesGrid.appendChild(storyCard);
        });

        container.innerHTML = '';
        container.appendChild(storiesGrid);
        
        // Initialize map with stories
        this.initializeStoriesMap(stories);
    }

    initializeStoriesMap(stories) {
        const mapContainer = document.getElementById('stories-map');
        mapContainer.innerHTML = '<div id="map"></div>';
        
        // Initialize map
        this.map = L.map('map').setView([-6.2, 106.816666], 5); // Indonesia center
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add markers for stories with location
        stories.forEach(story => {
            if (story.lat && story.lon) {
                const marker = L.marker([story.lat, story.lon]).addTo(this.map);
                marker.bindPopup(`
                    <div style="max-width: 200px;">
                        <img src="${story.photoUrl}" alt="${story.description}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
                        <h3 style="margin: 0 0 4px 0; font-size: 14px;">${story.name}</h3>
                        <p style="margin: 0; font-size: 12px; color: #666;">${story.description}</p>
                    </div>
                `);
            }
        });
    }

    renderNotifications(notifications) {
        const list = document.getElementById('notifications-list');
    const empty = document.getElementById('empty-notifications');
    if (!list || !empty) {
        console.warn('[renderNotifications] Missing DOM element');
        return;
    }

    if (!notifications || notifications.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
        list.innerHTML = notifications.map(n => `
            <div class="notification-item ${n.read ? 'read' : 'unread'}">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-meta">
                    <span>${new Date(n.createdAt).toLocaleString('id-ID')}</span>
                    ${n.read ? '<span class="notif-status read">Sudah dibaca</span>' : '<span class="notif-status unread">Belum dibaca</span>'}
                </div>
            </div>
        `).join('');
        list.style.display = 'block';
        empty.style.display = 'none';
    }
    
    showNotificationsLoading(show = true) {
        const loading = document.querySelector('#notifications-list .loading');
        if (loading) loading.style.display = show ? 'block' : 'none';
    }

    initializeAddStoryMap() {
        if (this.addStoryMap) {
            this.addStoryMap.remove();
        }

        this.addStoryMap = L.map('add-story-map').setView([-6.2, 106.816666], 10);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.addStoryMap);

        let selectedMarker = null;

        this.addStoryMap.on('click', (e) => {
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;
            
            // Remove previous marker
            if (selectedMarker) {
                this.addStoryMap.removeLayer(selectedMarker);
            }
            
            // Add new marker
            selectedMarker = L.marker([lat, lon]).addTo(this.addStoryMap);
            selectedMarker.bindPopup('Lokasi dipilih').openPopup();
            
            // Store location
            this.selectedLocation = { lat, lon };
            document.getElementById('story-lat').value = lat;
            document.getElementById('story-lon').value = lon;
        });
    }

    async initializeCamera() {
        const video = document.getElementById('camera-feed');
        const startBtn = document.getElementById('start-camera');
        const captureBtn = document.getElementById('capture-photo');
        const retakeBtn = document.getElementById('retake-photo');
        const canvas = document.getElementById('photo-canvas');
        const capturedPhoto = document.getElementById('captured-photo');
        const fileInput = document.getElementById('file-input');

        startBtn.addEventListener('click', async () => {
            try {
                // Check if getUserMedia is supported
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Browser tidak mendukung akses kamera');
                }

                startBtn.disabled = true;
                startBtn.textContent = 'Memulai kamera...';

                // Try different video constraints
                let stream = null;
                const constraints = [
                    { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } },
                    { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
                    { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
                    { video: true }
                ];

                for (let constraint of constraints) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia(constraint);
                        break;
                    } catch (err) {
                        console.log('Constraint failed:', constraint, err.message);
                        continue;
                    }
                }

                if (!stream) {
                    throw new Error('Tidak dapat mengakses kamera dengan semua konfigurasi');
                }
                
                this.currentStream = stream;
                video.srcObject = stream;
                
                // Wait for video to be ready
                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = () => {
                        video.play().then(resolve).catch(reject);
                    };
                    video.onerror = reject;
                    
                    // Timeout after 10 seconds
                    setTimeout(() => reject(new Error('Timeout saat memulai video')), 10000);
                });
                
                video.style.display = 'block';
                startBtn.style.display = 'none';
                captureBtn.style.display = 'inline-block';
                
            } catch (error) {
                console.error('Camera error:', error);
                startBtn.disabled = false;
                startBtn.textContent = 'Buka Kamera';
                
                // Show file input as fallback
                this.showCameraFallback();
                this.showAlert('Tidak dapat mengakses kamera: ' + error.message + '. Gunakan tombol "Pilih File" sebagai alternatif.', 'warning');
            }
        });

        captureBtn.addEventListener('click', () => {
            try {
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    throw new Error('Video belum siap');
                }

                const context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0);
                
                // Convert to blob
                canvas.toBlob((blob) => {
                    if (!blob) {
                        this.showAlert('Gagal mengambil foto', 'error');
                        return;
                    }

                    const url = URL.createObjectURL(blob);
                    capturedPhoto.src = url;
                    capturedPhoto.style.display = 'block';
                    
                    // Store photo data
                    this.capturedPhotoBlob = blob;
                    
                    // Hide video and show retake button
                    video.style.display = 'none';
                    captureBtn.style.display = 'none';
                    retakeBtn.style.display = 'inline-block';
                    
                    // Stop camera stream
                    this.stopCamera();
                }, 'image/jpeg', 0.8);
            } catch (error) {
                this.showAlert('Gagal mengambil foto: ' + error.message, 'error');
            }
        });

        retakeBtn.addEventListener('click', () => {
            capturedPhoto.style.display = 'none';
            retakeBtn.style.display = 'none';
            startBtn.style.display = 'inline-block';
            startBtn.disabled = false;
            startBtn.textContent = 'Buka Kamera';
            this.capturedPhotoBlob = null;
            
            // Clean up object URL
            if (capturedPhoto.src.startsWith('blob:')) {
                URL.revokeObjectURL(capturedPhoto.src);
            }
        });

        // File input fallback
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                this.capturedPhotoBlob = file;
                const url = URL.createObjectURL(file);
                capturedPhoto.src = url;
                capturedPhoto.style.display = 'block';
                
                // Hide camera controls and show retake
                video.style.display = 'none';
                startBtn.style.display = 'none';
                captureBtn.style.display = 'none';
                retakeBtn.style.display = 'inline-block';
            }
        });
    }

    showCameraFallback() {
        const fileInput = document.getElementById('file-input');
        const fileLabel = document.getElementById('file-input-label');
        fileInput.style.display = 'block';
        if (fileLabel) fileLabel.style.display = 'block';
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    }

    resetAddStoryForm() {
        document.getElementById('add-story-form').reset();
        document.getElementById('captured-photo').style.display = 'none';
        document.getElementById('camera-feed').style.display = 'none';
        document.getElementById('start-camera').style.display = 'inline-block';
        document.getElementById('capture-photo').style.display = 'none';
        document.getElementById('retake-photo').style.display = 'none';
        this.capturedPhotoBlob = null;
        this.selectedLocation = null;
        this.stopCamera();
        
        // Reset map
        if (this.addStoryMap) {
            this.addStoryMap.remove();
            this.addStoryMap = null;
        }
    }

    showLoading(show = true) {
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => {
            el.style.display = show ? 'block' : 'none';
        });
    }

    // New method for rendering notification settings
    renderNotificationSettings(pushManager) {
        const container = document.getElementById('notifications-container');
        
        container.innerHTML = `
            <div class="form-container">
                <h2>Pengaturan Notifikasi</h2>
                <div class="notification-status">
                    <p id="notification-status">Memeriksa status notifikasi...</p>
                </div>
                <div class="notification-controls">
                    <button type="button" id="subscribe-btn" class="btn-primary" style="display: none;">
                        Aktifkan Notifikasi
                    </button>
                    <button type="button" id="unsubscribe-btn" class="btn-secondary" style="display: none;">
                        Nonaktifkan Notifikasi
                    </button>
                    <button type="button" id="test-notification-btn" class="btn-secondary" style="display: none;">
                        Test Notifikasi
                    </button>
                </div>
                <div class="notification-info">
                    <h3>Tentang Push Notification</h3>
                    <p>Dengan mengaktifkan notifikasi, Anda akan menerima pemberitahuan ketika:</p>
                    <ul>
                        <li>Ada cerita baru yang ditambahkan</li>
                        <li>Ada update penting dari aplikasi</li>
                        <li>Aktivitas terbaru dari komunitas Story</li>
                    </ul>
                    <p><small>Anda dapat menonaktifkan notifikasi kapan saja melalui pengaturan ini.</small></p>
                </div>
            </div>
        `;

        this.updateNotificationStatus(pushManager);
    }

    async updateNotificationStatus(pushManager) {
        const statusElement = document.getElementById('notification-status');
        const subscribeBtn = document.getElementById('subscribe-btn');
        const unsubscribeBtn = document.getElementById('unsubscribe-btn');
        const testBtn = document.getElementById('test-notification-btn');

        if (!pushManager.isSupported) {
            statusElement.innerHTML = '<span class="status-error">❌ Browser Anda tidak mendukung push notification</span>';
            return;
        }

        try {
            const isInitialized = await pushManager.init();
            
            if (pushManager.isSubscribed()) {
                statusElement.innerHTML = '<span class="status-success">✅ Notifikasi aktif</span>';
                unsubscribeBtn.style.display = 'inline-block';
                testBtn.style.display = 'inline-block';
                subscribeBtn.style.display = 'none';
            } else {
                statusElement.innerHTML = '<span class="status-warning">⚠️ Notifikasi belum aktif</span>';
                subscribeBtn.style.display = 'inline-block';
                unsubscribeBtn.style.display = 'none';
                testBtn.style.display = 'none';
            }
        } catch (error) {
            statusElement.innerHTML = '<span class="status-error">❌ Error: ' + error.message + '</span>';
        }
    }
}

// Presenter
class StoryPresenter {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.pushManager = new PushNotificationManager();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.checkInitialAuth();
        this.initializePushNotifications();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Add story form
        const addStoryForm = document.getElementById('add-story-form');
        if (addStoryForm) {
            addStoryForm.addEventListener('submit', (e) => this.handleAddStory(e));
        }

        // Get current location button
        const getCurrentLocationBtn = document.getElementById('get-current-location');
        if (getCurrentLocationBtn) {
            getCurrentLocationBtn.addEventListener('click', () => this.getCurrentLocation());
        }

        // Notification buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'subscribe-btn') {
                this.handleSubscribeNotification();
            } else if (e.target.id === 'unsubscribe-btn') {
                this.handleUnsubscribeNotification();
            } else if (e.target.id === 'test-notification-btn') {
                this.handleTestNotification();
            }
        });
    }

    setupNavigation() {
        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                e.preventDefault();
                const href = e.target.getAttribute('href');
                
                if (href === '#' && e.target.id === 'logout-btn') {
                    this.handleLogout();
                } else if (href && href.startsWith('#')) {
                    const page = href.substring(1) + '-page';
                    this.navigateToPage(page);
                }
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = (e.state?.page || 'login') + '-page';
            this.view.showPage(page);
        });
    }

    navigateToPage(page) {
        const pageWithoutSuffix = page.replace('-page', '');
        
        // Check authentication for protected pages
        const protectedPages = ['stories', 'add-story', 'notifications'];
        if (protectedPages.includes(pageWithoutSuffix) && !this.model.isLoggedIn()) {
            this.view.showPage('login-page');
            this.view.showAlert('Silakan login terlebih dahulu', 'warning');
            return;
        }

        this.view.showPage(page);
        
        // Initialize page-specific features
        if (page === 'stories-page') {
            this.loadStories();
        } else if (page === 'add-story-page') {
            this.view.initializeAddStoryMap();
            this.view.initializeCamera();
        } else if (page === 'notifications-page') {
            this.view.renderNotificationSettings(this.pushManager);
        }

        // Update browser history
        const pageState = { page: pageWithoutSuffix };
        history.pushState(pageState, '', `#${pageWithoutSuffix}`);
    }

    checkInitialAuth() {
        if (this.model.isLoggedIn()) {
            this.navigateToPage('stories-page');
        } else {
            this.navigateToPage('login-page');
        }
    }

    async loadNotifications() {
        this.view.showNotificationsLoading(true);
        try {
            // Ganti ke getNotificationsDummy() jika endpoint asli tidak tersedia
            // const notifs = await this.model.getNotifications();
            const notifs = await this.model.getNotificationsDummy();
            this.view.renderNotifications(notifs);
        } catch (err) {
            this.view.renderNotifications([]);
            this.view.showAlert('Gagal memuat notifikasi: ' + err.message, 'error');
        } finally {
            this.view.showNotificationsLoading(false);
        }
    }

    // Update navigateToPage agar halaman notifikasi memuat data
    navigateToPage(page) {
        const pageWithoutSuffix = page.replace('-page', '');
        const protectedPages = ['stories', 'add-story', 'notifications'];
        if (protectedPages.includes(pageWithoutSuffix) && !this.model.isLoggedIn()) {
            this.view.showPage('login-page');
            this.view.showAlert('Silakan login terlebih dahulu', 'warning');
            return;
        }
        this.view.showPage(page);

        // Initialize page-specific features
        if (page === 'stories-page') {
            this.loadStories();
        } else if (page === 'add-story-page') {
            this.view.initializeAddStoryMap();
            this.view.initializeCamera();
        } else if (page === 'notifications-page') {
            this.loadNotifications();
            this.view.renderNotificationSettings(this.pushManager);
        }

        // Update browser history
        const pageState = { page: pageWithoutSuffix };
        history.pushState(pageState, '', `#${pageWithoutSuffix}`);
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            this.view.showAlert('Email dan password harus diisi', 'error');
            return;
        }

        this.view.showLoading(true);

        try {
            await this.model.login(email, password);
            this.view.showAlert('Login berhasil!', 'success');
            this.navigateToPage('stories-page');
            
            // Initialize push notifications after login
            this.initializePushNotifications();
        } catch (error) {
            this.view.showAlert(error.message, 'error');
        } finally {
            this.view.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');

        if (!name || !email || !password) {
            this.view.showAlert('Semua field harus diisi', 'error');
            return;
        }

        if (password.length < 8) {
            this.view.showAlert('Password minimal 8 karakter', 'error');
            return;
        }

        this.view.showLoading(true);

        try {
            await this.model.register(name, email, password);
            this.view.showAlert('Registrasi berhasil! Silakan login.', 'success');
            this.navigateToPage('login-page');
        } catch (error) {
            this.view.showAlert(error.message, 'error');
        } finally {
            this.view.showLoading(false);
        }
    }

    async loadStories() {
        this.view.showLoading(true);

        try {
            const stories = await this.model.getStories();
            this.view.renderStories(stories);
        } catch (error) {
            this.view.showAlert('Gagal memuat cerita: ' + error.message, 'error');
        } finally {
            this.view.showLoading(false);
        }
    }

    async handleAddStory(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const description = formData.get('description');
        const lat = formData.get('lat');
        const lon = formData.get('lon');

        if (!description) {
            this.view.showAlert('Deskripsi harus diisi', 'error');
            return;
        }

        if (!this.view.capturedPhotoBlob) {
            this.view.showAlert('Foto harus diambil atau dipilih', 'error');
            return;
        }

        this.view.showLoading(true);

        try {
            await this.model.addStory(
                description, 
                this.view.capturedPhotoBlob, 
                lat || null, 
                lon || null
            );
            
            this.view.showAlert('Cerita berhasil ditambahkan!', 'success');
            this.view.resetAddStoryForm();
            
            // Send push notification to all subscribers
            await this.pushManager.sendNotificationToAll({
                title: 'Cerita Baru!',
                body: `Ada cerita baru: "${description.substring(0, 50)}..."`,
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png'
            });
            
            this.navigateToPage('stories-page');
        } catch (error) {
            this.view.showAlert('Gagal menambahkan cerita: ' + error.message, 'error');
        } finally {
            this.view.showLoading(false);
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.view.showAlert('Browser tidak mendukung geolocation', 'error');
            return;
        }

        this.view.showAlert('Mendapatkan lokasi...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Update form fields
                document.getElementById('story-lat').value = lat;
                document.getElementById('story-lon').value = lon;
                
                // Update map
                this.view.selectedLocation = { lat, lon };
                this.view.addStoryMap.setView([lat, lon], 15);
                
                // Add marker
                L.marker([lat, lon]).addTo(this.view.addStoryMap)
                    .bindPopup('Lokasi Anda').openPopup();
                
                this.view.showAlert('Lokasi berhasil didapatkan', 'success');
            },
            (error) => {
                let errorMessage = 'Gagal mendapatkan lokasi';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Akses lokasi ditolak oleh pengguna';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Informasi lokasi tidak tersedia';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Timeout saat mendapatkan lokasi';
                        break;
                }
                this.view.showAlert(errorMessage, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }

    handleLogout() {
        this.model.logout();
        this.view.showAlert('Logout berhasil', 'info');
        this.navigateToPage('login-page');
    }

    async initializePushNotifications() {
        try {
            await this.pushManager.init();
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
        }
    }

    async handleSubscribeNotification() {
        try {
            this.view.showLoading(true);
            await this.pushManager.subscribe();
            this.view.showAlert('Notifikasi berhasil diaktifkan!', 'success');
            this.view.updateNotificationStatus(this.pushManager);
        } catch (error) {
            this.view.showAlert('Gagal mengaktifkan notifikasi: ' + error.message, 'error');
        } finally {
            this.view.showLoading(false);
        }
    }

    async handleUnsubscribeNotification() {
        try {
            this.view.showLoading(true);
            await this.pushManager.unsubscribe();
            this.view.showAlert('Notifikasi berhasil dinonaktifkan', 'info');
            this.view.updateNotificationStatus(this.pushManager);
        } catch (error) {
            this.view.showAlert('Gagal menonaktifkan notifikasi: ' + error.message, 'error');
        } finally {
            this.view.showLoading(false);
        }
    }

    async handleTestNotification() {
        try {
            await this.pushManager.showTestNotification();
            this.view.showAlert('Test notifikasi dikirim!', 'success');
        } catch (error) {
            this.view.showAlert('Gagal mengirim test notifikasi: ' + error.message, 'error');
        }
    }
}

// Push Notification Manager
class PushNotificationManager {
    constructor() {
        this.vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE'; // Replace with your VAPID public key
        this.registration = null;
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    }

    async init() {
        if (!this.isSupported) {
            throw new Error('Push notifications are not supported in this browser');
        }

        try {
            // Register service worker
            this.registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', this.registration);

            // Check for existing subscription
            this.subscription = await this.registration.pushManager.getSubscription();
            
            return true;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    }

    isSubscribed() {
        return !!this.subscription;
    }

    async subscribe() {
        if (!this.registration) {
            throw new Error('Service Worker not registered');
        }

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }

            // Subscribe to push notifications
            this.subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            // Send subscription to server
            await this.sendSubscriptionToServer(this.subscription);
            
            return this.subscription;
        } catch (error) {
            console.error('Push subscription failed:', error);
            throw error;
        }
    }

    async unsubscribe() {
        if (!this.subscription) {
            throw new Error('No active subscription found');
        }

        try {
            // Unsubscribe from push notifications
            await this.subscription.unsubscribe();
            
            // Remove subscription from server
            await this.removeSubscriptionFromServer(this.subscription);
            
            this.subscription = null;
            return true;
        } catch (error) {
            console.error('Push unsubscription failed:', error);
            throw error;
        }
    }

    async sendSubscriptionToServer(subscription) {
        // In a real application, you would send this to your backend server
        // For demo purposes, we'll store it in memory
        const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
                auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
            }
        };
        
        console.log('Subscription data to send to server:', subscriptionData);
        
        // Store in memory for demo
        if (!window.pushSubscriptions) {
            window.pushSubscriptions = [];
        }
        window.pushSubscriptions.push(subscriptionData);
    }

    async removeSubscriptionFromServer(subscription) {
        // In a real application, you would remove this from your backend server
        console.log('Removing subscription from server:', subscription.endpoint);
        
        // Remove from memory for demo
        if (window.pushSubscriptions) {
            window.pushSubscriptions = window.pushSubscriptions.filter(
                sub => sub.endpoint !== subscription.endpoint
            );
        }
    }

    async sendNotificationToAll(notificationData) {
        // In a real application, this would be handled by your backend server
        // For demo purposes, we'll simulate sending notifications
        console.log('Sending notification to all subscribers:', notificationData);
        
        if (window.pushSubscriptions && window.pushSubscriptions.length > 0) {
            // Simulate backend notification sending
            setTimeout(() => {
                if (this.registration) {
                    this.registration.showNotification(notificationData.title, {
                        body: notificationData.body,
                        icon: notificationData.icon,
                        badge: notificationData.badge,
                        tag: 'story-notification',
                        requireInteraction: false,
                        actions: [
                            {
                                action: 'view',
                                title: 'Lihat Cerita',
                                icon: '/action-view.png'
                            },
                            {
                                action: 'dismiss',
                                title: 'Tutup',
                                icon: '/action-dismiss.png'
                            }
                        ]
                    });
                }
            }, 1000);
        }
    }

    async showTestNotification() {
        if (!this.registration) {
            throw new Error('Service Worker not registered');
        }

        const notificationData = {
            title: 'Test Notifikasi',
            body: 'Ini adalah test notifikasi dari Story App!',
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'test-notification',
            requireInteraction: false
        };

        await this.registration.showNotification(notificationData.title, notificationData);
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

// Initialize the application
let storyApp;

document.addEventListener('DOMContentLoaded', () => {
    // Make model globally available for view
    window.storyModel = new StoryModel();
    const storyView = new StoryView();
    storyApp = new StoryPresenter(window.storyModel, storyView);
});

// Handle page visibility changes to refresh data
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && storyApp && window.storyModel.isLoggedIn()) {
        // Refresh stories when page becomes visible
        if (storyApp.view.currentPage === 'stories-page') {
            storyApp.loadStories();
        }
    }
});

// Handle online/offline events
window.addEventListener('online', () => {
    if (storyApp) {
        storyApp.view.showAlert('Koneksi internet kembali tersedia', 'success');
    }
});

window.addEventListener('offline', () => {
    if (storyApp) {
        storyApp.view.showAlert('Koneksi internet terputus', 'warning');
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StoryModel,
        StoryView,
        StoryPresenter,
        PushNotificationManager
    };
}

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}