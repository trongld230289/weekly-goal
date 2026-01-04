// ===================================
// 🔔 Notifications Module
// ===================================

const Notifications = {
    permission: false,
    reminders: [],

    // Initialize notifications
    init() {
        if ('Notification' in window) {
            this.permission = Notification.permission === 'granted';
        }
    },

    // Request notification permission
    async requestPermission() {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permission = true;
            this.showNotification('Notifications Enabled! 🎉', {
                body: 'You will receive reminders for your scheduled activities.',
                icon: '🔔'
            });
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permission = permission === 'granted';
            
            if (this.permission) {
                this.showNotification('Notifications Enabled! 🎉', {
                    body: 'You will receive reminders for your scheduled activities.',
                    icon: '🔔'
                });
            }
            
            return this.permission;
        }

        return false;
    },

    // Show a notification
    showNotification(title, options = {}) {
        if (!this.permission) return;

        const defaultOptions = {
            icon: '🌸',
            badge: '📅',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            
            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
            
            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    },

    // Schedule a reminder
    scheduleReminder(day, time, activity, category) {
        if (!this.permission) return null;

        const now = new Date();
        const [hours, minutes] = time.split(':');
        const reminderDate = this.getDateForDay(day);
        
        if (!reminderDate) return null;

        reminderDate.setHours(parseInt(hours), parseInt(minutes) - 5, 0, 0); // 5 min before

        const timeUntilReminder = reminderDate.getTime() - now.getTime();

        if (timeUntilReminder > 0) {
            const timeoutId = setTimeout(() => {
                const emoji = this.getCategoryEmoji(category);
                this.showNotification(`Upcoming Activity ${emoji}`, {
                    body: `${activity} starts in 5 minutes!\nTime: ${time} on ${day}`,
                    tag: `${day}-${time}`,
                    requireInteraction: true
                });

                // Play sound (optional)
                this.playNotificationSound();
            }, timeUntilReminder);

            const reminder = {
                id: `${day}-${time}`,
                timeoutId,
                day,
                time,
                activity
            };

            this.reminders.push(reminder);
            return reminder;
        }

        return null;
    },

    // Cancel a reminder
    cancelReminder(day, time) {
        const id = `${day}-${time}`;
        const index = this.reminders.findIndex(r => r.id === id);
        
        if (index !== -1) {
            clearTimeout(this.reminders[index].timeoutId);
            this.reminders.splice(index, 1);
            return true;
        }
        
        return false;
    },

    // Get date for a specific day name
    getDateForDay(dayName) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const currentDay = today.getDay();
        const targetDay = days.indexOf(dayName);

        if (targetDay === -1) return null;

        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);

        return targetDate;
    },

    // Get emoji for category
    getCategoryEmoji(category) {
        const emojis = {
            workout: '🏋️',
            coding: '💻',
            selfcare: '💆',
            sleep: '😴',
            meeting: '👥',
            meal: '🍽️',
            other: '📌'
        };
        return emojis[category] || '⏰';
    },

    // Play notification sound
    playNotificationSound() {
        try {
            // Create a simple beep sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    },

    // Clear all reminders
    clearAllReminders() {
        this.reminders.forEach(reminder => {
            clearTimeout(reminder.timeoutId);
        });
        this.reminders = [];
    }
};

// Initialize on load
Notifications.init();

// Make Notifications globally available
window.Notifications = Notifications;
