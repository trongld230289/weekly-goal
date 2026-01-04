// ===================================
// 📅 Weekly Planner - Main App Logic
// ===================================

const App = {
    currentWeek: new Date(),
    currentCell: null,
    schedule: {},
    workGoals: [],
    meGoals: [],

    // Initialize the app
    init() {
        console.log('🌸 Initializing Weekly Planner...');
        
        // Initialize modules
        Theme.init();
        
        // Load saved data
        this.loadData();
        
        // Generate UI
        this.generateScheduleGrid();
        this.renderGoals();
        this.loadNotes();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update week display
        this.updateWeekDisplay();

        console.log('✨ Weekly Planner ready!');
    },

    // Load data from localStorage
    loadData() {
        this.schedule = Storage.load(Storage.KEYS.SCHEDULE, {});
        this.workGoals = Storage.load(Storage.KEYS.WORK_GOALS, []);
        this.meGoals = Storage.load(Storage.KEYS.ME_GOALS, []);
        
        const savedWeek = Storage.load(Storage.KEYS.CURRENT_WEEK);
        if (savedWeek) {
            this.currentWeek = new Date(savedWeek);
        }
    },

    // Generate schedule grid with time slots
    generateScheduleGrid() {
        const tbody = document.getElementById('scheduleBody');
        tbody.innerHTML = '';

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        // Generate time slots from 5:00 AM to 11:30 PM (30-minute intervals)
        for (let hour = 5; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                const row = document.createElement('tr');

                // Time cell
                const timeCell = document.createElement('td');
                timeCell.className = 'time-col';
                timeCell.textContent = this.formatTime(time);
                row.appendChild(timeCell);

                // Day cells
                days.forEach(day => {
                    const cell = document.createElement('td');
                    cell.dataset.day = day;
                    cell.dataset.time = time;
                    
                    const cellKey = `${day}-${time}`;
                    if (this.schedule[cellKey]) {
                        const data = this.schedule[cellKey];
                        cell.innerHTML = `<div class="cell-content">${this.escapeHtml(data.text)}</div>`;
                        if (data.category) {
                            cell.classList.add(`category-${data.category}`);
                        }
                    }

                    cell.addEventListener('click', (e) => this.openEditModal(day, time));
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            }
        }
    },

    // Format time (convert 24h to 12h format)
    formatTime(time) {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Open edit modal for a cell
    openEditModal(day, time) {
        this.currentCell = { day, time };
        const cellKey = `${day}-${time}`;
        const cellData = this.schedule[cellKey] || { text: '', category: '', reminder: false };

        document.getElementById('activityInput').value = cellData.text || '';
        document.getElementById('categorySelect').value = cellData.category || '';
        document.getElementById('reminderCheck').checked = cellData.reminder || false;

        const modal = document.getElementById('editModal');
        modal.classList.add('active');
    },

    // Close edit modal
    closeEditModal() {
        const modal = document.getElementById('editModal');
        modal.classList.remove('active');
        this.currentCell = null;
    },

    // Save activity from modal
    saveActivity() {
        if (!this.currentCell) return;

        const { day, time } = this.currentCell;
        const cellKey = `${day}-${time}`;
        
        const text = document.getElementById('activityInput').value.trim();
        const category = document.getElementById('categorySelect').value;
        const reminder = document.getElementById('reminderCheck').checked;

        if (text) {
            this.schedule[cellKey] = { text, category, reminder };
            
            // Schedule reminder if enabled
            if (reminder && Notifications.permission) {
                Notifications.scheduleReminder(day, time, text, category);
            }
        } else {
            delete this.schedule[cellKey];
            Notifications.cancelReminder(day, time);
        }

        // Save and refresh
        Storage.save(Storage.KEYS.SCHEDULE, this.schedule);
        this.generateScheduleGrid();
        this.closeEditModal();
    },

    // Delete activity
    deleteActivity() {
        if (!this.currentCell) return;

        const { day, time } = this.currentCell;
        const cellKey = `${day}-${time}`;
        
        delete this.schedule[cellKey];
        Notifications.cancelReminder(day, time);

        Storage.save(Storage.KEYS.SCHEDULE, this.schedule);
        this.generateScheduleGrid();
        this.closeEditModal();
    },

    // Render goals
    renderGoals() {
        this.renderGoalsList('work', this.workGoals);
        this.renderGoalsList('me', this.meGoals);
    },

    // Render a specific goal list
    renderGoalsList(type, goals) {
        const listId = type === 'work' ? 'workGoalsList' : 'meGoalsList';
        const list = document.getElementById(listId);
        list.innerHTML = '';

        goals.forEach(goal => {
            const item = document.createElement('div');
            item.className = 'goal-item' + (goal.completed ? ' completed' : '');
            
            item.innerHTML = `
                <input type="checkbox" ${goal.completed ? 'checked' : ''} 
                    onchange="App.toggleGoal('${type}', ${goal.id})">
                <input type="text" class="goal-text" value="${this.escapeHtml(goal.text)}"
                    onchange="App.updateGoalText('${type}', ${goal.id}, this.value)">
                <button class="delete-goal" onclick="App.deleteGoal('${type}', ${goal.id})">×</button>
            `;
            
            list.appendChild(item);
        });
    },

    // Add new goal
    addGoal(type) {
        const goal = {
            id: Date.now(),
            text: 'New goal...',
            completed: false
        };

        if (type === 'work') {
            this.workGoals.push(goal);
            Storage.save(Storage.KEYS.WORK_GOALS, this.workGoals);
        } else {
            this.meGoals.push(goal);
            Storage.save(Storage.KEYS.ME_GOALS, this.meGoals);
        }

        this.renderGoals();
        
        // Focus on the new goal
        setTimeout(() => {
            const inputs = document.querySelectorAll(`#${type}GoalsList .goal-text`);
            if (inputs.length > 0) {
                inputs[inputs.length - 1].focus();
                inputs[inputs.length - 1].select();
            }
        }, 100);
    },

    // Toggle goal completion
    toggleGoal(type, id) {
        const goals = type === 'work' ? this.workGoals : this.meGoals;
        const goal = goals.find(g => g.id === id);
        
        if (goal) {
            goal.completed = !goal.completed;
            
            if (type === 'work') {
                Storage.save(Storage.KEYS.WORK_GOALS, this.workGoals);
            } else {
                Storage.save(Storage.KEYS.ME_GOALS, this.meGoals);
            }

            this.renderGoals();

            // Confetti effect when completing a goal
            if (goal.completed) {
                this.showConfetti();
            }
        }
    },

    // Update goal text
    updateGoalText(type, id, newText) {
        const goals = type === 'work' ? this.workGoals : this.meGoals;
        const goal = goals.find(g => g.id === id);
        
        if (goal) {
            goal.text = newText;
            
            if (type === 'work') {
                Storage.save(Storage.KEYS.WORK_GOALS, this.workGoals);
            } else {
                Storage.save(Storage.KEYS.ME_GOALS, this.meGoals);
            }
        }
    },

    // Delete goal
    deleteGoal(type, id) {
        if (type === 'work') {
            this.workGoals = this.workGoals.filter(g => g.id !== id);
            Storage.save(Storage.KEYS.WORK_GOALS, this.workGoals);
        } else {
            this.meGoals = this.meGoals.filter(g => g.id !== id);
            Storage.save(Storage.KEYS.ME_GOALS, this.meGoals);
        }

        this.renderGoals();
    },

    // Load notes and retro
    loadNotes() {
        document.getElementById('retroText').value = Storage.load(Storage.KEYS.RETRO, '');
        document.getElementById('noteText').value = Storage.load(Storage.KEYS.NOTE, '');
    },

    // Save notes
    saveNotes() {
        const retro = document.getElementById('retroText').value;
        const note = document.getElementById('noteText').value;
        
        Storage.save(Storage.KEYS.RETRO, retro);
        Storage.save(Storage.KEYS.NOTE, note);
    },

    // Update week display
    updateWeekDisplay() {
        const weekNum = this.getWeekNumber(this.currentWeek);
        const monday = this.getMonday(this.currentWeek);
        const monthName = monday.toLocaleString('default', { month: 'long' });
        const day = monday.getDate();
        
        document.getElementById('weekTitle').textContent = 
            `WEEK ${weekNum} - Week of: ${monthName} ${day}`;
        
        document.getElementById('datePicker').valueAsDate = this.currentWeek;
        
        Storage.save(Storage.KEYS.CURRENT_WEEK, this.currentWeek.toISOString());
    },

    // Get week number
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    },

    // Get Monday of the week
    getMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    // Navigate to previous week
    prevWeek() {
        this.currentWeek.setDate(this.currentWeek.getDate() - 7);
        this.updateWeekDisplay();
    },

    // Navigate to next week
    nextWeek() {
        this.currentWeek.setDate(this.currentWeek.getDate() + 7);
        this.updateWeekDisplay();
    },

    // Handle date picker change
    onDateChange(date) {
        this.currentWeek = new Date(date);
        this.updateWeekDisplay();
    },

    // Show confetti animation
    showConfetti() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = this.getRandomPastelColor();
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 30);
        }
    },

    // Get random pastel color
    getRandomPastelColor() {
        const colors = ['#FFD1DC', '#B5EAD7', '#C7CEEA', '#FFDAB9', '#B4E4FF', '#FFB3D9'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // Setup all event listeners
    setupEventListeners() {
        // Week navigation
        document.getElementById('prevWeek').addEventListener('click', () => this.prevWeek());
        document.getElementById('nextWeek').addEventListener('click', () => this.nextWeek());
        document.getElementById('datePicker').addEventListener('change', (e) => {
            this.onDateChange(e.target.value);
        });

        // Modal controls
        document.querySelector('.close-modal').addEventListener('click', () => this.closeEditModal());
        document.getElementById('saveActivity').addEventListener('click', () => this.saveActivity());
        document.getElementById('deleteActivity').addEventListener('click', () => this.deleteActivity());
        
        // Close modal on outside click
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeEditModal();
            }
        });

        // Goal buttons
        document.querySelectorAll('.add-goal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.addGoal(type);
            });
        });

        // Notes auto-save
        document.getElementById('retroText').addEventListener('change', () => this.saveNotes());
        document.getElementById('noteText').addEventListener('change', () => this.saveNotes());

        // CSV export/import
        document.getElementById('exportBtn').addEventListener('click', () => {
            Storage.downloadCSV();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('csvFileInput').click();
        });

        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const success = Storage.importFromCSV(event.target.result);
                    if (success) {
                        this.loadData();
                        this.generateScheduleGrid();
                        this.renderGoals();
                        this.loadNotes();
                        alert('✅ Data imported successfully!');
                    } else {
                        alert('❌ Error importing CSV file');
                    }
                };
                reader.readAsText(file);
            }
        });

        // Notifications
        document.getElementById('notificationBtn').addEventListener('click', async () => {
            const granted = await Notifications.requestPermission();
            if (granted) {
                alert('🔔 Notifications enabled! You will receive reminders for activities with reminder set.');
            } else {
                alert('❌ Notification permission denied. Please enable it in your browser settings.');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC to close modal
            if (e.key === 'Escape') {
                this.closeEditModal();
            }
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available for inline event handlers
window.App = App;
