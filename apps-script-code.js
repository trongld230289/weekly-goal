// ===================================
// 📊 GOOGLE APPS SCRIPT CODE
// ===================================
// Để sử dụng:
// 1. Mở Google Sheet của bạn
// 2. Click Tiện ích mở rộng → Apps Script
// 3. Xóa hết code mặc định
// 4. Dán code này vào
// 5. Lưu và triển khai như Web App
// ===================================

const SHEET_NAME = 'Schedule';
const GOALS_SHEET_NAME = 'Goals';
const NOTES_SHEET_NAME = 'Notes';

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'read') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const weekStart = e.parameter.week_start;
    return readData(sheet, weekStart);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'read') {
    const sheet = ss.getSheetByName(SHEET_NAME);
    return readData(sheet, data.week_start);
  } else if (action === 'create') {
    const sheet = ss.getSheetByName(SHEET_NAME);
    return createData(sheet, data);
  } else if (action === 'update') {
    const sheet = ss.getSheetByName(SHEET_NAME);
    return updateData(sheet, data);
  } else if (action === 'delete') {
    const sheet = ss.getSheetByName(SHEET_NAME);
    return deleteData(sheet, data);
  } else if (action === 'bulkCreate') {
    const sheet = ss.getSheetByName(SHEET_NAME);
    return bulkCreateData(sheet, data.tasks);
  } else if (action === 'getAvailableWeeks') {
    const sheet = ss.getSheetByName(SHEET_NAME);
    return getAvailableWeeks(sheet);
  } 
  // Goals Actions
  else if (action === 'readGoals') {
    const sheet = ss.getSheetByName(GOALS_SHEET_NAME);
    return readGoals(sheet, data.week_start);
  } else if (action === 'createGoal') {
    const sheet = ss.getSheetByName(GOALS_SHEET_NAME);
    return createGoal(sheet, data);
  } else if (action === 'updateGoal') {
    const sheet = ss.getSheetByName(GOALS_SHEET_NAME);
    return updateGoal(sheet, data);
  } else if (action === 'deleteGoal') {
    const sheet = ss.getSheetByName(GOALS_SHEET_NAME);
    return deleteGoal(sheet, data);
  }
  // Notes Actions
  else if (action === 'readNotes') {
    const sheet = ss.getSheetByName(NOTES_SHEET_NAME);
    return readNotes(sheet, data.week_start);
  } else if (action === 'saveNote') {
    const sheet = ss.getSheetByName(NOTES_SHEET_NAME);
    return saveNote(sheet, data);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAvailableWeeks(sheet) {
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // Skip header
  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  const uniqueWeeks = new Set();
  
  rows.forEach(row => {
    let weekStart = row[0];
    if (weekStart) {
      if (weekStart instanceof Date) {
        weekStart = Utilities.formatDate(weekStart, timezone, 'dd/MM/yyyy');
      }
      uniqueWeeks.add(String(weekStart).trim());
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    weeks: Array.from(uniqueWeeks)
  })).setMimeType(ContentService.MimeType.JSON);
}

function readData(sheet, weekStart) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  
  let result = [];
  let debugLog = []; // For debugging

  rows.forEach((row, index) => {
    // Handle Date objects in week_start column (index 0)
    let rowWeekStart = row[0];
    let rawValue = rowWeekStart; // Keep raw for debug

    if (rowWeekStart instanceof Date) {
      rowWeekStart = Utilities.formatDate(rowWeekStart, timezone, 'dd/MM/yyyy');
    }
    
    // Normalize strings for comparison
    const strRowDate = String(rowWeekStart).trim();
    const strSearchDate = String(weekStart).trim();

    // Debug first few rows
    if (index < 3) {
      debugLog.push({
        row: index + 2,
        raw: String(rawValue),
        formatted: strRowDate,
        search: strSearchDate,
        match: strRowDate === strSearchDate
      });
    }
    
    // Compare
    if (!weekStart || strRowDate === strSearchDate) {
      const obj = {};
      headers.forEach((header, i) => {
        let value = row[i];
        
        // Format Date objects back to strings for JSON
        if (value instanceof Date) {
          if (i === 0) { // week_start
            value = Utilities.formatDate(value, timezone, 'dd/MM/yyyy');
          } else if (i === 3 || i === 4) { // start_time, end_time
            value = Utilities.formatDate(value, timezone, 'HH:mm');
          }
        }
        
        obj[header] = value;
      });
      obj.rowIndex = index + 2; // 1-indexed, skip header
      result.push(obj);
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    data: result,
    debug: debugLog // Return debug info
  })).setMimeType(ContentService.MimeType.JSON);
}

function createData(sheet, data) {
  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  
  // Parse date string strictly to ensure dd/MM/yyyy format
  // This prevents locale confusion (e.g. MM/dd vs dd/MM)
  let weekStartObj = data.week_start;
  if (typeof weekStartObj === 'string') {
    weekStartObj = Utilities.parseDate(data.week_start, timezone, 'dd/MM/yyyy');
  }

  const row = [
    weekStartObj, // Save as Date object
    data.day,
    data.task,
    data.start_time,
    data.end_time,
    data.color,
    data.category
  ];
  sheet.appendRow(row);
  const rowIndex = sheet.getLastRow();
  
  // Format the date cell to look nice (dd/MM/yyyy)
  sheet.getRange(rowIndex, 1).setNumberFormat('dd/MM/yyyy');
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Created', rowIndex: rowIndex }))
    .setMimeType(ContentService.MimeType.JSON);
}

function bulkCreateData(sheet, tasks) {
  if (!tasks || tasks.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'No tasks to create' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  const rows = [];
  
  tasks.forEach(task => {
    let weekStartObj = task.week_start;
    if (typeof weekStartObj === 'string') {
      weekStartObj = Utilities.parseDate(task.week_start, timezone, 'dd/MM/yyyy');
    }
    
    rows.push([
      weekStartObj,
      task.day,
      task.task,
      task.start_time,
      task.end_time,
      task.color,
      task.category
    ]);
  });
  
  if (rows.length > 0) {
    const lastRow = sheet.getLastRow();
    // getRange(row, column, numRows, numColumns)
    sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
    // Format date column
    sheet.getRange(lastRow + 1, 1, rows.length, 1).setNumberFormat('dd/MM/yyyy');
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Bulk Created', count: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateData(sheet, data) {
  const rowIndex = data.rowIndex;
  const timezone = sheet.getParent().getSpreadsheetTimeZone();

  if (rowIndex) {
    let weekStartObj = data.week_start;
    if (typeof weekStartObj === 'string') {
      weekStartObj = Utilities.parseDate(data.week_start, timezone, 'dd/MM/yyyy');
    }

    sheet.getRange(rowIndex, 1, 1, 7).setValues([[
      weekStartObj,
      data.day,
      data.task,
      data.start_time,
      data.end_time,
      data.color,
      data.category
    ]]);
    
    // Format the date cell
    sheet.getRange(rowIndex, 1).setNumberFormat('dd/MM/yyyy');
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Updated' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteData(sheet, data) {
  const rowIndex = data.rowIndex;
  if (rowIndex) {
    sheet.deleteRow(rowIndex);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Deleted' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// GOALS FUNCTIONS
// ==========================================

function readGoals(sheet, weekStart) {
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Goals sheet not found' })).setMimeType(ContentService.MimeType.JSON);

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  
  let result = [];

  rows.forEach((row, index) => {
    let rowWeekStart = row[0];
    if (rowWeekStart instanceof Date) {
      rowWeekStart = Utilities.formatDate(rowWeekStart, timezone, 'dd/MM/yyyy');
    }
    
    const strRowDate = String(rowWeekStart).trim();
    const strSearchDate = String(weekStart).trim();
    
    if (!weekStart || strRowDate === strSearchDate) {
      result.push({
        rowIndex: index + 2,
        week_start: strRowDate,
        type: row[1],
        text: row[2],
        completed: row[3] === true || String(row[3]).toLowerCase() === 'true',
        id: row[4]
      });
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: result })).setMimeType(ContentService.MimeType.JSON);
}

function createGoal(sheet, data) {
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Goals sheet not found' })).setMimeType(ContentService.MimeType.JSON);

  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  let weekStartObj = data.week_start;
  if (typeof weekStartObj === 'string') {
    weekStartObj = Utilities.parseDate(data.week_start, timezone, 'dd/MM/yyyy');
  }

  const row = [
    weekStartObj,
    data.type,
    data.text,
    data.completed,
    data.id
  ];
  
  sheet.appendRow(row);
  const rowIndex = sheet.getLastRow();
  sheet.getRange(rowIndex, 1).setNumberFormat('dd/MM/yyyy');
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, rowIndex: rowIndex })).setMimeType(ContentService.MimeType.JSON);
}

function updateGoal(sheet, data) {
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Goals sheet not found' })).setMimeType(ContentService.MimeType.JSON);

  const rowIndex = data.rowIndex;
  if (rowIndex) {
    // Update specific columns: type(2), text(3), completed(4)
    // week_start is col 1, id is col 5
    sheet.getRange(rowIndex, 2, 1, 3).setValues([
      [data.type,
      data.text,
      data.completed]
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function deleteGoal(sheet, data) {
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Goals sheet not found' })).setMimeType(ContentService.MimeType.JSON);

  const rowIndex = data.rowIndex;
  if (rowIndex) {
    sheet.deleteRow(rowIndex);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// NOTES FUNCTIONS
// ==========================================

function readNotes(sheet, weekStart) {
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Notes sheet not found' })).setMimeType(ContentService.MimeType.JSON);

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  
  let result = { retro: '', note: '', rowIndex: null };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let rowWeekStart = row[0];
    if (rowWeekStart instanceof Date) {
      rowWeekStart = Utilities.formatDate(rowWeekStart, timezone, 'dd/MM/yyyy');
    }
    
    if (String(rowWeekStart).trim() === String(weekStart).trim()) {
      result = {
        rowIndex: i + 2,
        week_start: rowWeekStart,
        retro: row[1] || '',
        note: row[2] || ''
      };
      break; // Only one note row per week
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: result })).setMimeType(ContentService.MimeType.JSON);
}

function saveNote(sheet, data) {
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Notes sheet not found' })).setMimeType(ContentService.MimeType.JSON);

  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  let weekStartObj = data.week_start;
  if (typeof weekStartObj === 'string') {
    weekStartObj = Utilities.parseDate(data.week_start, timezone, 'dd/MM/yyyy');
  }

  // Check if exists first (in case rowIndex is lost or not provided)
  let rowIndex = data.rowIndex;
  
  if (!rowIndex) {
    // Try to find it
    const allData = sheet.getDataRange().getValues();
    for (let i = 1; i < allData.length; i++) {
      let rowDate = allData[i][0];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(rowDate, timezone, 'dd/MM/yyyy');
      }
      if (String(rowDate).trim() === String(data.week_start).trim()) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  if (rowIndex) {
    // Update
    sheet.getRange(rowIndex, 2, 1, 2).setValues([[data.retro, data.note]]);
  } else {
    // Create
    sheet.appendRow([weekStartObj, data.retro, data.note]);
    rowIndex = sheet.getLastRow();
    sheet.getRange(rowIndex, 1).setNumberFormat('dd/MM/yyyy');
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, rowIndex: rowIndex })).setMimeType(ContentService.MimeType.JSON);
}
