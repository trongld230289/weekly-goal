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

function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  if (action === 'read') {
    const weekStart = e.parameter.week_start;
    return readData(sheet, weekStart);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'read') {
    return readData(sheet, data.week_start);
  } else if (action === 'create') {
    return createData(sheet, data);
  } else if (action === 'update') {
    return updateData(sheet, data);
  } else if (action === 'delete') {
    return deleteData(sheet, data);
  } else if (action === 'getAvailableWeeks') {
    return getAvailableWeeks(sheet);
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
