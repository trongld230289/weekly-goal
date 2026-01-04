// ===================================
// 📅 Weekly Planner - Main App Logic
// ===================================

const App = {
    // Gantt chart time configuration
    START_HOUR: 5,        // 5:00 AM
    END_HOUR: 24,         // 11:00 PM (exclusive)
    TOTAL_HOURS: 19,      // 5AM to 11PM = 19 hours
    TOTAL_MINUTES: 1140,  // 19 * 60 minutes
    SNAP_MINUTES: 15,     // Snap to 15-minute intervals
    
    currentWeek: new Date(),
    currentCell: null,
    schedule: {},
    workGoals: [],
    meGoals: [],
    draggedElement: null,
    draggedData: null,
    resizing: false,
    weekHistory: {}, // Store history of weeks for copy feature

    // Initialize the app
    init() {
        console.log('🌸 Initializing Weekly Planner...');
        
        // Initialize modules
        Theme.init();
        
        // Load saved week or use current week
        const savedWeek = Storage.load(Storage.KEYS.CURRENT_WEEK);
        if (savedWeek) {
            this.currentWeek = new Date(savedWeek);
        }
        
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
        
        // Initialize drag and drop
        this.initDragAndDrop();

        console.log('✨ Weekly Planner ready!');
    },

    // Load data from localStorage (week-specific)
    loadData() {
        const weekKey = this.getWeekKey(this.currentWeek);
        this.schedule = Storage.load(`${Storage.KEYS.SCHEDULE}_${weekKey}`, {});
        this.workGoals = Storage.load(`${Storage.KEYS.WORK_GOALS}_${weekKey}`, []);
        this.meGoals = Storage.load(`${Storage.KEYS.ME_GOALS}_${weekKey}`, []);
    },
    
    // Save data to localStorage (week-specific)
    saveData() {
        const weekKey = this.getWeekKey(this.currentWeek);
        Storage.save(`${Storage.KEYS.SCHEDULE}_${weekKey}`, this.schedule);
        Storage.save(`${Storage.KEYS.WORK_GOALS}_${weekKey}`, this.workGoals);
        Storage.save(`${Storage.KEYS.ME_GOALS}_${weekKey}`, this.meGoals);
    },

    // Generate schedule grid in Gantt chart format
    generateScheduleGrid() {
        const ganttBody = document.getElementById('ganttBody');
        const ganttTimeline = document.getElementById('ganttTimeline');
        
        if (!ganttBody || !ganttTimeline) return;
        
        ganttBody.innerHTML = '';
        ganttTimeline.innerHTML = '';

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        // Generate time ruler (using configured hours)
        for (let hour = this.START_HOUR; hour < this.END_HOUR; hour++) {
            const slot = document.createElement('div');
            slot.className = 'gantt-time-slot';
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            slot.textContent = `${displayHour}${ampm}`;
            ganttTimeline.appendChild(slot);
        }
        
        // Generate day rows
        days.forEach((day, index) => {
            const monday = this.getMonday(this.currentWeek);
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + index);
            
            const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
            
            const row = document.createElement('div');
            row.className = 'gantt-row';
            row.dataset.day = day;
            
            // Day label
            const label = document.createElement('div');
            label.className = 'gantt-row-label';
            label.innerHTML = `
                <span class="day-name">${day}</span>
                <span class="day-date">${dateStr}</span>
            `;
            
            // Row content (where bars will be positioned)
            const content = document.createElement('div');
            content.className = 'gantt-row-content';
            content.dataset.day = day;
            
            // Render activity bars for this day
            this.renderActivityBars(content, day);
            
            // Click to add new activity
            content.addEventListener('click', (e) => {
                if (!e.target.closest('.gantt-bar')) {
                    // Calculate time based on click position
                    const rect = content.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = clickX / rect.width;
                    const hourOffset = Math.floor(percentage * this.TOTAL_HOURS);
                    const hour = this.START_HOUR + hourOffset;
                    const time = `${String(hour).padStart(2, '0')}:00`;
                    this.openEditModal(day, time);
                }
            });
            
            row.appendChild(label);
            row.appendChild(content);
            ganttBody.appendChild(row);
        });
        
        // Add current time indicator
        this.addCurrentTimeIndicator();
    },
    
    // Render activity bars for a specific day
    renderActivityBars(container, day) {
        // Find all activities for this day
        const dayActivities = [];
        for (const [key, value] of Object.entries(this.schedule)) {
            const [activityDay, time] = key.split('-');
            if (activityDay === day) {
                dayActivities.push({ time, ...value, key });
            }
        }
        
        // Sort by time
        dayActivities.sort((a, b) => a.time.localeCompare(b.time));
        
        // Render each activity as a bar
        dayActivities.forEach(activity => {
            const bar = this.createActivityBar(day, activity.time, activity);
            container.appendChild(bar);
        });
        
        // Check for overlaps
        this.checkOverlaps(container);
    },
    
    // Create an activity bar element
    createActivityBar(day, time, data) {
        const bar = document.createElement('div');
        bar.className = `gantt-bar category-${data.category || 'other'}`;
        bar.dataset.day = day;
        bar.dataset.time = time;
        bar.draggable = true;
        
        // Calculate position and width
        const { left, width } = this.calculateBarPosition(time, data.duration || 60);
        bar.style.left = left + '%';
        bar.style.width = width + '%';
        
        // Bar content
        bar.innerHTML = `
            <div class="resize-handle-left"></div>
            ${this.escapeHtml(data.text)}
            <div class="resize-handle-right"></div>
        `;
        
        // Click to edit
        bar.addEventListener('click', (e) => {
            if (!e.target.classList.contains('resize-handle-left') && 
                !e.target.classList.contains('resize-handle-right')) {
                e.stopPropagation();
                this.openEditModal(day, time);
            }
        });
        
        return bar;
    },
    
    // Calculate bar position and width based on time and duration
    calculateBarPosition(time, duration) {
        const [hours, minutes] = time.split(':').map(Number);
        const startMinutes = (hours - this.START_HOUR) * 60 + minutes;
        
        const left = (startMinutes / this.TOTAL_MINUTES) * 100;
        const width = (duration / this.TOTAL_MINUTES) * 100;
        
        return { left, width };
    },
    
    // Check for overlapping activities
    checkOverlaps(container) {
        const bars = Array.from(container.querySelectorAll('.gantt-bar'));
        
        bars.forEach(bar => {
            bar.classList.remove('overlap-warning');
        });
        
        for (let i = 0; i < bars.length; i++) {
            for (let j = i + 1; j < bars.length; j++) {
                const bar1 = bars[i];
                const bar2 = bars[j];
                
                const left1 = parseFloat(bar1.style.left);
                const width1 = parseFloat(bar1.style.width);
                const right1 = left1 + width1;
                
                const left2 = parseFloat(bar2.style.left);
                const width2 = parseFloat(bar2.style.width);
                const right2 = left2 + width2;
                
                // Check if they overlap
                if (left1 < right2 && left2 < right1) {
                    bar1.classList.add('overlap-warning');
                    bar2.classList.add('overlap-warning');
                }
            }
        }
    },
    
    // Add current time indicator
    addCurrentTimeIndicator() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        // Only show if current time is within our range
        if (currentHour >= this.START_HOUR && currentHour < this.END_HOUR) {
            const minutesFromStart = (currentHour - this.START_HOUR) * 60 + currentMinutes;
            const position = (minutesFromStart / this.TOTAL_MINUTES) * 100;
            
            // Add to each row
            const rows = document.querySelectorAll('.gantt-row-content');
            rows.forEach(row => {
                // Check if this row is today
                const dayName = row.dataset.day;
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayName = daysOfWeek[now.getDay()];
                
                if (dayName === todayName) {
                    const indicator = document.createElement('div');
                    indicator.className = 'current-time-indicator';
                    indicator.style.left = position + '%';
                    row.appendChild(indicator);
                }
            });
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
        const cellData = this.schedule[cellKey] || { text: '', category: '', reminder: false, duration: 60 };

        document.getElementById('activityInput').value = cellData.text || '';
        document.getElementById('categorySelect').value = cellData.category || '';
        document.getElementById('durationSelect').value = cellData.duration || 60;
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
        const duration = parseInt(document.getElementById('durationSelect').value);
        const reminder = document.getElementById('reminderCheck').checked;

        if (text) {
            this.schedule[cellKey] = { text, category, duration, reminder };
            
            // Schedule reminder if enabled
            if (reminder && Notifications.permission) {
                Notifications.scheduleReminder(day, time, text, category);
            }
        } else {
            delete this.schedule[cellKey];
            Notifications.cancelReminder(day, time);
        }

        // Save and refresh
        this.saveData();
        this.saveWeekHistory(); // Save to week history for copy feature
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

        this.saveData();
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
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
            text: 'New goal...',
            completed: false
        };

        if (type === 'work') {
            this.workGoals.push(goal);
            this.saveData();
        } else {
            this.meGoals.push(goal);
            this.saveData();
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
            
            this.saveData();

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
            
            this.saveData();
        }
    },

    // Delete goal
    deleteGoal(type, id) {
        if (type === 'work') {
            this.workGoals = this.workGoals.filter(g => g.id !== id);
            this.saveData();
        } else {
            this.meGoals = this.meGoals.filter(g => g.id !== id);
            this.saveData();
        }

        this.renderGoals();
    },

    // Load notes and retro (week-specific)
    loadNotes() {
        const weekKey = this.getWeekKey(this.currentWeek);
        document.getElementById('retroText').value = Storage.load(`${Storage.KEYS.RETRO}_${weekKey}`, '');
        document.getElementById('noteText').value = Storage.load(`${Storage.KEYS.NOTE}_${weekKey}`, '');
    },

    // Save notes (week-specific)
    saveNotes() {
        const weekKey = this.getWeekKey(this.currentWeek);
        const retro = document.getElementById('retroText').value;
        const note = document.getElementById('noteText').value;
        
        Storage.save(`${Storage.KEYS.RETRO}_${weekKey}`, retro);
        Storage.save(`${Storage.KEYS.NOTE}_${weekKey}`, note);
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
        this.saveData(); // Save current week data
        this.saveWeekHistory(); // Save current week before switching
        this.currentWeek.setDate(this.currentWeek.getDate() - 7);
        this.updateWeekDisplay();
        this.loadData(); // Load data for the new week
        this.generateScheduleGrid();
        this.renderGoals();
        this.loadNotes();
    },

    // Navigate to next week
    nextWeek() {
        this.saveData(); // Save current week data
        this.saveWeekHistory(); // Save current week before switching
        this.currentWeek.setDate(this.currentWeek.getDate() + 7);
        this.updateWeekDisplay();
        this.loadData(); // Load data for the new week
        this.generateScheduleGrid();
        this.renderGoals();
        this.loadNotes();
    },

    // Handle date picker change
    onDateChange(date) {
        this.saveData(); // Save current week data
        this.currentWeek = new Date(date);
        this.updateWeekDisplay();
        this.loadData(); // Load new week data
        this.generateScheduleGrid();
        this.renderGoals();
        this.loadNotes();
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
                this.closeCopyWeekModal();
            }
        });
        
        // Copy Week button
        document.getElementById('copyWeekBtn').addEventListener('click', () => this.openCopyWeekModal());
        
        // Copy Week modal controls
        document.querySelectorAll('.close-copy-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeCopyWeekModal());
        });
        
        document.getElementById('confirmCopy').addEventListener('click', () => this.confirmCopyWeek());
        
        document.getElementById('copyWeekModal').addEventListener('click', (e) => {
            if (e.target.id === 'copyWeekModal') {
                this.closeCopyWeekModal();
            }
        });
    },
    
    // ===================================
    // 🎨 GANTT CHART FEATURES
    // ===================================
    
    // Initialize drag and drop for Gantt chart
    initDragAndDrop() {
        let draggedBar = null;
        let draggedData = null;
        let resizing = null;
        let resizeData = null;
        
        // Drag start
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('gantt-bar')) {
                draggedBar = e.target;
                draggedData = {
                    day: e.target.dataset.day,
                    time: e.target.dataset.time
                };
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });
        
        // Drag end
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('gantt-bar')) {
                e.target.classList.remove('dragging');
                draggedBar = null;
                draggedData = null;
            }
        });
        
        // Drag over
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            const rowContent = e.target.closest('.gantt-row-content');
            if (rowContent && draggedBar) {
                e.dataTransfer.dropEffect = 'move';
            }
        });
        
        // Drop
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const rowContent = e.target.closest('.gantt-row-content');
            
            if (rowContent && draggedData) {
                const newDay = rowContent.dataset.day;
                
                // Calculate new time based on drop position
                const rect = rowContent.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                
                // Snap to configured interval
                const minutesFromStart = Math.round(percentage * this.TOTAL_MINUTES / this.SNAP_MINUTES) * this.SNAP_MINUTES;
                const hours = Math.floor(minutesFromStart / 60) + this.START_HOUR;
                const minutes = minutesFromStart % 60;
                const newTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                
                // Move the activity
                const oldKey = `${draggedData.day}-${draggedData.time}`;
                const newKey = `${newDay}-${newTime}`;
                
                if (oldKey !== newKey && !this.schedule[newKey]) {
                    this.schedule[newKey] = this.schedule[oldKey];
                    delete this.schedule[oldKey];
                    
                    // Update reminders
                    if (this.schedule[newKey].reminder) {
                        Notifications.cancelReminder(draggedData.day, draggedData.time);
                        Notifications.scheduleReminder(newDay, newTime, this.schedule[newKey].text, this.schedule[newKey].category);
                    }
                    
                    this.saveData();
                    this.saveWeekHistory();
                    this.generateScheduleGrid();
                } else if (this.schedule[newKey]) {
                    // Show feedback when drop is rejected due to overlap
                    alert('⚠️ That time slot is already occupied. Please choose a different time.');
                }
            }
        });
        
        // Resize functionality
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle-left') || 
                e.target.classList.contains('resize-handle-right')) {
                e.preventDefault();
                e.stopPropagation();
                
                const bar = e.target.closest('.gantt-bar');
                const container = bar.parentElement;
                const isLeft = e.target.classList.contains('resize-handle-left');
                
                resizing = { bar, isLeft };
                resizeData = {
                    day: bar.dataset.day,
                    time: bar.dataset.time,
                    startX: e.clientX,
                    startLeft: parseFloat(bar.style.left),
                    startWidth: parseFloat(bar.style.width),
                    containerWidth: container.offsetWidth
                };
                
                bar.style.cursor = 'ew-resize';
                document.body.style.cursor = 'ew-resize';
                document.body.style.userSelect = 'none';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (resizing && resizeData) {
                e.preventDefault();
                
                const deltaX = e.clientX - resizeData.startX;
                const deltaPercent = (deltaX / resizeData.containerWidth) * 100;
                
                const minutesPerPercent = this.TOTAL_MINUTES / 100;
                
                if (resizing.isLeft) {
                    // Resize from left (change start time)
                    let newLeft = resizeData.startLeft + deltaPercent;
                    let newWidth = resizeData.startWidth - deltaPercent;
                    
                    // Snap to configured interval
                    const minutes = Math.round((newLeft * minutesPerPercent) / this.SNAP_MINUTES) * this.SNAP_MINUTES;
                    newLeft = (minutes / this.TOTAL_MINUTES) * 100;
                    newWidth = resizeData.startLeft + resizeData.startWidth - newLeft;
                    
                    // Minimum duration = SNAP_MINUTES
                    if (newWidth >= (this.SNAP_MINUTES / this.TOTAL_MINUTES) * 100) {
                        resizing.bar.style.left = newLeft + '%';
                        resizing.bar.style.width = newWidth + '%';
                    }
                } else {
                    // Resize from right (change duration)
                    let newWidth = resizeData.startWidth + deltaPercent;
                    
                    // Snap to configured interval
                    const minutes = Math.round((newWidth * minutesPerPercent) / this.SNAP_MINUTES) * this.SNAP_MINUTES;
                    newWidth = (minutes / this.TOTAL_MINUTES) * 100;
                    
                    // Minimum duration = SNAP_MINUTES
                    if (newWidth >= (this.SNAP_MINUTES / this.TOTAL_MINUTES) * 100) {
                        resizing.bar.style.width = newWidth + '%';
                    }
                }
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (resizing && resizeData) {
                const bar = resizing.bar;
                const isLeft = resizing.isLeft;
                
                bar.style.cursor = '';
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Calculate new time and duration
                const newLeft = parseFloat(bar.style.left);
                const newWidth = parseFloat(bar.style.width);
                
                const startMinutes = Math.round((newLeft / 100) * this.TOTAL_MINUTES);
                const duration = Math.round((newWidth / 100) * this.TOTAL_MINUTES);
                
                const hours = Math.floor(startMinutes / 60) + this.START_HOUR;
                const minutes = startMinutes % 60;
                const newTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                
                // Update schedule
                const oldKey = `${resizeData.day}-${resizeData.time}`;
                const newKey = `${resizeData.day}-${newTime}`;
                
                if (isLeft && oldKey !== newKey) {
                    // Time changed
                    this.schedule[newKey] = { ...this.schedule[oldKey], duration };
                    delete this.schedule[oldKey];
                    
                    // Update reminders
                    if (this.schedule[newKey].reminder) {
                        Notifications.cancelReminder(resizeData.day, resizeData.time);
                        Notifications.scheduleReminder(resizeData.day, newTime, this.schedule[newKey].text, this.schedule[newKey].category);
                    }
                } else {
                    // Only duration changed
                    const key = `${resizeData.day}-${resizeData.time}`;
                    if (this.schedule[key]) {
                        this.schedule[key].duration = duration;
                    }
                }
                
                this.saveData();
                this.saveWeekHistory();
                this.generateScheduleGrid();
                
                resizing = null;
                resizeData = null;
            }
        });
    },
    
    // Save current week to history for copy feature
    saveWeekHistory() {
        const weekKey = this.getWeekKey(this.currentWeek);
        const history = Storage.load('weekHistory', {});
        history[weekKey] = JSON.parse(JSON.stringify(this.schedule));
        Storage.save('weekHistory', history);
    },
    
    // Get week key for history
    getWeekKey(date) {
        const monday = this.getMonday(date);
        return monday.toISOString().split('T')[0];
    },
    
    // Open copy week modal
    openCopyWeekModal() {
        const modal = document.getElementById('copyWeekModal');
        const selector = document.getElementById('weekSelector');
        const history = Storage.load('weekHistory', {});
        const currentWeekKey = this.getWeekKey(this.currentWeek);
        
        // Populate week selector with available weeks
        selector.innerHTML = '<option value="">Select a week...</option>';
        
        const weeks = Object.keys(history)
            .filter(key => key !== currentWeekKey)
            .sort()
            .reverse();
        
        weeks.forEach(weekKey => {
            const date = new Date(weekKey);
            const weekNum = this.getWeekNumber(date);
            const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const option = document.createElement('option');
            option.value = weekKey;
            option.textContent = `Week ${weekNum} - ${formatted}`;
            selector.appendChild(option);
        });
        
        if (weeks.length === 0) {
            selector.innerHTML = '<option value="">No previous weeks available</option>';
        }
        
        modal.classList.add('active');
    },
    
    // Close copy week modal
    closeCopyWeekModal() {
        const modal = document.getElementById('copyWeekModal');
        modal.classList.remove('active');
    },
    
    // Confirm copy week
    confirmCopyWeek() {
        const selector = document.getElementById('weekSelector');
        const selectedWeek = selector.value;
        
        if (!selectedWeek) {
            alert('Please select a week to copy from');
            return;
        }
        
        const history = Storage.load('weekHistory', {});
        const scheduleData = history[selectedWeek];
        
        if (scheduleData) {
            // Copy the schedule to current week
            this.schedule = JSON.parse(JSON.stringify(scheduleData));
            this.saveData();
            this.saveWeekHistory();
            this.generateScheduleGrid();
            this.closeCopyWeekModal();
            alert('✅ Week plan copied successfully!');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available for inline event handlers
window.App = App;
