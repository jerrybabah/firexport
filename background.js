function checkUrlAndView(url) {
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/');

  // Check if URL matches the required pattern
  if ((
    pathSegments.length > 4 &&
    pathSegments[1] === 'project' &&
    pathSegments[3] === 'firestore' &&
    pathSegments[4] === 'databases'
  ) || (
      pathSegments.length > 6 &&
      pathSegments[3] === 'project' &&
      pathSegments[5] === 'firestore' &&
      pathSegments[6] === 'databases'
    )) {
    const viewParam = urlObj.searchParams.get("view");
    return viewParam;
  }
  return null;
}

function updateIcon(tabId, viewParam) {
  let iconPath = {
    "16": "icons/inactive_icon16.png",
    "48": "icons/inactive_icon48.png",
    "128": "icons/inactive_icon128.png"
  };
  let title = '[Firexport] Cannot export here';

  if (viewParam === "query-view") {
    iconPath = {
      "16": "icons/active_icon16.png",
      "48": "icons/active_icon48.png",
      "128": "icons/active_icon128.png"
    };
    title = '[Firexport] Click to export'
  }

  chrome.action.setIcon({
    tabId: tabId,
    path: iconPath
  });
  chrome.action.setTitle({ title: title });
}

function handleIconClick(tab) {
  if (tab.url) {
    const viewParam = checkUrlAndView(tab.url);

    if (viewParam === "query-view") {
      // Execute the content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } else {
      console.log("Content script not executed: view is not 'query-view'");
    }
  } else {
    console.log("Content script not executed: URL does not match the required pattern");
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (tab) {
    handleIconClick(tab);
  }
});

function updateIconBasedOnURL(tabId, url) {
  const viewParam = checkUrlAndView(url);
  updateIcon(tabId, viewParam);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateIconBasedOnURL(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (tab.url) {
      updateIconBasedOnURL(activeInfo.tabId, tab.url);
    }
  });
});