(function() {
    // ===== DATA STORAGE =====
    let currentUser = null;
    let currentChatWith = null;
    let messageCheckInterval = null;
    let currentPostImageData = null;
    let searchQuery = '';

    const USERS_KEY = 'cn_users';
    const POSTS_KEY = 'cn_posts';
    const MESSAGES_KEY = 'cn_messages';
    const CONVERSATIONS_KEY = 'cn_conversations';
    const EVENTS_KEY = 'cn_events';

    function initData() {
        if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify([]));
        if (!localStorage.getItem(POSTS_KEY)) localStorage.setItem(POSTS_KEY, JSON.stringify([]));
        if (!localStorage.getItem(MESSAGES_KEY)) localStorage.setItem(MESSAGES_KEY, JSON.stringify([]));
        if (!localStorage.getItem(CONVERSATIONS_KEY)) localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([]));
        if (!localStorage.getItem(EVENTS_KEY)) localStorage.setItem(EVENTS_KEY, JSON.stringify([]));
    }
    initData();

    // ===== DARK MODE =====
    function initDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.body.classList.add('dark');
            const toggleIcon = document.querySelector('#darkModeToggleNav i');
            if (toggleIcon) toggleIcon.classList.replace('fa-moon', 'fa-sun');
        }
        const toggleBtn = document.getElementById('darkModeToggleNav');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark');
                const isDarkNow = document.body.classList.contains('dark');
                localStorage.setItem('darkMode', isDarkNow);
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    if (isDarkNow) {
                        icon.classList.remove('fa-moon');
                        icon.classList.add('fa-sun');
                    } else {
                        icon.classList.remove('fa-sun');
                        icon.classList.add('fa-moon');
                    }
                }
            });
        }
    }
    initDarkMode();

    // ===== HELPER FUNCTIONS =====
    function showToast(msg, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.style.background = isError ? '#dc2626' : '#1e293b';
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }

    function showLoading(msg) {
        const overlay = document.getElementById('loadingOverlay');
        const message = document.getElementById('loadingMessage');
        if (message) message.textContent = msg || 'Loading...';
        if (overlay) overlay.style.display = 'flex';
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // ===== ADDRESS DATA =====
    const provincesByRegion = {
        'NCR': ['Metro Manila'],
        'CAR': ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'],
        'I': ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
        'II': ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
        'III': ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
        'IV-A': ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'],
        'V': ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
        'VI': ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental'],
        'VII': ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor'],
        'VIII': ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'],
        'IX': ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'],
        'X': ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'],
        'XI': ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental'],
        'XII': ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'],
        'XIII': ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'],
        'BARMM': ['Basilan', 'Lanao del Sur', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Sulu', 'Tawi-Tawi']
    };

    const citiesByProvince = {
        'Aurora': ['Baler', 'Casiguran', 'Dilasag', 'Dinalungan', 'Dingalan', 'Dipaculao', 'Maria Aurora', 'San Luis'],
        'Metro Manila': ['Manila', 'Quezon City', 'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig', 'Pateros', 'San Juan', 'Taguig', 'Valenzuela'],
        'Cavite': ['Bacoor', 'Cavite City', 'Dasmariñas', 'General Trias', 'Imus', 'Tagaytay', 'Trece Martires'],
        'Laguna': ['Biñan', 'Cabuyao', 'Calamba', 'San Pablo', 'Santa Rosa'],
        'Batangas': ['Batangas City', 'Lipa', 'Tanauan'],
        'Cebu': ['Cebu City', 'Lapu-Lapu', 'Mandaue', 'Talisay', 'Toledo'],
        'Davao del Sur': ['Davao City', 'Digos']
    };

    // ===== ADDRESS HANDLERS =====
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');
    const streetInput = document.getElementById('street');
    const zipInput = document.getElementById('zip');
    const locationSummary = document.getElementById('locationSummary')?.querySelector('span');

    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            const region = this.value;
            provinceSelect.innerHTML = '<option value="">Select Province</option>';
            provinceSelect.disabled = !region;
            citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
            citySelect.disabled = true;
            barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            barangaySelect.disabled = true;

            if (region && provincesByRegion[region]) {
                provincesByRegion[region].forEach(province => {
                    const option = document.createElement('option');
                    option.value = province;
                    option.textContent = province;
                    provinceSelect.appendChild(option);
                });
            }
            updateLocationSummary();
        });

        provinceSelect.addEventListener('change', function() {
            const province = this.value;
            citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
            citySelect.disabled = !province;
            barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            barangaySelect.disabled = true;

            if (province && citiesByProvince[province]) {
                citiesByProvince[province].forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    citySelect.appendChild(option);
                });
            } else {
                for (let i = 1; i <= 3; i++) {
                    const option = document.createElement('option');
                    option.value = `City ${i}`;
                    option.textContent = `City/Municipality ${i}`;
                    citySelect.appendChild(option);
                }
            }
            updateLocationSummary();
        });

        citySelect.addEventListener('change', function() {
            barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            barangaySelect.disabled = false;
            for (let i = 1; i <= 5; i++) {
                const option = document.createElement('option');
                option.value = `Barangay ${i}`;
                option.textContent = `Barangay ${i}`;
                barangaySelect.appendChild(option);
            }
            updateLocationSummary();
        });

        function updateLocationSummary() {
            const region = regionSelect.selectedOptions[0]?.text.split(' (')[0] || '';
            const province = provinceSelect.value || '';
            const city = citySelect.value || '';
            const barangay = barangaySelect.value || '';
            const street = streetInput.value || '';
            const zip = zipInput.value || '';
            
            if (region && province && city && barangay && street && zip && locationSummary) {
                locationSummary.textContent = `${street}, ${barangay}, ${city}, ${province} ${zip}, ${region}`;
            } else if (locationSummary) {
                locationSummary.textContent = 'Complete address will appear here';
            }
        }

        [streetInput, zipInput].forEach(field => {
            if (field) field.addEventListener('input', updateLocationSummary);
        });
    }

    // ===== PASSWORD HANDLERS =====
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const pass = document.getElementById('password');
            pass.type = pass.type === 'password' ? 'text' : 'password';
            this.className = pass.type === 'password' ? 'fas fa-eye-slash toggle-eye' : 'fas fa-eye toggle-eye';
        });
    }

    const toggleConfirm = document.getElementById('toggleConfirm');
    if (toggleConfirm) {
        toggleConfirm.addEventListener('click', function() {
            const pass = document.getElementById('confirmPassword');
            pass.type = pass.type === 'password' ? 'text' : 'password';
            this.className = pass.type === 'password' ? 'fas fa-eye-slash toggle-eye' : 'fas fa-eye toggle-eye';
        });
    }

    const toggleLogin = document.getElementById('toggleLoginPassword');
    if (toggleLogin) {
        toggleLogin.addEventListener('click', function() {
            const pass = document.getElementById('loginPassword');
            pass.type = pass.type === 'password' ? 'text' : 'password';
            this.className = pass.type === 'password' ? 'fas fa-eye-slash toggle-eye' : 'fas fa-eye toggle-eye';
        });
    }

    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            const pass = this.value;
            const segments = document.querySelectorAll('.strength-segment');
            const strengthText = document.getElementById('strengthText');
            
            segments.forEach(s => s.style.background = '#e2e8f0');
            
            if (!pass) {
                if (strengthText) strengthText.textContent = 'Enter password';
                return;
            }
            
            let score = 0;
            if (pass.length >= 8) score++;
            if (pass.length >= 12) score++;
            if (/[A-Z]/.test(pass)) score++;
            if (/[0-9]/.test(pass)) score++;
            if (/[^A-Za-z0-9]/.test(pass)) score++;
            
            if (score >= 1) segments[0].style.background = '#ef4444';
            if (score >= 2) segments[1].style.background = '#f59e0b';
            if (score >= 3) segments[2].style.background = '#10b981';
            if (score >= 4) segments[3].style.background = '#3b82f6';
            
            const texts = ['Weak', 'Medium', 'Strong', 'Very strong'];
            if (strengthText) strengthText.textContent = score < 1 ? 'Too short' : texts[Math.min(score, 4) - 1];
        });
    }

    function checkMatch() {
        const pass = document.getElementById('password')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;
        const msg = document.getElementById('matchMessage');
        if (msg && confirm && pass !== confirm) {
            msg.textContent = '❌ Passwords do not match';
            msg.style.color = '#ef4444';
        } else if (msg && confirm && pass === confirm) {
            msg.textContent = '✓ Passwords match';
            msg.style.color = '#10b981';
        } else if (msg) {
            msg.textContent = '';
        }
    }
    
    const passField = document.getElementById('password');
    const confirmField = document.getElementById('confirmPassword');
    if (passField) passField.addEventListener('input', checkMatch);
    if (confirmField) confirmField.addEventListener('input', checkMatch);

    // ===== USER FUNCTIONS =====
    function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    function getPosts() { return JSON.parse(localStorage.getItem(POSTS_KEY)) || []; }
    function savePosts(posts) { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)); }
    function getMessages() { return JSON.parse(localStorage.getItem(MESSAGES_KEY)) || []; }
    function saveMessages(messages) { localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages)); }
    function getConversations() { return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY)) || []; }
    function saveConversations(convs) { localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs)); }

    // ===== PROFILE PICTURE FUNCTIONS =====
    function saveProfilePicture(email, imageData) {
        const users = getUsers();
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            users[userIndex].profilePicture = imageData;
            saveUsers(users);
            if (currentUser && currentUser.email === email) {
                currentUser.profilePicture = imageData;
                updateProfilePictureDisplay(imageData);
            }
        }
    }

    function getProfilePicture(email) {
        const users = getUsers();
        const user = users.find(u => u.email === email);
        return user?.profilePicture || null;
    }

    function updateProfilePictureDisplay(imageData) {
        const imgElement = document.getElementById('currentUserProfileImg');
        const avatarDiv = document.getElementById('currentUserAvatar');
        if (imageData && imgElement && avatarDiv) {
            imgElement.src = imageData;
            imgElement.style.display = 'block';
            imgElement.style.width = '60px';
            imgElement.style.height = '60px';
            imgElement.style.borderRadius = '50%';
            imgElement.style.objectFit = 'cover';
            avatarDiv.style.display = 'none';
        } else if (imgElement && avatarDiv) {
            imgElement.style.display = 'none';
            avatarDiv.style.display = 'flex';
            if (currentUser) {
                avatarDiv.textContent = currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
            }
        }
    }

    const uploadProfileBtn = document.getElementById('uploadProfileBtn');
    const profileImageInput = document.getElementById('profileImageInput');
    if (uploadProfileBtn && profileImageInput) {
        uploadProfileBtn.addEventListener('click', () => profileImageInput.click());
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    saveProfilePicture(currentUser.email, event.target.result);
                    showToast('✓ Profile picture updated!');
                    loadMembers();
                    loadFeed();
                };
                reader.readAsDataURL(file);
            } else if (file) {
                showToast('Please select an image file', true);
            }
        });
    }

    // ===== POST IMAGE FUNCTIONS =====
    const postImageInput = document.getElementById('postImageInput');
    const uploadPostImageBtn = document.getElementById('uploadPostImageBtn');
    const postImagePreview = document.getElementById('postImagePreview');
    const postPreviewImg = document.getElementById('postPreviewImg');
    const removePostImageBtn = document.getElementById('removePostImageBtn');

    if (uploadPostImageBtn && postImageInput) {
        uploadPostImageBtn.addEventListener('click', () => postImageInput.click());
        postImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    currentPostImageData = event.target.result;
                    postPreviewImg.src = currentPostImageData;
                    postImagePreview.style.display = 'block';
                    showToast('✓ Image added to post');
                };
                reader.readAsDataURL(file);
            } else {
                showToast('Please select an image file', true);
            }
        });
        if (removePostImageBtn) {
            removePostImageBtn.addEventListener('click', function() {
                currentPostImageData = null;
                postImagePreview.style.display = 'none';
                postPreviewImg.src = '';
                postImageInput.value = '';
                showToast('Image removed');
            });
        }
    }

    // ===== EDIT PROFILE FUNCTIONS =====
    function editProfile(updatedData) {
        const users = getUsers();
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updatedData };
            saveUsers(users);
            currentUser = users[userIndex];
            document.getElementById('currentUserName').textContent = currentUser.fullName;
            document.getElementById('currentUserAvatar').textContent = currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
            if (currentUser.profilePicture) {
                const imgElement = document.getElementById('currentUserProfileImg');
                const avatarDiv = document.getElementById('currentUserAvatar');
                if (imgElement && avatarDiv) {
                    imgElement.src = currentUser.profilePicture;
                    imgElement.style.display = 'block';
                    avatarDiv.style.display = 'none';
                }
            }
            showToast('✓ Profile updated successfully!');
            loadMembers();
            loadFeed();
        }
    }

    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            document.getElementById('editFullName').value = currentUser.fullName || '';
            document.getElementById('editBio').value = currentUser.bio || '';
            document.getElementById('editLocation').value = currentUser.location || '';
            document.getElementById('editWebsite').value = currentUser.website || '';
            editProfileModal.style.display = 'flex';
        });
    }
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            const updatedData = {
                fullName: document.getElementById('editFullName').value,
                bio: document.getElementById('editBio').value,
                location: document.getElementById('editLocation').value,
                website: document.getElementById('editWebsite').value
            };
            if (!updatedData.fullName.trim()) {
                showToast('Name cannot be empty', true);
                return;
            }
            editProfile(updatedData);
            editProfileModal.style.display = 'none';
        });
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => editProfileModal.style.display = 'none');
    }
    window.addEventListener('click', (e) => {
        if (e.target === editProfileModal) editProfileModal.style.display = 'none';
    });

    // ===== REGISTRATION =====
    document.getElementById('registerForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!document.getElementById('privacyCheck').checked) {
            showToast('Please agree to Privacy Policy', true);
            return;
        }
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;
        if (password !== confirm) {
            showToast('Passwords do not match', true);
            return;
        }
        const users = getUsers();
        const email = document.getElementById('email').value;
        if (users.find(u => u.email === email)) {
            showToast('Email already exists', true);
            return;
        }
        const newUser = {
            id: Date.now().toString(),
            email: email,
            password: btoa(password),
            fullName: document.getElementById('fullName').value,
            role: document.getElementById('userRole').value,
            status: 'online',
            sex: document.querySelector('input[name="sex"]:checked')?.value,
            birthdate: document.getElementById('birthdate').value,
            bio: '',
            location: '',
            website: '',
            address: {
                region: regionSelect?.selectedOptions[0]?.text || '',
                province: provinceSelect?.value || '',
                city: citySelect?.value || '',
                barangay: barangaySelect?.value || '',
                street: streetInput?.value || '',
                zip: zipInput?.value || ''
            },
            registeredAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            profilePicture: null
        };
        users.push(newUser);
        saveUsers(users);
        showToast('✓ Registration successful! You can now login');
        document.getElementById('registerForm').reset();
        if (locationSummary) locationSummary.textContent = 'Complete address will appear here';
        document.getElementById('registrationCard').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
    });

    // ===== LOGIN =====
    document.getElementById('loginBtn').addEventListener('click', function() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) {
            showToast('Please enter email and password', true);
            return;
        }
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === btoa(password));
        if (user) {
            currentUser = user;
            user.lastSeen = new Date().toISOString();
            saveUsers(users);
            showToast('✓ Login successful!');
            document.getElementById('currentUserName').textContent = user.fullName;
            document.getElementById('currentUserEmail').textContent = user.email;
            updateProfilePictureDisplay(user.profilePicture);
            if (user.role === 'admin') {
                document.getElementById('currentUserRole').style.display = 'inline';
                document.getElementById('tabPending').style.display = 'block';
                // Show admin toggle button
                const adminToggleBtn = document.getElementById('adminToggleBtn');
                if (adminToggleBtn) adminToggleBtn.style.display = 'inline-block';
            } else {
                document.getElementById('tabPending').style.display = 'none';
                const adminToggleBtn = document.getElementById('adminToggleBtn');
                if (adminToggleBtn) adminToggleBtn.style.display = 'none';
            }
            document.getElementById('loginCard').style.display = 'none';
            document.getElementById('registrationCard').style.display = 'none';
            document.getElementById('mainAppCard').style.display = 'block';
            loadFeed();
            loadMembers();
            loadConversations();
            updateStats();
            startMessageCheck();
        } else {
            showToast('Invalid email or password', true);
        }
    });

    document.getElementById('showLoginBtn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registrationCard').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
    });
    document.getElementById('showRegisterBtn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginCard').style.display = 'none';
        document.getElementById('registrationCard').style.display = 'block';
    });

    // ===== TAB NAVIGATION (WITH EVENTS) =====
    const tabPosts = document.getElementById('tabPosts');
    const tabMembers = document.getElementById('tabMembers');
    const tabMessages = document.getElementById('tabMessages');
    const tabCreate = document.getElementById('tabCreate');
    const tabPending = document.getElementById('tabPending');
    const tabEvents = document.getElementById('tabEvents');

    if (tabPosts) {
        tabPosts.addEventListener('click', () => setActiveTab('posts'));
        tabMembers.addEventListener('click', () => setActiveTab('members'));
        tabMessages.addEventListener('click', () => setActiveTab('messages'));
        tabCreate.addEventListener('click', () => setActiveTab('create'));
        tabPending.addEventListener('click', () => setActiveTab('pending'));
        if (tabEvents) tabEvents.addEventListener('click', () => setActiveTab('events'));
    }

    function setActiveTab(tab) {
        [tabPosts, tabMembers, tabMessages, tabCreate, tabPending, tabEvents].forEach(t => {
            if (t) t.classList.remove('active');
        });
        const postsTabEl = document.getElementById('postsTab');
        const membersTabEl = document.getElementById('membersTab');
        const messagesTabEl = document.getElementById('messagesTab');
        const createTabEl = document.getElementById('createTab');
        const pendingTabEl = document.getElementById('pendingTab');
        const chatViewEl = document.getElementById('chatView');
        const profilePageTabEl = document.getElementById('profilePageTab');
        const eventsTabEl = document.getElementById('eventsTab');
        if (postsTabEl) postsTabEl.style.display = 'none';
        if (membersTabEl) membersTabEl.style.display = 'none';
        if (messagesTabEl) messagesTabEl.style.display = 'none';
        if (createTabEl) createTabEl.style.display = 'none';
        if (pendingTabEl) pendingTabEl.style.display = 'none';
        if (chatViewEl) chatViewEl.style.display = 'none';
        if (profilePageTabEl) profilePageTabEl.style.display = 'none';
        if (eventsTabEl) eventsTabEl.style.display = 'none';
        if (tab === 'posts') {
            if (tabPosts) tabPosts.classList.add('active');
            if (postsTabEl) postsTabEl.style.display = 'block';
            loadFeed();
        } else if (tab === 'members') {
            if (tabMembers) tabMembers.classList.add('active');
            if (membersTabEl) membersTabEl.style.display = 'block';
            loadMembers();
        } else if (tab === 'messages') {
            if (tabMessages) tabMessages.classList.add('active');
            if (messagesTabEl) messagesTabEl.style.display = 'block';
            loadConversations();
        } else if (tab === 'create') {
            if (tabCreate) tabCreate.classList.add('active');
            if (createTabEl) createTabEl.style.display = 'block';
        } else if (tab === 'pending') {
            if (tabPending) tabPending.classList.add('active');
            if (pendingTabEl) pendingTabEl.style.display = 'block';
            loadPending();
        } else if (tab === 'events') {
            if (tabEvents) tabEvents.classList.add('active');
            if (eventsTabEl) eventsTabEl.style.display = 'block';
            loadEvents();
        }
    }

    // ===== LOAD FEED =====
    function loadFeed() {
        const posts = getPosts().filter(p => p.status === 'approved').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const container = document.getElementById('postsList');
        document.getElementById('totalPosts').textContent = getPosts().length;
        document.getElementById('approvedPosts').textContent = getPosts().filter(p => p.status === 'approved').length;
        document.getElementById('pendingPosts').textContent = getPosts().filter(p => p.status === 'pending').length;
        if (!container) return;
        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state">No posts yet. Be the first to post!</div>';
            return;
        }
        let html = '';
        posts.forEach(post => {
            const liked = post.likes?.includes(currentUser.email);
            const authorProfilePic = getProfilePicture(post.author);
            html += `
                <div class="post-card">
                    <div class="post-header">
                        <div class="post-avatar" onclick="viewProfile('${post.author}')" style="background-image: url('${authorProfilePic || ''}'); background-size: cover; background-position: center;">
                            ${!authorProfilePic ? post.authorName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : ''}
                        </div>
                        <div>
                            <div class="post-author" onclick="viewProfile('${post.author}')">${post.authorName}</div>
                            <div class="post-date">${new Date(post.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${post.image ? `<img src="${post.image}" class="post-image" onclick="viewFullImage('${post.image}')">` : ''}
                    <div class="interaction-bar">
                        <div class="interaction-item" onclick="likePost('${post.id}')">
                            <i class="fas fa-heart" style="color: ${liked ? '#ef4444' : '#64748b'};"></i>
                            <span>${post.likes?.length || 0}</span>
                        </div>
                        <div class="interaction-item" onclick="toggleComments('${post.id}')">
                            <i class="fas fa-comment"></i>
                            <span>${post.comments?.length || 0}</span>
                        </div>
                        <div class="interaction-item" onclick="sharePost('${post.id}')">
                            <i class="fas fa-share"></i>
                            <span>${post.shares || 0}</span>
                        </div>
                    </div>
                    <div id="comments-${post.id}" style="display: none;">
                        <div class="comments-section">
                            ${post.comments?.map(c => {
                                const commenterPic = getProfilePicture(c.author);
                                return `
                                    <div class="comment-card">
                                        <div class="comment-header">
                                            <div class="comment-avatar" style="background-image: url('${commenterPic || ''}'); background-size: cover; background-position: center;">
                                                ${!commenterPic ? c.authorName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : ''}
                                            </div>
                                            <div>
                                                <div class="comment-author">${c.authorName}</div>
                                                <div class="post-date">${new Date(c.createdAt).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div class="comment-content">${c.content}</div>
                                    </div>
                                `;
                            }).join('')}
                            <div class="add-comment">
                                <input type="text" id="comment-${post.id}" placeholder="Write a comment...">
                                <button onclick="addComment('${post.id}')">Post</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ===== LOAD MEMBERS =====
    function loadMembers() {
        const users = getUsers().filter(u => u.email !== currentUser.email);
        const container = document.getElementById('membersList');
        document.getElementById('totalMembers').textContent = getUsers().length;
        document.getElementById('onlineMembers').textContent = users.filter(u => {
            const lastSeen = u.lastSeen ? new Date(u.lastSeen) : null;
            return lastSeen && (new Date() - lastSeen) < 60000;
        }).length;
        document.getElementById('hostMembers').textContent = users.filter(u => u.role === 'node-host').length;
        if (!container) return;
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">No other members yet</div>';
            return;
        }
        let html = '';
        users.forEach(user => {
            const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
            const isOnline = lastSeen && (new Date() - lastSeen) < 60000;
            const profilePic = user.profilePicture;
            html += `
                <div class="member-card" onclick="viewProfile('${user.email}')">
                    <div class="member-header">
                        <div class="member-avatar" style="background-image: url('${profilePic || ''}'); background-size: cover; background-position: center;">
                            ${!profilePic ? user.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : ''}
                        </div>
                        <div class="member-info">
                            <div class="member-name">${user.fullName}</div>
                            <div class="member-email">${user.email}</div>
                            ${user.bio ? `<div class="member-bio">${user.bio.substring(0, 60)}${user.bio.length > 60 ? '...' : ''}</div>` : ''}
                        </div>
                        <div class="status-dot" style="background: ${isOnline ? '#22c55e' : '#64748b'};" title="${isOnline ? 'Online' : 'Offline'}"></div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ===== LOAD PENDING =====
    function loadPending() {
        if (!currentUser || currentUser.role !== 'admin') return;
        const posts = getPosts().filter(p => p.status === 'pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const container = document.getElementById('pendingList');
        if (!container) return;
        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state">No pending posts</div>';
            return;
        }
        let html = '';
        posts.forEach(post => {
            const authorProfilePic = getProfilePicture(post.author);
            html += `
                <div class="post-card">
                    <div class="post-header">
                        <div class="post-avatar" style="background-image: url('${authorProfilePic || ''}'); background-size: cover; background-position: center;">
                            ${!authorProfilePic ? post.authorName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : ''}
                        </div>
                        <div>
                            <div class="post-author">${post.authorName}</div>
                            <div class="post-date">${new Date(post.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${post.image ? `<img src="${post.image}" class="post-image" onclick="viewFullImage('${post.image}')">` : ''}
                    <div class="flex" style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn-small btn-approve" onclick="approvePost('${post.id}')">✓ Approve</button>
                        <button class="btn-small btn-reject" onclick="rejectPost('${post.id}')">✗ Reject</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ===== LOAD CONVERSATIONS =====
    function loadConversations() {
        const messages = getMessages();
        const users = getUsers();
        const conversations = new Map();
        messages.forEach(msg => {
            if (msg.sender === currentUser.email || msg.receiver === currentUser.email) {
                const otherEmail = msg.sender === currentUser.email ? msg.receiver : msg.sender;
                const otherUser = users.find(u => u.email === otherEmail);
                if (!conversations.has(otherEmail) || new Date(msg.timestamp) > new Date(conversations.get(otherEmail).lastMessage?.timestamp)) {
                    conversations.set(otherEmail, {
                        with: otherEmail,
                        withName: otherUser?.fullName || 'Unknown',
                        withPicture: otherUser?.profilePicture || null,
                        lastMessage: msg,
                        unread: !msg.read && msg.receiver === currentUser.email
                    });
                }
            }
        });
        const container = document.getElementById('conversationsList');
        const convList = Array.from(conversations.values()).sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));
        document.getElementById('quickUnread').textContent = Array.from(conversations.values()).filter(c => c.unread).length;
        if (tabMessages) tabMessages.setAttribute('data-count', document.getElementById('quickUnread').textContent);
        if (!container) return;
        if (convList.length === 0) {
            container.innerHTML = '<div class="empty-state">No conversations yet</div>';
            return;
        }
        let html = '';
        convList.forEach(conv => {
            html += `
                <div class="member-card" onclick="openChat('${conv.with}')">
                    <div class="member-header">
                        <div class="member-avatar" style="background-image: url('${conv.withPicture || ''}'); background-size: cover; background-position: center;">
                            ${!conv.withPicture ? conv.withName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : ''}
                        </div>
                        <div class="member-info">
                            <div class="member-name">
                                ${conv.withName}
                                ${conv.unread ? '<span class="unread-badge">New</span>' : ''}
                            </div>
                            <div style="font-size: 0.8rem; color: #64748b;">
                                ${conv.lastMessage.content.substring(0,30)}${conv.lastMessage.content.length > 30 ? '...' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ===== POST ACTIONS =====
    window.likePost = function(postId) {
        const posts = getPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
            if (!post.likes) post.likes = [];
            const index = post.likes.indexOf(currentUser.email);
            if (index === -1) post.likes.push(currentUser.email);
            else post.likes.splice(index, 1);
            savePosts(posts);
            loadFeed();
        }
    };

    window.toggleComments = function(postId) {
        const commentsDiv = document.getElementById(`comments-${postId}`);
        if (commentsDiv) commentsDiv.style.display = commentsDiv.style.display === 'none' ? 'block' : 'none';
    };

    window.addComment = function(postId) {
        const input = document.getElementById(`comment-${postId}`);
        const content = input.value.trim();
        if (!content) return;
        const posts = getPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
            if (!post.comments) post.comments = [];
            post.comments.push({
                id: Date.now().toString(),
                author: currentUser.email,
                authorName: currentUser.fullName,
                content: content,
                createdAt: new Date().toISOString()
            });
            savePosts(posts);
            input.value = '';
            loadFeed();
        }
    };

    window.sharePost = function(postId) {
        const posts = getPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
            post.shares = (post.shares || 0) + 1;
            savePosts(posts);
            const shareText = `Check out this post from ${post.authorName}: ${post.content}`;
            if (navigator.share) {
                navigator.share({ title: 'Community Network Post', text: shareText }).catch(() => prompt('Copy this text to share:', shareText));
            } else {
                prompt('Copy this text to share:', shareText);
            }
            loadFeed();
        }
    };

    window.approvePost = function(postId) {
        const posts = getPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
            post.status = 'approved';
            savePosts(posts);
            showToast('✓ Post approved');
            loadPending();
            loadFeed();
        }
    };

    window.rejectPost = function(postId) {
        const posts = getPosts().filter(p => p.id !== postId);
        savePosts(posts);
        showToast('✗ Post rejected');
        loadPending();
    };

    window.viewFullImage = function(imageUrl) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.background = 'rgba(0,0,0,0.9)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10001';
        modal.style.cursor = 'pointer';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `<img src="${imageUrl}" style="max-width: 90%; max-height: 90%; border-radius: 12px;">`;
        document.body.appendChild(modal);
    };

    // ===== CREATE POST =====
    document.getElementById('createPostBtn').addEventListener('click', function() {
        const content = document.getElementById('postContent').value;
        if (!content && !currentPostImageData) {
            showToast('Please enter content or add an image', true);
            return;
        }
        const posts = getPosts();
        const newPost = {
            id: Date.now().toString(),
            author: currentUser.email,
            authorName: currentUser.fullName,
            content: content || '',
            image: currentPostImageData || null,
            status: currentUser.role === 'admin' ? 'approved' : 'pending',
            likes: [],
            comments: [],
            shares: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        posts.push(newPost);
        savePosts(posts);
        showToast('✓ Post created' + (currentUser.role !== 'admin' ? ' (pending approval)' : ''));
        document.getElementById('postContent').value = '';
        currentPostImageData = null;
        if (postImagePreview) postImagePreview.style.display = 'none';
        if (postPreviewImg) postPreviewImg.src = '';
        if (postImageInput) postImageInput.value = '';
        if (currentUser.role === 'admin') loadFeed();
        setActiveTab('posts');
    });

    // ===== CHAT FUNCTIONS =====
    window.openChat = function(email) {
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            currentChatWith = email;
            document.getElementById('messagesTab').style.display = 'none';
            document.getElementById('chatView').style.display = 'block';
            document.getElementById('chatWithName').textContent = user.fullName;
            const chatAvatar = document.getElementById('chatAvatar');
            if (user.profilePicture) {
                chatAvatar.style.backgroundImage = `url('${user.profilePicture}')`;
                chatAvatar.style.backgroundSize = 'cover';
                chatAvatar.style.backgroundPosition = 'center';
                chatAvatar.textContent = '';
            } else {
                chatAvatar.style.backgroundImage = 'none';
                chatAvatar.textContent = user.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
            }
            const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
            const isOnline = lastSeen && (new Date() - lastSeen) < 60000;
            document.getElementById('chatWithStatus').textContent = isOnline ? '🟢 Online' : '⚫ Offline';
            document.getElementById('chatWithStatus').style.color = isOnline ? '#22c55e' : '#64748b';
            loadChatMessages(email);
            markMessagesAsRead(email);
        }
    };

    function loadChatMessages(email) {
        const messages = getMessages().filter(m => (m.sender === currentUser.email && m.receiver === email) || (m.sender === email && m.receiver === currentUser.email)).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const container = document.getElementById('chatMessages');
        let html = '';
        messages.forEach(msg => {
            const isMe = msg.sender === currentUser.email;
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `<div class="message ${isMe ? 'message-sent' : 'message-received'}"><div>${msg.content}</div><div class="message-time">${time}</div></div>`;
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    function markMessagesAsRead(senderEmail) {
        const messages = getMessages();
        let updated = false;
        messages.forEach(msg => {
            if (msg.sender === senderEmail && msg.receiver === currentUser.email && !msg.read) {
                msg.read = true;
                updated = true;
            }
        });
        if (updated) {
            saveMessages(messages);
            loadConversations();
        }
    }

    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', function() {
            const input = document.getElementById('messageInput');
            const content = input.value.trim();
            if (!content || !currentChatWith) return;
            const messages = getMessages();
            messages.push({
                id: Date.now().toString(),
                sender: currentUser.email,
                senderName: currentUser.fullName,
                receiver: currentChatWith,
                content: content,
                timestamp: new Date().toISOString(),
                read: false
            });
            saveMessages(messages);
            input.value = '';
            loadChatMessages(currentChatWith);
            loadConversations();
        });
    }

    const closeChatBtn = document.getElementById('closeChatBtn');
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', function() {
            currentChatWith = null;
            document.getElementById('chatView').style.display = 'none';
            document.getElementById('messagesTab').style.display = 'block';
        });
    }

    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') document.getElementById('sendMessageBtn').click();
        });
    }

    // ===== SEARCH FUNCTION =====
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchQuery = e.target.value.toLowerCase();
            if (document.getElementById('postsTab').style.display !== 'none') {
                const posts = document.querySelectorAll('.post-card');
                posts.forEach(post => {
                    const text = post.textContent.toLowerCase();
                    post.style.display = text.includes(searchQuery) || searchQuery === '' ? 'block' : 'none';
                });
            }
            if (document.getElementById('membersTab').style.display !== 'none') {
                const members = document.querySelectorAll('.member-card');
                members.forEach(member => {
                    const text = member.textContent.toLowerCase();
                    member.style.display = text.includes(searchQuery) || searchQuery === '' ? 'block' : 'none';
                });
            }
        });
    }

    // ===== PROFILE PAGE FUNCTIONS =====
    window.viewProfile = function(email) {
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) return;
        const allPosts = getPosts();
        const userPosts = allPosts.filter(p => p.author === email && p.status === 'approved').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const postCount = userPosts.length;
        const totalLikes = userPosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
        const joinDate = new Date(user.registeredAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('postsTab').style.display = 'none';
        document.getElementById('membersTab').style.display = 'none';
        document.getElementById('messagesTab').style.display = 'none';
        document.getElementById('createTab').style.display = 'none';
        document.getElementById('pendingTab').style.display = 'none';
        document.getElementById('chatView').style.display = 'none';
        document.getElementById('profilePageTab').style.display = 'block';
        let postsHtml = '';
        if (userPosts.length === 0) {
            postsHtml = '<div class="empty-state">No posts yet</div>';
        } else {
            postsHtml = userPosts.map(post => `
                <div class="profile-post-card">
                    <div class="profile-post-content">${post.content}</div>
                    <div class="profile-post-date">${new Date(post.createdAt).toLocaleString()}</div>
                    <div style="margin-top: 8px;"><i class="fas fa-heart" style="color: #ef4444;"></i> ${post.likes?.length || 0} likes</div>
                </div>
            `).join('');
        }
        const roleName = user.role === 'admin' ? 'Administrator' : (user.role === 'node-host' ? 'Node Host' : 'Community Member');
        const profilePic = user.profilePicture;
        const profileHtml = `
            <div class="profile-header-large">
                <div class="profile-avatar-large" style="background-image: url('${profilePic || ''}'); background-size: cover; background-position: center;">
                    ${!profilePic ? user.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : ''}
                </div>
                <div class="profile-name-large">${user.fullName}</div>
                <div class="profile-email-large">${user.email}</div>
                <div class="role-badge-large">${roleName}</div>
            </div>
            ${user.bio ? `<div class="profile-bio-large">${user.bio}</div>` : ''}
            <div class="profile-info-grid">
                ${user.location ? `<div class="profile-info-item"><i class="fas fa-map-marker-alt"></i> ${user.location}</div>` : ''}
                ${user.website ? `<div class="profile-info-item"><i class="fas fa-globe"></i> <a href="${user.website}" target="_blank" style="color: #3b82f6;">${user.website}</a></div>` : ''}
                ${user.address?.city && user.address?.province ? `<div class="profile-info-item"><i class="fas fa-home"></i> ${user.address.city}, ${user.address.province}</div>` : ''}
                <div class="profile-info-item"><i class="fas fa-calendar-alt"></i> Joined ${joinDate}</div>
            </div>
            <div class="profile-stats">
                <div class="profile-stat"><div class="profile-stat-number">${postCount}</div><div class="profile-stat-label">Posts</div></div>
                <div class="profile-stat"><div class="profile-stat-number">${totalLikes}</div><div class="profile-stat-label">Likes Received</div></div>
            </div>
            <button class="profile-message-btn" onclick="openChatAndCloseProfile('${user.email}')"><i class="fas fa-comment-dots"></i> Send Message</button>
            <div class="profile-posts-section"><h3>📝 ${user.fullName}'s Posts</h3><div class="profile-posts-grid">${postsHtml}</div></div>
        `;
        document.getElementById('profilePageContent').innerHTML = profileHtml;
    };

    document.getElementById('closeProfilePageBtn').addEventListener('click', function() {
        document.getElementById('profilePageTab').style.display = 'none';
        document.getElementById('membersTab').style.display = 'block';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('tabMembers').classList.add('active');
        loadMembers();
    });

    window.openChatAndCloseProfile = function(email) {
        document.getElementById('profilePageTab').style.display = 'none';
        openChat(email);
    };

    // ===== START MESSAGE CHECK =====
    function startMessageCheck() {
        if (messageCheckInterval) clearInterval(messageCheckInterval);
        messageCheckInterval = setInterval(() => {
            if (currentUser) {
                loadConversations();
                if (currentChatWith) loadChatMessages(currentChatWith);
                updateStats();
            }
        }, 3000);
    }

    // ===== UPDATE STATS =====
    function updateStats() {
        const users = getUsers();
        const posts = getPosts();
        const onlineCount = users.filter(u => {
            const lastSeen = u.lastSeen ? new Date(u.lastSeen) : null;
            return lastSeen && (new Date() - lastSeen) < 60000 && u.email !== currentUser?.email;
        }).length;
        document.getElementById('quickMembers').textContent = users.length;
        document.getElementById('quickPosts').textContent = posts.length;
        document.getElementById('statTotalMembers').textContent = users.length;
        document.getElementById('statOnlineMembers').textContent = onlineCount;
        document.getElementById('statHostMembers').textContent = users.filter(u => u.role === 'node-host').length;
        document.getElementById('statTotalPosts').textContent = posts.length;
        const onlineUsers = users.filter(u => {
            const lastSeen = u.lastSeen ? new Date(u.lastSeen) : null;
            return lastSeen && (new Date() - lastSeen) < 60000 && u.email !== currentUser?.email;
        });
        let onlineHtml = '';
        onlineUsers.forEach(u => {
            onlineHtml += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;" onclick="openChat('${u.email}')"><div class="status-dot" style="background: #22c55e;"></div><span>${u.fullName}</span></div>`;
        });
        document.getElementById('onlineMembersList').innerHTML = onlineHtml || '<p style="color: #64748b;">No online members</p>';
    }

    // ===== LOGOUT =====
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (messageCheckInterval) clearInterval(messageCheckInterval);
        if (currentUser) {
            const users = getUsers();
            const user = users.find(u => u.email === currentUser.email);
            if (user) {
                user.lastSeen = new Date().toISOString();
                saveUsers(users);
            }
        }
        currentUser = null;
        currentChatWith = null;
        document.getElementById('mainAppCard').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        showToast('✓ Logged out');
    });

    // ===== SCREEN SIZE =====
    function checkScreenSize() {
        const rightSidebar = document.querySelector('.right-sidebar');
        if (window.innerWidth >= 1024 && rightSidebar) {
            rightSidebar.style.display = 'block';
        } else if (rightSidebar) {
            rightSidebar.style.display = 'none';
        }
    }
    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();

    // ===== EVENTS FUNCTIONS =====
    function getEvents() {
        return JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
    }

    function saveEvents(events) {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    }

    function createEvent(eventData) {
        const events = getEvents();
        const newEvent = {
            id: Date.now().toString(),
            ...eventData,
            createdAt: new Date().toISOString(),
            attendees: []
        };
        events.push(newEvent);
        saveEvents(events);
        return newEvent;
    }

    function rsvpEvent(eventId, userEmail, action) {
        const events = getEvents();
        const event = events.find(e => e.id === eventId);
        if (!event) return false;
        if (action === 'join') {
            if (!event.attendees.includes(userEmail)) event.attendees.push(userEmail);
        } else if (action === 'leave') {
            event.attendees = event.attendees.filter(email => email !== userEmail);
        }
        saveEvents(events);
        return true;
    }

    function deleteEvent(eventId) {
        let events = getEvents();
        events = events.filter(e => e.id !== eventId);
        saveEvents(events);
    }

    function loadEvents() {
        const events = getEvents();
        events.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        const container = document.getElementById('eventsList');
        if (!container) return;
        if (events.length === 0) {
            container.innerHTML = '<div class="empty-state">No events yet. Create one!</div>';
            return;
        }
        let html = '';
        events.forEach(event => {
            const isAttending = event.attendees.includes(currentUser.email);
            const attendeeCount = event.attendees.length;
            const eventDate = new Date(event.datetime).toLocaleString();
            html += `
                <div class="event-card">
                    <div class="event-header">
                        <h3>${escapeHtml(event.title)}</h3>
                        <span class="event-date"><i class="far fa-calendar-alt"></i> ${eventDate}</span>
                    </div>
                    <p class="event-desc">${escapeHtml(event.description)}</p>
                    <div class="event-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.location)}</div>
                    <div class="event-footer">
                        <span class="event-attendees"><i class="fas fa-users"></i> ${attendeeCount} attending</span>
                        <button class="btn-small rsvp-btn ${isAttending ? 'btn-leave' : 'btn-join'}" data-event-id="${event.id}">
                            ${isAttending ? '❌ Leave Event' : '✅ Join Event'}
                        </button>
                        ${currentUser.role === 'admin' ? `<button class="btn-small btn-delete delete-event-btn" data-event-id="${event.id}">Delete</button>` : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        document.querySelectorAll('.rsvp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                const isAttending = btn.classList.contains('btn-leave');
                if (isAttending) {
                    rsvpEvent(eventId, currentUser.email, 'leave');
                    showToast('You left the event');
                } else {
                    rsvpEvent(eventId, currentUser.email, 'join');
                    showToast('You joined the event');
                }
                loadEvents();
            });
        });
        document.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this event?')) {
                    deleteEvent(btn.dataset.eventId);
                    loadEvents();
                    showToast('Event deleted');
                }
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    const createEventBtn = document.getElementById('createEventBtn');
    const createEventModal = document.getElementById('createEventModal');
    const closeEventModal = document.getElementById('closeEventModal');
    const saveEventBtn = document.getElementById('saveEventBtn');

    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
            createEventModal.style.display = 'flex';
        });
    }
    if (closeEventModal) {
        closeEventModal.addEventListener('click', () => {
            createEventModal.style.display = 'none';
        });
    }
    if (saveEventBtn) {
        saveEventBtn.addEventListener('click', () => {
            const title = document.getElementById('eventTitle').value.trim();
            const description = document.getElementById('eventDesc').value.trim();
            const datetime = document.getElementById('eventDatetime').value;
            const location = document.getElementById('eventLocation').value.trim();
            if (!title || !datetime) {
                showToast('Please fill in title and date/time', true);
                return;
            }
            createEvent({ title, description, datetime, location });
            createEventModal.style.display = 'none';
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDesc').value = '';
            document.getElementById('eventDatetime').value = '';
            document.getElementById('eventLocation').value = '';
            showToast('Event created!');
            if (document.getElementById('eventsTab').style.display !== 'none') loadEvents();
        });
    }

    // ==================== ADMIN DASHBOARD ====================
    function refreshAdminPanel() {
        const users = getUsers();
        const posts = getPosts();
        const adminStats = document.getElementById('adminStats');
        const usersTableBody = document.querySelector('#usersTable tbody');
        if (adminStats) {
            adminStats.innerHTML = `
                <div class="stat-card">Total Users: ${users.length}</div>
                <div class="stat-card">Total Posts: ${posts.length}</div>
                <div class="stat-card">Admins: ${users.filter(u => u.role === 'admin').length}</div>
            `;
        }
        if (usersTableBody) {
            usersTableBody.innerHTML = users.map(user => `
                <tr>
                    <td>${escapeHtml(user.fullName)}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${escapeHtml(user.role)}</td>
                    <td><button class="action-btn danger" data-user-id="${user.id}">Delete User</button></td>
                </tr>
            `).join('');
            document.querySelectorAll('[data-user-id]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const userId = btn.dataset.userId;
                    if (confirm('Delete this user and all their posts?')) {
                        let usersArr = getUsers();
                        let postsArr = getPosts();
                        usersArr = usersArr.filter(u => u.id !== userId);
                        postsArr = postsArr.filter(p => p.author !== usersArr.find(u => u.id === userId)?.email);
                        saveUsers(usersArr);
                        savePosts(postsArr);
                        if (currentUser && currentUser.id === userId) {
                            document.getElementById('logoutBtn').click();
                        } else {
                            refreshAdminPanel();
                            loadMembers();
                            loadFeed();
                            updateStats();
                        }
                        showToast('User deleted');
                    }
                });
            });
        }
    }

    const adminToggleBtn = document.getElementById('adminToggleBtn');
    const adminDashboard = document.getElementById('adminDashboard');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    if (adminToggleBtn && adminDashboard) {
        adminToggleBtn.addEventListener('click', () => {
            if (currentUser && currentUser.role === 'admin') {
                adminDashboard.classList.toggle('visible');
                if (adminDashboard.classList.contains('visible')) {
                    refreshAdminPanel();
                }
            } else {
                showToast('Admin access only', true);
            }
        });
    }
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', () => {
            adminDashboard.classList.remove('visible');
        });
    }

    // Auto-hide admin dashboard on logout
    const originalLogout = document.getElementById('logoutBtn').click;
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (adminDashboard) adminDashboard.classList.remove('visible');
    });

    hideLoading();
})();