// Helper function to escape special characters in CSV
function escapeCSV(value) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Helper function to convert array of objects to CSV
function arrayToCSV(data) {
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.map(header => escapeCSV(header)).join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let cellValue = '' + row[header];
      if (row[header] === null) {
        cellValue = 'null';
      } else if (Array.isArray(row[header])) {
        cellValue = JSON.stringify(row[header]);
      } else if (typeof row[header] === 'object') {
        cellValue = JSON.stringify(row[header]);
      }
      return escapeCSV(cellValue);
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Function to scrape table data and export to CSV
async function exportQueryResults() {
  let results = [];
  let isLastPage = false;

  do {
    // Scrape current page table
    const table = document.querySelector('table');
    if (!table) {
      continue
    }

    const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      const rowData = {};
      cells.forEach((cell, i) => {
        const cellValue = cell.innerText.trim();

        // Convert string representation to actual type
        if (cellValue === 'true' || cellValue === 'false') {
          rowData[headers[i]] = cellValue === 'true'; // boolean

        } else if (cellValue === 'null') {
          rowData[headers[i]] = null; // null

        } else if (!isNaN(Number(cellValue))) {
          rowData[headers[i]] = Number(cellValue); // number

        } else if (cellValue.startsWith('["') && cellValue.endsWith('"]')) {
          rowData[headers[i]] = JSON.parse(cellValue); // array

        } else if (cellValue.startsWith('{') && cellValue.endsWith('}')) {
          const jsonString = cellValue.replace(/(\w+):/g, '"$1":');
          rowData[headers[i]] = JSON.parse(jsonString); // map

        } else if (cellValue.includes('°')) {
          rowData[headers[i]] = cellValue; // geolocation (string representation)

        } else if (cellValue.startsWith('/')) {
          rowData[headers[i]] = cellValue; // reference (string representation)

        } else if (cellValue.includes('UTC')) {
          rowData[headers[i]] = cellValue; // datetime (string representation)

        } else {
          rowData[headers[i]] = cellValue; // string or id
        }
      });
      results.push(rowData);
    }

    // Check if last page
    const nextPageButton = document.querySelector('#main > fire-router-outlet > firestore-base > f7e-data > div > div.viewer-container > f7e-query-view > f7e-data-table > mat-card > mat-paginator > div > div > div.mat-mdc-paginator-range-actions > button.mat-mdc-tooltip-trigger.mat-mdc-paginator-navigation-next.mdc-icon-button.mat-mdc-icon-button.mat-unthemed.mat-mdc-button-base');

    if (nextPageButton && !nextPageButton.disabled) {
      nextPageButton.click();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for the next page to load
    } else {
      isLastPage = true
    }

  } while (!isLastPage);

  // Convert results to CSV
  const csv = arrayToCSV(results);

  // Create a downloadable link
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `firexport_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Execute the export function
exportQueryResults();