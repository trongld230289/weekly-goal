# 🌸 Weekly Goal Planner

A cute kawaii/pastel-style weekly planner web application with a modern UI/UX design. Plan your week, track your goals, and stay organized with this adorable planner!

## ✨ Features

### 📅 Weekly Schedule Grid
- **7-day view** (Monday to Sunday) with time slots from 5:00 AM to 11:30 PM (30-minute intervals)
- **Color-coded activities** by category (workout, coding, self-care, sleep, meetings, meals, etc.)
- **Click to edit** - Simply click any cell to add, edit, or remove activities
- **Visual categories** - Easy-to-identify color coding for different activity types

### 🎯 Goals Tracking
- **Work Goals** - Track your professional objectives
- **Me Goals** - Personal development and self-care goals
- **Progress tracking** - Check off completed goals with satisfying confetti animation! 🎉
- **Easy management** - Add, edit, or delete goals with intuitive controls

### 📝 Notes & Retrospective
- **Retro section** - Reflect on your week with a dedicated retrospective area
- **Notes section** - Free-form notes for anything you need to remember
- **Auto-save** - All changes are automatically saved to your browser

### 💾 Data Persistence
- **localStorage** - All data is saved locally in your browser
- **Export to CSV** - Download your schedule as a CSV file
- **Import from CSV** - Upload and restore your schedule from CSV
- **Excel/Google Sheets compatible** - Easy to edit exported files

### 🌙 Dark Mode
- **Beautiful dark theme** - Easy on the eyes with pastel dark colors
- **Toggle switch** - Quick switch between light and dark modes
- **Saved preference** - Your theme choice is remembered

### 🔔 Reminder Notifications
- **Browser notifications** - Get reminded 5 minutes before activities
- **Permission-based** - Opt-in notification system
- **Smart scheduling** - Reminders automatically calculate based on day and time

### 📆 Week Navigation
- **Previous/Next buttons** - Easily navigate between weeks
- **Date picker** - Jump to any specific week
- **Week number display** - Shows current week of the year

### 🎨 Design Highlights
- **Kawaii/Pastel aesthetic** - Cute and calming color palette
- **Rounded fonts** - Friendly typography using Quicksand and Nunito
- **Smooth animations** - Delightful hover effects and transitions
- **Fully responsive** - Works perfectly on mobile, tablet, and desktop

## 🚀 Live Demo

Visit the live application: [https://trongld230289.github.io/weekly-goal/](https://trongld230289.github.io/weekly-goal/)

## 📦 Installation & Setup

### Option 1: Use it directly
Simply visit the live demo link above - no installation needed!

### Option 2: Clone and run locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/trongld230289/weekly-goal.git
   cd weekly-goal
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   # On macOS:
   open index.html
   
   # On Linux:
   xdg-open index.html
   
   # On Windows:
   start index.html
   ```

   Or use a local server (recommended):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```

3. **Visit** `http://localhost:8000` in your browser

## 🎯 How to Use

### Adding Activities to Your Schedule
1. Click on any time slot in the schedule grid
2. Enter your activity name
3. Select a category for color coding
4. (Optional) Enable reminder notification
5. Click "Save"

### Managing Goals
1. Click the "+ Add Goal" button under Work Goals or Me Goals
2. Type your goal text
3. Check the checkbox when completed (enjoy the confetti! 🎉)
4. Click the × button to delete a goal

### Week Navigation
- Click "← Prev" or "Next →" to move between weeks
- Use the date picker to jump to a specific week

### Exporting Your Data
1. Click the "📥 Export CSV" button
2. A CSV file will be downloaded with your current schedule and goals
3. You can open this file in Excel, Google Sheets, or any text editor

### Importing Data
1. Click the "📤 Import CSV" button
2. Select a CSV file (following the format in `data/schedule.csv`)
3. Your schedule will be updated with the imported data

### CSV File Format

The CSV export follows this structure:

```csv
Weekly Planner Export

Week Date,2024-01-05T00:00:00.000Z

SCHEDULE
Day,Time,Activity,Category,Reminder
Monday,06:00,Morning Workout,workout,Yes

WORK GOALS
Goal,Completed
Complete feature X,No

ME GOALS
Goal,Completed
Exercise 5 times,Yes

RETRO
Reflection text here...

NOTES
Additional notes here...
```

See `data/schedule.csv` for a complete example.

## 🛠️ Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript** - No frameworks, pure JS
- **localStorage API** - Client-side data persistence
- **Notifications API** - Browser notifications for reminders
- **Web Audio API** - Notification sounds

## 📱 Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Notifications require user permission and modern browser

## 🎨 Color Categories

- 🏋️ **Workout** - Orange (#FFB347)
- 💻 **Coding** - Purple (#C8B6FF)
- 💆 **Self Care** - Pink (#FFB3D9)
- 😴 **Sleep** - Red (#FF6B6B)
- 👥 **Meeting** - Mint (#95E1D3)
- 🍽️ **Meal** - Yellow (#FFE66D)
- 📌 **Other** - Brown (#DDA15E)

## 🚀 Deployment to GitHub Pages

This project is configured to work with GitHub Pages out of the box.

### Deploy Your Own Copy

1. **Fork this repository** to your GitHub account

2. **Enable GitHub Pages**:
   - Go to your repository Settings
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select the `main` branch
   - Click "Save"

3. **Access your site**:
   - Your site will be available at `https://yourusername.github.io/weekly-goal/`
   - It may take a few minutes for the initial deployment

### Custom Domain (Optional)
1. In repository Settings > Pages
2. Add your custom domain under "Custom domain"
3. Follow GitHub's instructions for DNS configuration

## 📂 Project Structure

```
weekly-goal/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styles and themes
├── js/
│   ├── app.js             # Main application logic
│   ├── storage.js         # localStorage & CSV handling
│   ├── notifications.js   # Reminder system
│   └── theme.js           # Dark mode logic
├── data/
│   └── schedule.csv       # Sample/default data
├── assets/
│   └── icons/             # Icons (if needed)
└── README.md              # This file
```

## 🔒 Privacy & Security

- **No server** - All data is stored locally in your browser
- **No tracking** - No analytics or tracking code
- **No data collection** - Your data never leaves your device
- **XSS Protection** - All user input is properly escaped
- **Open source** - Fully transparent code

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 License

This project is open source and available under the MIT License.

## 💖 Credits

Created with love and lots of pastel colors! 🌸

- Design inspiration: Kawaii/Pastel aesthetic
- Fonts: Google Fonts (Quicksand, Nunito)
- Icons: Unicode emojis

## 🐛 Known Issues

- Notifications may not work on iOS Safari (browser limitation)
- Export/Import works best with modern browsers
- Data is stored per browser - clearing browser data will reset the app

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/trongld230289/weekly-goal/issues) page
2. Create a new issue with details about your problem
3. Include browser version and steps to reproduce

---

Made with 💖 and ✨

Enjoy planning your week! 🌸