execute();

// Execute the export function
async function execute() {
  insertStyle();

  startLoading();
  try {
    await exportQueryResults();
  } catch (e) {
    console.log(e);
    alert('fail to export firestore');
  } finally {
    endLoading();
  }
}

// Function to scrape table data and export to CSV
async function exportQueryResults() {
  let results = [];
  let isLastPage = false;
  let tableNotFoundCount = 0;

  do {
    if (tableNotFoundCount > 5) {
      break;
    }

    // Scrape current page table
    const table = document.querySelector('table');
    if (!table) {
      tableNotFoundCount += 1
      continue;
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

// Helper function to escape special characters in CSV
function escapeCSV(value) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function startLoading() {
  const loader = getLoader();
  loader.classList.add('active');
}

function endLoading() {
  const loader = getLoader();
  loader.classList.remove('active');
}

function getLoader() {
  let loader = document.getElementById('firexport-loader');

  if (!loader) {
    const newLoaderContent = document.createElement('div');
    newLoaderContent.classList.add('loader');

    const newLoader = document.createElement('div');
    newLoader.id = 'firexport-loader';
    newLoader.appendChild(newLoaderContent);

    document.body.appendChild(newLoader);

    loader = newLoader;
  }

  return loader;
}

function insertStyle() {
  const style = document.getElementById('firexport-loader-style');

  if (style) {
    return;
  }

  const newStyle = document.createElement('style');
  newStyle.id = 'firexport-loader-style';
  newStyle.textContent = `
    #firexport-loader.active {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    #firexport-loader.active .loader {
      width: 50px;
      aspect-ratio: 1;
      display:grid;
      -webkit-mask: conic-gradient(from 15deg,#0000,#000);
      animation: l26 1s infinite steps(12);
    }
    #firexport-loader.active .loader,
    #firexport-loader.active .loader:before,
    #firexport-loader.active .loader:after{
      background:
        radial-gradient(closest-side at 50% 12.5%,
        #f03355 96%,#0000) 50% 0/20% 80% repeat-y,
        radial-gradient(closest-side at 12.5% 50%,
        #f03355 96%,#0000) 0 50%/80% 20% repeat-x;
    }
    #firexport-loader.active .loader:before,
    #firexport-loader.active .loader:after {
      content: "";
      grid-area: 1/1;
      transform: rotate(30deg);
    }
    #firexport-loader.active .loader:after {
      transform: rotate(60deg);
    }

    @keyframes l26 {
      100% {transform:rotate(1turn)}
    }
  `;

  document.head.appendChild(newStyle);
}