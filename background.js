chrome.action.onClicked.addListener(async (tab) => {
  try {
    const isQueryBuilder = checkQueryBuilder(tab)

    if (!isQueryBuilder) {
      return
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    })

  } catch (e) {
    console.log(e)
  }
})

/**
 * 어떠한 상황을 인식해야 하는가?
 * - 새탭 열기
 * - 탭 안에서 페이지 이동
 * - 탭 이동
 * 
 * "새탭 열기" 관련 이벤트
 * - onActivated
 * - onUpdated
 * 
 * "탭 안에서 페이지 이동" 관련 이벤트
 * - onUpdated
 * 
 * "탭 이동" 관련 이벤트
 * - onActivated
 */

// 새탭 열기, 탭 안에서 페이지 이동
chrome.tabs.onUpdated.addListener(async (_, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') {
    return
  }

  await handleTabEvent(tab)
})

// 새탭 열기, 탭 이동
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)

  await handleTabEvent(tab)
})

const inactiveIconPath = {
  "16": "icons/inactive_icon16.png",
  "48": "icons/inactive_icon48.png",
  "128": "icons/inactive_icon128.png"
}
const activeIconPath = {
  "16": "icons/active_icon16.png",
  "48": "icons/active_icon48.png",
  "128": "icons/active_icon128.png"
}

const inactiveTitle = 'Firexport - Cannot export here'
const activeTitle = 'Firexport - Click to export'

async function handleTabEvent(tab) {
  try {
    const isQueryBuilder = checkQueryBuilder(tab)

    await Promise.all([
      // isQueryBuilder ? chrome.action.enable(tab.id) : chrome.action.disable(tab.id),
      chrome.action.setIcon({ path: isQueryBuilder ? activeIconPath : inactiveIconPath, tabId: tab.id }),
      chrome.action.setTitle({ title: isQueryBuilder ? activeTitle : inactiveTitle, tabId: tab.id }),
    ])

  } catch (e) {
    console.log(e)
  }
}

function checkQueryBuilder(tab) {
  if (!tab.url) {
    // tab.url이 없다는 것은 host_permission에 없다는 것이니 쿼리 빌더가 아니라는 뜻
    return false
  }

  const urlObj = new URL(tab.url)

  const host = urlObj.host
  const pathSegments = urlObj.pathname.split('/')
  const viewParam = urlObj.searchParams.get('view')

  const isFirebaseConsole = host === 'console.firebase.google.com'
  const isFirestoreDataTab = ['project', 'firestore', 'databases', 'data'].every((requiredPathSegment) => pathSegments.includes(requiredPathSegment))
  const isQueryView = viewParam === 'query-view'

  return isFirebaseConsole && isFirestoreDataTab && isQueryView
}