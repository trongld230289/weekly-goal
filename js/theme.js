// ===================================
// 🌙 Theme Module (Dark Mode)
// ===================================

const Theme = {
    isDark: false,

    // Initialize theme
    init() {
        // Load saved theme preference
        const savedTheme = Storage.load(Storage.KEYS.THEME, 'light');
        this.isDark = savedTheme === 'dark';
        
        // Apply theme
        this.apply();

        // Setup toggle button
        this.setupToggle();
    },

    // Apply theme to body
    apply() {
        if (this.isDark) {
            document.body.classList.add('dark-mode');
            this.updateToggleIcon('☀️');
        } else {
            document.body.classList.remove('dark-mode');
            this.updateToggleIcon('🌙');
        }
    },

    // Toggle theme
    toggle() {
        this.isDark = !this.isDark;
        this.apply();
        
        // Save preference
        Storage.save(Storage.KEYS.THEME, this.isDark ? 'dark' : 'light');

        // Add a subtle animation effect
        this.addToggleEffect();
    },

    // Update toggle button icon
    updateToggleIcon(icon) {
        const iconElement = document.querySelector('.theme-icon');
        if (iconElement) {
            iconElement.textContent = icon;
        }
    },

    // Setup toggle button event
    setupToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    },

    // Add visual effect when toggling
    addToggleEffect() {
        document.body.style.transition = 'background 0.5s ease, color 0.5s ease';
        
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
    }
};

// Make Theme globally available
window.Theme = Theme;
