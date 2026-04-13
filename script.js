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
    const EVENTS_KEY = 'cn_events';  // NEW

    function initData() {
        if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify([]));
        if (!localStorage.getItem(POSTS_KEY)) localStorage.setItem(POSTS_KEY, JSON.stringify([]));
        if (!localStorage.getItem(MESSAGES_KEY)) localStorage.setItem(MESSAGES_KEY, JSON.stringify([]));
        if (!localStorage.getItem(CONVERSATIONS_KEY)) localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([]));
        if (!localStorage.getItem(EVENTS_KEY)) localStorage.setItem(EVENTS_KEY, JSON.stringify([]));  // NEW
    }
    initData();

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

    // ===== ADDRESS DATA (unchanged) =====
    const provincesByRegion = { /* ... keep your existing object ... */ };
    const citiesByProvince = { /* ... keep your existing object ... */ };

    // ... (keep all your existing address handlers, password handlers, user functions, profile picture, etc.) ...
    // To save space, I'm not repeating the entire unchanged code, but in the final file everything stays.

    // ===== EVENTS FUNCTIONS (NEW) =====
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

        // Attach event listeners
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

    // ===== CREATE EVENT MODAL HANDLERS =====
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
            createEvent({
                title,
                description,
                datetime,
                location
            });
            createEventModal.style.display = 'none';
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDesc').value = '';
            document.getElementById('eventDatetime').value = '';
            document.getElementById('eventLocation').value = '';
            showToast('Event created!');
            if (document.getElementById('eventsTab').style.display !== 'none') loadEvents();
        });
    }

    // ===== MODIFIED TAB NAVIGATION (add events tab) =====
    const tabPosts = document.getElementById('tabPosts');
    const tabMembers = document.getElementById('tabMembers');
    const tabMessages = document.getElementById('tabMessages');
    const tabCreate = document.getElementById('tabCreate');
    const tabPending = document.getElementById('tabPending');
    const tabEvents = document.getElementById('tabEvents');  // NEW

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
        const eventsTabEl = document.getElementById('eventsTab');  // NEW
        
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
        } else if (tab === 'events') {  // NEW
            if (tabEvents) tabEvents.classList.add('active');
            if (eventsTabEl) eventsTabEl.style.display = 'block';
            loadEvents();
        }
    }

    // ===== THE REST OF YOUR EXISTING CODE (loadFeed, loadMembers, loadPending, loadConversations, etc.) =====
    // ... (keep all your existing functions exactly as they were) ...
    // I'm omitting them here for brevity, but in the final file they remain unchanged.

    // ===== LOGOUT, SCREEN SIZE, ETC. (unchanged) =====
    // ... (keep all the original closing parts) ...

    hideLoading();
})();