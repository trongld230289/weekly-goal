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
    flatpickrInstance: null, // Flatpickr instance

    // Loading State Helpers
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('.loading-text');
        if (text) text.textContent = message;
        overlay.classList.add('active');
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('active');
    },

    // Initialize the app
    async init() {
        console.log('🌸 Initializing Weekly Planner...');
        
        // Load saved week or use current week
        const savedWeek = Storage.load(Storage.KEYS.CURRENT_WEEK);
        if (savedWeek) {
            this.currentWeek = new Date(savedWeek);
        }
        
        // Load saved data (now async with Google Sheets)
        await this.loadData();
        
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
        
        // Initialize Flatpickr
        this.initFlatpickr();

        console.log('✨ Weekly Planner ready!');
    },

    // Load data from Google Sheets first
    async loadData() {
        const weekKey = this.getWeekKey(this.currentWeek);
        
        this.showLoading('Syncing with cloud...');

        // Try to load from Google Sheets first
        try {
            const sheetData = await Storage.loadScheduleFromSheet(weekKey);
            if (sheetData && sheetData.length > 0) {
                console.log('✅ Loaded schedule from Google Sheets');
                this.schedule = Storage.sheetDataToGantt(sheetData);
                // Save to localStorage as cache
                Storage.save(`${Storage.KEYS.SCHEDULE}_${weekKey}`, this.schedule);
            } else {
                // No data in sheet
                console.log('ℹ️ No Google Sheets data found.');
                this.schedule = {};
            }
        } catch (error) {
            console.error('❌ Google Sheets error:', error);
            this.schedule = {};
        } finally {
            this.hideLoading();
        }
        
        // Goals are still loaded from localStorage only
        this.workGoals = Storage.load(`${Storage.KEYS.WORK_GOALS}_${weekKey}`, []);
        this.meGoals = Storage.load(`${Storage.KEYS.ME_GOALS}_${weekKey}`, []);
    },
    
    // Save data to localStorage as backup/cache (week-specific)
    // Note: Full Google Sheets write integration is not yet implemented
    // This ensures data is always cached locally for offline access
    async saveData() {
        const weekKey = this.getWeekKey(this.currentWeek);
        
        // Save to localStorage immediately (as backup and cache)
        Storage.save(`${Storage.KEYS.SCHEDULE}_${weekKey}`, this.schedule);
        Storage.save(`${Storage.KEYS.WORK_GOALS}_${weekKey}`, this.workGoals);
        Storage.save(`${Storage.KEYS.ME_GOALS}_${weekKey}`, this.meGoals);
        
        // TODO: Implement Google Sheets write integration
        // This would require converting schedule format and making API calls for each task
        console.log('💾 Data saved to localStorage');
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
            
            const dateStr = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            
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
        
        // Current time indicator removed per requirement
        // this.addCurrentTimeIndicator();
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
        
        // Handle click vs drag
        let isDragging = false;

        bar.addEventListener('dragstart', () => {
            isDragging = true;
        });

        bar.addEventListener('dragend', () => {
            setTimeout(() => { isDragging = false; }, 100);
        });

        bar.addEventListener('click', (e) => {
            if (isDragging) return;
            
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
        
        // Check if this is edit mode (activity exists) or add mode (new activity)
        // Ensure text is a string before trimming (handles numbers from Sheet)
        const textStr = String(cellData.text || '');
        const isEditMode = textStr && textStr.trim().length > 0;

        document.getElementById('activityInput').value = textStr;
        document.getElementById('categorySelect').value = cellData.category || '';
        document.getElementById('durationSelect').value = cellData.duration || 60;
        document.getElementById('reminderCheck').checked = cellData.reminder || false;

        // Show/hide Delete button based on edit mode
        const deleteBtn = document.getElementById('deleteActivity');
        if (isEditMode) {
            deleteBtn.style.display = 'block';
        } else {
            deleteBtn.style.display = 'none';
        }

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
    async saveActivity() {
        if (!this.currentCell) return;

        const { day, time } = this.currentCell;
        const cellKey = `${day}-${time}`;
        
        const text = document.getElementById('activityInput').value.trim();
        const category = document.getElementById('categorySelect').value;
        const duration = parseInt(document.getElementById('durationSelect').value);
        const reminder = document.getElementById('reminderCheck').checked;

        // Get week start date for API
        const weekStart = this.getWeekKey(this.currentWeek);

        // Close modal immediately to show loading on the grid
        this.closeEditModal();

        // Optimistic update
        const oldData = this.schedule[cellKey] ? { ...this.schedule[cellKey] } : null;
        
        if (text) {
            const newData = { 
                text, 
                category, 
                duration, 
                reminder, 
                rowIndex: oldData ? oldData.rowIndex : undefined
            };
            this.schedule[cellKey] = newData;
            
            // Schedule reminder if enabled
            if (reminder && Notifications.permission) {
                Notifications.scheduleReminder(day, time, text, category);
            }
        } else {
            // If text is empty, treat as delete
            if (oldData) {
                delete this.schedule[cellKey];
                Notifications.cancelReminder(day, time);
            }
        }

        // Render grid to show the new/updated task
        this.generateScheduleGrid();

        // Find the bar to show loading state
        // If we just deleted it (text empty), we don't show loading on the bar (it's gone)
        // But if we added/updated, we show loading on the new bar
        let bar = null;
        if (text) {
            bar = document.querySelector(`.gantt-bar[data-day="${day}"][data-time="${time}"]`);
            if (bar) bar.classList.add('saving');
        }

        try {
            if (text) {
                // Google Sheets Sync
                const [hours, minutes] = time.split(':');
                const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
                const endMinutes = startMinutes + duration;
                const endHour = Math.floor(endMinutes / 60);
                const endMin = endMinutes % 60;
                const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

                const taskData = {
                    week_start: weekStart,
                    day: day,
                    task: text,
                    start_time: time,
                    end_time: endTime,
                    color: '', // Add color logic if needed
                    category: category,
                    rowIndex: this.schedule[cellKey].rowIndex
                };

                if (this.schedule[cellKey].rowIndex) {
                    // Update
                    console.log('Updating task in sheet...', taskData);
                    await Storage.updateTaskInSheet(taskData);
                } else {
                    // Create
                    console.log('Creating task in sheet...', taskData);
                    const result = await Storage.createTaskInSheet(taskData);
                    if (result && result.rowIndex) {
                        this.schedule[cellKey].rowIndex = result.rowIndex;
                        console.log('Task created with rowIndex:', result.rowIndex);
                        // Save again to persist rowIndex
                        this.saveData();
                    }
                }
            } else {
                // Delete logic if text is empty
                if (oldData && oldData.rowIndex) {
                     await Storage.deleteTaskFromSheet(oldData.rowIndex);
                }
            }

            // Save final state
            this.saveData();
            this.saveWeekHistory(); // Save to week history for copy feature
            
            // Remove loading state
            if (bar) bar.classList.remove('saving');

        } catch (e) {
            console.error('Error syncing with sheet:', e);
            alert('Failed to save changes to cloud. Please try again.');
            
            // Revert changes on error
            if (oldData) {
                this.schedule[cellKey] = oldData;
            } else {
                delete this.schedule[cellKey];
            }
            this.saveData();
            this.generateScheduleGrid();
        }
    },

    // Delete activity
    async deleteActivity() {
        if (!this.currentCell) return;

        const { day, time } = this.currentCell;
        const cellKey = `${day}-${time}`;
        
        // Close modal immediately
        this.closeEditModal();

        // Find the bar to show loading BEFORE we remove it from local state
        // Wait, if we want to show loading, we should keep it in the grid but marked as saving?
        // Or maybe we just show the loading state on the bar and THEN remove it after API success?
        // User wants "loading bông hoa" -> implies the bar should stay visible with the flower until deleted.
        
        const bar = document.querySelector(`.gantt-bar[data-day="${day}"][data-time="${time}"]`);
        if (bar) bar.classList.add('saving');

        try {
            if (this.schedule[cellKey] && this.schedule[cellKey].rowIndex) {
                 console.log('Deleting task from sheet...', this.schedule[cellKey].rowIndex);
                 await Storage.deleteTaskFromSheet(this.schedule[cellKey].rowIndex);
            }

            delete this.schedule[cellKey];
            Notifications.cancelReminder(day, time);

            this.saveData();
            this.generateScheduleGrid(); // This will finally remove the bar
        } catch (e) {
            console.error('Error deleting from sheet:', e);
            alert('Failed to delete from cloud. Please try again.');
            if (bar) bar.classList.remove('saving');
        }
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
                    onchange="App.toggleGoal('${type}', '${goal.id}')">
                <input type="text" class="goal-text" value="${this.escapeHtml(goal.text)}"
                    onchange="App.updateGoalText('${type}', '${goal.id}', this.value)">
                <button class="delete-goal" onclick="App.deleteGoal('${type}', '${goal.id}')">×</button>
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
        const day = String(monday.getDate()).padStart(2, '0');
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const year = monday.getFullYear();
        
        document.getElementById('weekTitle').textContent = 
            `WEEK ${weekNum} - Week of: ${day}/${month}/${year}`;
        
        // Update Flatpickr date if initialized
        if (this.flatpickrInstance) {
            this.flatpickrInstance.setDate(this.currentWeek, false);
        }
        
        // Update standard button icon
        this.updateStandardButtonIcon();
        
        Storage.save(Storage.KEYS.CURRENT_WEEK, this.currentWeek.toISOString());
    },
    
    // Update standard button icon based on current week
    updateStandardButtonIcon() {
        const sunContainer = document.querySelector('.sun-container');
        const sunBeamContainer = document.querySelector('.sun-beam-container');
        
        if (!sunContainer) return;
        
        const isStandard = this.isStandardWeek();
        if (isStandard) {
            sunContainer.classList.add('active');
            if (sunBeamContainer) sunBeamContainer.classList.add('active');
        } else {
            sunContainer.classList.remove('active');
            if (sunBeamContainer) sunBeamContainer.classList.remove('active');
        }
    },

    // Initialize Flatpickr
    initFlatpickr() {
        const datePickerInput = document.getElementById('datePicker');
        
        this.flatpickrInstance = flatpickr(datePickerInput, {
            dateFormat: "d/m/Y",
            defaultDate: this.currentWeek,
            locale: {
                firstDayOfWeek: 1 // Monday first
            },
            onChange: (selectedDates, dateStr) => {
                if (selectedDates.length > 0) {
                    this.onDateChange(selectedDates[0]);
                }
            }
        });
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
    async prevWeek() {
        await this.saveData(); // Save current week data
        this.saveWeekHistory(); // Save current week before switching
        this.currentWeek.setDate(this.currentWeek.getDate() - 7);
        this.updateWeekDisplay();
        await this.loadData(); // Load data for the new week
        this.generateScheduleGrid();
        this.renderGoals();
        this.loadNotes();
    },

    // Navigate to next week
    async nextWeek() {
        await this.saveData(); // Save current week data
        this.saveWeekHistory(); // Save current week before switching
        this.currentWeek.setDate(this.currentWeek.getDate() + 7);
        this.updateWeekDisplay();
        await this.loadData(); // Load data for the new week
        this.generateScheduleGrid();
        this.renderGoals();
        this.loadNotes();
    },

    // Go to current week (Today)
    async goToToday() {
        await this.saveData(); // Save current week data
        this.saveWeekHistory(); // Save current week before switching
        this.currentWeek = new Date(); // Reset to today
        this.updateWeekDisplay();
        await this.loadData(); // Load data for the new week
        this.generateScheduleGrid();
        this.renderGoals();
        this.loadNotes();
    },

    // Handle date picker change
    async onDateChange(date) {
        await this.saveData(); // Save current week data
        this.currentWeek = new Date(date);
        this.updateWeekDisplay();
        await this.loadData(); // Load new week data
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
        // Week navigation - both old buttons (hidden) and new arrows
        const prevWeekBtn = document.getElementById('prevWeek');
        const nextWeekBtn = document.getElementById('nextWeek');
        if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => this.prevWeek());
        if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => this.nextWeek());
        
        // New Gantt arrow navigation
        const prevWeekArrow = document.getElementById('prevWeekArrow');
        const nextWeekArrow = document.getElementById('nextWeekArrow');
        if (prevWeekArrow) prevWeekArrow.addEventListener('click', () => this.prevWeek());
        if (nextWeekArrow) nextWeekArrow.addEventListener('click', () => this.nextWeek());
        
        // Note: Date picker change is now handled by Flatpickr onChange callback

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
        
        // Today button
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());

        // Toggle Standard Week button
        document.getElementById('toggleStandardBtn').addEventListener('click', () => this.toggleStandardWeek());
        
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
        document.addEventListener('drop', async (e) => {
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

                    // Save local state first
                    this.saveData();
                    this.saveWeekHistory();
                    
                    // Render immediately to show the move
                    this.generateScheduleGrid();

                    // Google Sheets Sync (Update)
                    if (this.schedule[newKey].rowIndex) {
                        // Find the new bar element to show loading state
                        const newBar = document.querySelector(`.gantt-bar[data-day="${newDay}"][data-time="${newTime}"]`);
                        if (newBar) newBar.classList.add('saving');

                        try {
                            const weekStart = this.getWeekKey(this.currentWeek);
                            const duration = this.schedule[newKey].duration || 60;
                            
                            const [hours, minutes] = newTime.split(':');
                            const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
                            const endMinutes = startMinutes + duration;
                            const endHour = Math.floor(endMinutes / 60);
                            const endMin = endMinutes % 60;
                            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

                            const taskData = {
                                week_start: weekStart,
                                day: newDay,
                                task: this.schedule[newKey].text,
                                start_time: newTime,
                                end_time: endTime,
                                color: '', 
                                category: this.schedule[newKey].category,
                                rowIndex: this.schedule[newKey].rowIndex
                            };
                            
                            console.log('Updating moved task in sheet...', taskData);
                            await Storage.updateTaskInSheet(taskData);
                        } catch (error) {
                            console.error('Error updating task position:', error);
                            alert('❌ Error updating task position in Sheet');
                        } finally {
                            if (newBar) newBar.classList.remove('saving');
                        }
                    }
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
        
        document.addEventListener('mouseup', async (e) => {
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
                let targetKey = newKey;
                
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
                    targetKey = `${resizeData.day}-${resizeData.time}`;
                    if (this.schedule[targetKey]) {
                        this.schedule[targetKey].duration = duration;
                    }
                }

                // Save local state first
                this.saveData();
                this.saveWeekHistory();
                
                // Render immediately to show the change
                this.generateScheduleGrid();

                // Google Sheets Sync (Update)
                if (this.schedule[targetKey] && this.schedule[targetKey].rowIndex) {
                    // Find the updated bar element to show loading state
                    // Note: targetKey is the new key (day-time)
                    const [day, time] = targetKey.split('-');
                    const updatedBar = document.querySelector(`.gantt-bar[data-day="${day}"][data-time="${time}"]`);
                    if (updatedBar) updatedBar.classList.add('saving');

                    try {
                        const weekStart = this.getWeekKey(this.currentWeek);
                        const item = this.schedule[targetKey];
                        
                        const [hours, minutes] = newTime.split(':');
                        const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
                        const endMinutes = startMinutes + duration;
                        const endHour = Math.floor(endMinutes / 60);
                        const endMin = endMinutes % 60;
                        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

                        const taskData = {
                            week_start: weekStart,
                            day: resizeData.day,
                            task: item.text,
                            start_time: newTime,
                            end_time: endTime,
                            color: '', 
                            category: item.category,
                            rowIndex: item.rowIndex
                        };
                        
                        console.log('Updating resized task in sheet...', taskData);
                        await Storage.updateTaskInSheet(taskData);
                    } catch (error) {
                        console.error('Error updating task duration:', error);
                        alert('❌ Error updating task duration in Sheet');
                    } finally {
                        if (updatedBar) updatedBar.classList.remove('saving');
                    }
                }
                
                resizing = null;
                resizeData = null;
            }
        });
    },
    
    // Save current week to history for copy feature
    saveWeekHistory() {
        const weekKey = this.getWeekKey(this.currentWeek);
        const history = Storage.load('weekHistory', {});
        
        // Only save weeks that have schedule data
        if (Object.keys(this.schedule).length > 0) {
            history[weekKey] = JSON.parse(JSON.stringify(this.schedule));
            Storage.save('weekHistory', history);
        }
    },
    
    // Get week key for history
    getWeekKey(date) {
        const monday = this.getMonday(date);
        const d = String(monday.getDate()).padStart(2, '0');
        const m = String(monday.getMonth() + 1).padStart(2, '0');
        const y = monday.getFullYear();
        return `${d}/${m}/${y}`;
    },
    
    // Toggle standard week
    toggleStandardWeek() {
        const weekKey = this.getWeekKey(this.currentWeek);
        const standardWeeks = Storage.load('standardWeeks', []);
        
        const index = standardWeeks.indexOf(weekKey);
        if (index > -1) {
            // Remove from standard weeks
            standardWeeks.splice(index, 1);
            // alert('Week unmarked as standard template');
        } else {
            // Remove all other standard weeks (only one allowed)
            standardWeeks.splice(0, standardWeeks.length);
            // Add this week to standard weeks
            standardWeeks.push(weekKey);
            // alert('Week marked as standard template');
            // this.triggerSunBeamAnimation(); // Animation is now permanent in CSS
        }
        
        Storage.save('standardWeeks', standardWeeks);
        this.updateWeekDisplay();
        this.updateStandardButtonIcon();
    },

    // Trigger sun beam animation - DEPRECATED (Moved to CSS permanent)
    triggerSunBeamAnimation() {
        // Kept for reference or future dynamic use
    },
    
    // Check if current week is standard
    isStandardWeek(weekKey) {
        const standardWeeks = Storage.load('standardWeeks', []);
        return standardWeeks.includes(weekKey || this.getWeekKey(this.currentWeek));
    },
    
    /**
     * Parse a week key (ISO date string) as a Date object with timezone safety
     * @param {string} weekKey - ISO date string in format 'YYYY-MM-DD'
     * @returns {Date} Date object with time set to midnight local time
     * @description Appends 'T00:00:00' to ensure consistent parsing as local midnight
     *              rather than UTC midnight, avoiding timezone-related date shifts
     */
    parseWeekKeyAsDate(weekKey) {
        return new Date(weekKey + 'T00:00:00');
    },
    
    // Open copy week modal
    async openCopyWeekModal() {
        const modal = document.getElementById('copyWeekModal');
        const selector = document.getElementById('weekSelector');
        
        this.showLoading('Fetching available weeks...');

        try {
            const standardWeeks = Storage.load('standardWeeks', []);
            const currentWeekKey = this.getWeekKey(this.currentWeek); // dd/MM/yyyy
            
            // Parse current week key to Date for comparison
            const [cDay, cMonth, cYear] = currentWeekKey.split('/');
            const currentMonday = new Date(cYear, cMonth - 1, cDay);
            
            // Get available weeks from Sheet
            const allWeeks = await Storage.getAvailableWeeksFromSheet();
            
            // Filter for past weeks
            const weeksWithData = allWeeks.filter(weekKey => {
                if (weekKey === currentWeekKey) return false;
                
                const [day, month, year] = weekKey.split('/');
                const weekDate = new Date(year, month - 1, day);
                
                return weekDate < currentMonday;
            });
            
            // Sort weeks in reverse chronological order (most recent first)
            weeksWithData.sort((a, b) => {
                const [d1, m1, y1] = a.split('/');
                const [d2, m2, y2] = b.split('/');
                return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
            });
            
            // Populate week selector
            selector.innerHTML = '';
            
            if (weeksWithData.length === 0) {
                selector.innerHTML = '<option value="">No past weeks with data available</option>';
            } else {
                selector.innerHTML = '<option value="">Select a week...</option>';
                
                weeksWithData.forEach(weekKey => {
                    const [day, month, year] = weekKey.split('/');
                    const date = new Date(year, month - 1, day);
                    const weekNum = this.getWeekNumber(date);
                    
                    const isStandard = standardWeeks.includes(weekKey);
                    
                    const option = document.createElement('option');
                    option.value = weekKey;
                    option.textContent = `Week ${weekNum} - ${weekKey}${isStandard ? ' ⭐' : ''}`;
                    if (isStandard) {
                        option.selected = true; // Auto-select standard week
                    }
                    selector.appendChild(option);
                });
            }
            
            modal.classList.add('active');
        } catch (e) {
            console.error('Error fetching weeks:', e);
            alert('Failed to load available weeks. Please try again.');
        } finally {
            this.hideLoading();
        }
    },
    
    // Close copy week modal
    closeCopyWeekModal() {
        const modal = document.getElementById('copyWeekModal');
        modal.classList.remove('active');
    },
    
    // Confirm copy week
    async confirmCopyWeek() {
        const selector = document.getElementById('weekSelector');
        const selectedWeek = selector.value;
        
        if (!selectedWeek) {
            alert('Please select a week to copy from');
            return;
        }
        
        this.showLoading('Copying week plan...');
        
        try {
            // Load schedule data from Sheet for the selected week
            const sheetData = await Storage.loadScheduleFromSheet(selectedWeek);
            const scheduleData = Storage.sheetDataToGantt(sheetData);
            
            if (scheduleData && Object.keys(scheduleData).length > 0) {
                const currentWeekKey = this.getWeekKey(this.currentWeek);
                
                // We need to save each item to the Sheet for the current week
                const promises = [];
                
                for (const [key, item] of Object.entries(scheduleData)) {
                    // key is "Day-HH:MM" e.g. "Monday-05:00"
                    const [day, time] = key.split('-');
                    
                    // Calculate end time
                    const [hours, minutes] = time.split(':');
                    const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
                    const endMinutes = startMinutes + item.duration;
                    const endHour = Math.floor(endMinutes / 60);
                    const endMin = endMinutes % 60;
                    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
                    
                    const taskData = {
                        week_start: currentWeekKey,
                        day: day,
                        task: item.text,
                        start_time: time,
                        end_time: endTime,
                        color: item.color || '',
                        category: item.category
                    };
                    
                    promises.push(Storage.createTaskInSheet(taskData));
                }
                
                await Promise.all(promises);
                
                // Reload current week data
                await this.loadData();
                this.generateScheduleGrid();
                
                this.closeCopyWeekModal();
            } else {
                alert('⚠️ No schedule data found for the selected week');
            }
        } catch (error) {
            console.error('Error copying week:', error);
            alert('❌ Error copying week data');
        } finally {
            this.hideLoading();
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available for inline event handlers
window.App = App;
