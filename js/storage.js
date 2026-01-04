// ===================================
// 💾 Storage & CSV Handling Module
// ===================================

const Storage = {
    // Keys for localStorage
    KEYS: {
        SCHEDULE: 'weeklyPlanner_schedule',
        WORK_GOALS: 'weeklyPlanner_workGoals',
        ME_GOALS: 'weeklyPlanner_meGoals',
        RETRO: 'weeklyPlanner_retro',
        NOTE: 'weeklyPlanner_note',
        CURRENT_WEEK: 'weeklyPlanner_currentWeek',
        THEME: 'weeklyPlanner_theme'
    },

    // Save data to localStorage
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    // Load data from localStorage
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    },

    // Export all data to CSV
    exportToCSV() {
        const schedule = this.load(this.KEYS.SCHEDULE, {});
        const workGoals = this.load(this.KEYS.WORK_GOALS, []);
        const meGoals = this.load(this.KEYS.ME_GOALS, []);
        const retro = this.load(this.KEYS.RETRO, '');
        const note = this.load(this.KEYS.NOTE, '');
        const currentWeek = this.load(this.KEYS.CURRENT_WEEK, new Date().toISOString());

        let csv = 'Weekly Planner Export\n\n';
        
        // Week info
        csv += 'Week Date,' + currentWeek + '\n\n';

        // Schedule section
        csv += 'SCHEDULE\n';
        csv += 'Day,Time,Activity,Category,Reminder\n';
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        for (const [key, value] of Object.entries(schedule)) {
            const [day, time] = key.split('-');
            csv += `${day},${time},${this.escapeCSV(value.text)},${value.category || ''},${value.reminder ? 'Yes' : 'No'}\n`;
        }

        csv += '\n';

        // Work Goals
        csv += 'WORK GOALS\n';
        csv += 'Goal,Completed\n';
        workGoals.forEach(goal => {
            csv += `${this.escapeCSV(goal.text)},${goal.completed ? 'Yes' : 'No'}\n`;
        });

        csv += '\n';

        // Me Goals
        csv += 'ME GOALS\n';
        csv += 'Goal,Completed\n';
        meGoals.forEach(goal => {
            csv += `${this.escapeCSV(goal.text)},${goal.completed ? 'Yes' : 'No'}\n`;
        });

        csv += '\n';

        // Retro and Notes
        csv += 'RETRO\n';
        csv += `${this.escapeCSV(retro)}\n\n`;
        
        csv += 'NOTES\n';
        csv += `${this.escapeCSV(note)}\n`;

        return csv;
    },

    // Escape CSV special characters
    escapeCSV(str) {
        if (str === undefined || str === null) return '';
        str = String(str);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    },

    // Download CSV file
    downloadCSV() {
        const csv = this.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `weekly-planner-${date}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Import from CSV
    importFromCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            let section = '';
            let schedule = {};
            let workGoals = [];
            let meGoals = [];
            let retro = '';
            let note = '';
            let currentWeek = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (!line) continue;

                if (line.startsWith('Week Date,')) {
                    currentWeek = line.split(',')[1];
                    continue;
                }

                if (line === 'SCHEDULE') {
                    section = 'SCHEDULE';
                    i++; // Skip header line
                    continue;
                }
                
                if (line === 'WORK GOALS') {
                    section = 'WORK_GOALS';
                    i++; // Skip header line
                    continue;
                }
                
                if (line === 'ME GOALS') {
                    section = 'ME_GOALS';
                    i++; // Skip header line
                    continue;
                }
                
                if (line === 'RETRO') {
                    section = 'RETRO';
                    continue;
                }
                
                if (line === 'NOTES') {
                    section = 'NOTES';
                    continue;
                }

                // Parse based on section
                if (section === 'SCHEDULE') {
                    const parts = this.parseCSVLine(line);
                    if (parts.length >= 3) {
                        const day = parts[0] || '';
                        const time = parts[1] || '';
                        const activity = parts[2] || '';
                        const category = parts[3] || '';
                        const reminder = parts[4] || '';
                        
                        if (activity) {
                            const key = `${day}-${time}`;
                            schedule[key] = {
                                text: activity,
                                category: category,
                                reminder: reminder === 'Yes'
                            };
                        }
                    }
                } else if (section === 'WORK_GOALS') {
                    const parts = this.parseCSVLine(line);
                    if (parts.length >= 1 && parts[0]) {
                        workGoals.push({
                            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
                            text: parts[0],
                            completed: parts[1] === 'Yes'
                        });
                    }
                } else if (section === 'ME_GOALS') {
                    const parts = this.parseCSVLine(line);
                    if (parts.length >= 1 && parts[0]) {
                        meGoals.push({
                            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
                            text: parts[0],
                            completed: parts[1] === 'Yes'
                        });
                    }
                } else if (section === 'RETRO') {
                    retro += line + '\n';
                } else if (section === 'NOTES') {
                    note += line + '\n';
                }
            }

            // Save imported data
            this.save(this.KEYS.SCHEDULE, schedule);
            this.save(this.KEYS.WORK_GOALS, workGoals);
            this.save(this.KEYS.ME_GOALS, meGoals);
            this.save(this.KEYS.RETRO, retro.trim());
            this.save(this.KEYS.NOTE, note.trim());
            
            if (currentWeek) {
                this.save(this.KEYS.CURRENT_WEEK, currentWeek);
            }

            return true;
        } catch (error) {
            console.error('Error importing CSV:', error);
            return false;
        }
    },

    // Parse CSV line handling quoted values
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    },

    // Clear all data
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};

// Make Storage globally available
window.Storage = Storage;
