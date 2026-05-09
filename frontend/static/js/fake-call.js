/**
 * Professional Fake Call System
 * Features: Dynamic Caller Identity, Device-Specific Themes, Real-time Lifecycle
 */

const FakeCallSystem = {
    // 1. Configuration & State
    config: {
        names: ["Papa", "Mummy", "Bhai", "Brother", "Mom", "Dad", "Unknown Number", "Police", "Friend", "Home", "Siddharth", "Aisha"],
        assets: {
            iphone: {
                ringtone: 'static/assets/audio/iphone.mp3',
                fallback: 'https://raw.githubusercontent.com/shubham-kumar-2003/Women-Safety-App/main/assets/iphone_ringtone.mp3',
                themeClass: 'theme-iphone'
            },
            android: {
                ringtone: 'static/assets/audio/android.mp3',
                fallback: 'https://raw.githubusercontent.com/shubham-kumar-2003/Women-Safety-App/main/assets/android_ringtone.mp3',
                themeClass: 'theme-android'
            }
        }
    },

    state: {
        active: false,
        theme: null,
        caller: '',
        status: 'idle', // idle, ringing, active
        seconds: 0,
        timer: null,
        audio: new Audio()
    },

    // 2. Initialization
    init() {
        console.log("🚀 SafeHer Fake Call System Booted");
        this.createDOM();
        this.setupSidebar();
    },

    // 3. UI Construction
    createDOM() {
        if (document.getElementById('fake-call-container')) return;

        const container = document.createElement('div');
        container.id = 'fake-call-container';
        container.className = 'fake-call-root hidden';
        container.innerHTML = `
            <div id="call-screen" class="call-screen">
                <!-- Header Info -->
                <div class="caller-id-section">
                    <div class="android-avatar"><i class="fas fa-user"></i></div>
                    <h1 id="display-caller-name">Unknown</h1>
                    <p id="display-call-status">Incoming call</p>
                </div>

                <!-- Action Buttons (Incoming) -->
                <div id="incoming-actions" class="actions-grid">
                    <div class="action-item">
                        <button class="btn-round btn-decline" onclick="FakeCallSystem.handleDecline()">
                            <i class="fas fa-phone-slash"></i>
                        </button>
                        <span>Decline</span>
                    </div>
                    <div class="action-item">
                        <button class="btn-round btn-accept" onclick="FakeCallSystem.handleAccept()">
                            <i class="fas fa-phone"></i>
                        </button>
                        <span>Accept</span>
                    </div>
                </div>

                <!-- Active Call View (Initially Hidden) -->
                <div id="active-call-overlay" class="active-overlay hidden">
                    <div class="active-info">
                        <h2 id="active-caller-name">Unknown</h2>
                        <div id="call-timer">00:00</div>
                    </div>
                    <div class="active-controls">
                        <div class="control-row">
                            <div class="icon-btn"><i class="fas fa-th"></i><span>keypad</span></div>
                            <div class="icon-btn"><i class="fas fa-microphone-slash"></i><span>mute</span></div>
                            <div class="icon-btn"><i class="fas fa-volume-up"></i><span>speaker</span></div>
                        </div>
                        <button class="btn-round btn-end" onclick="FakeCallSystem.handleEnd()">
                            <i class="fas fa-phone-slash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    },

    // 4. Sidebar Integration
    setupSidebar() {
        const toggle = document.getElementById('fake-call-toggle');
        const menu = document.getElementById('fake-call-menu');

        if (toggle && menu) {
            toggle.style.display = 'flex';
            toggle.onclick = (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            };

            document.addEventListener('click', () => menu.style.display = 'none');
            menu.onclick = (e) => e.stopPropagation();
        }
    },

    // 5. Core Logic
    getRandomCaller() {
        const list = this.config.names;
        return list[Math.floor(Math.random() * list.length)];
    },

    async start(theme) {
        if (this.state.active) return;

        // Set State
        this.state.active = true;
        this.state.theme = theme;
        this.state.status = 'ringing';
        this.state.caller = this.getRandomCaller();
        this.state.seconds = 0;

        const root = document.getElementById('fake-call-container');
        const screen = document.getElementById('call-screen');
        const config = this.config.assets[theme];

        // Update UI
        root.classList.remove('hidden');
        screen.className = `call-screen ${config.themeClass}`;
        document.getElementById('display-caller-name').textContent = this.state.caller;
        document.getElementById('display-call-status').textContent = theme === 'iphone' ? 'mobile' : 'Incoming call';
        document.getElementById('active-caller-name').textContent = this.state.caller;
        document.getElementById('incoming-actions').classList.remove('hidden');
        document.getElementById('active-call-overlay').classList.add('hidden');

        // Play Audio
        this.state.audio.src = config.ringtone;
        this.state.audio.loop = true;
        
        try {
            await this.state.audio.play();
        } catch (err) {
            console.warn("⚠️ Local audio blocked or missing, using web fallback");
            this.state.audio.src = config.fallback;
            this.state.audio.play().catch(e => alert("Please tap anywhere on screen to enable ringtone."));
        }
    },

    handleAccept() {
        if (this.state.status !== 'ringing') return;
        
        this.state.status = 'active';
        this.state.audio.pause();
        
        document.getElementById('incoming-actions').classList.add('hidden');
        document.getElementById('active-call-overlay').classList.remove('hidden');

        // Start Timer
        const timerEl = document.getElementById('call-timer');
        this.state.timer = setInterval(() => {
            this.state.seconds++;
            const m = Math.floor(this.state.seconds / 60).toString().padStart(2, '0');
            const s = (this.seconds % 60).toString().padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;
        }, 1000);
    },

    handleDecline() {
        this.reset();
    },

    handleEnd() {
        this.reset();
    },

    reset() {
        this.state.active = false;
        this.state.status = 'idle';
        this.state.audio.pause();
        this.state.audio.currentTime = 0;
        
        if (this.state.timer) clearInterval(this.state.timer);
        
        document.getElementById('fake-call-container').classList.add('hidden');
        
        // Clean navigation
        if (!window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'dashboard.html';
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => FakeCallSystem.init());
