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
  
  if (action === 'create') {
    return createData(sheet, data);
  } else if (action === 'update') {
    return updateData(sheet, data);
  } else if (action === 'delete') {
    return deleteData(sheet, data);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readData(sheet, weekStart) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  let result = [];
  rows.forEach((row, index) => {
    if (!weekStart || row[0] === weekStart) {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      obj.rowIndex = index + 2; // 1-indexed, skip header
      result.push(obj);
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createData(sheet, data) {
  const row = [
    data.week_start,
    data.day,
    data.task,
    data.start_time,
    data.end_time,
    data.color,
    data.category
  ];
  sheet.appendRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Created' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateData(sheet, data) {
  const rowIndex = data.rowIndex;
  if (rowIndex) {
    sheet.getRange(rowIndex, 1, 1, 7).setValues([[
      data.week_start,
      data.day,
      data.task,
      data.start_time,
      data.end_time,
      data.color,
      data.category
    ]]);
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
