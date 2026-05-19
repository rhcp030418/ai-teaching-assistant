// 확장 아이콘 클릭 시 사이드 패널 열기
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// e-class 도메인에서만 사이드 패널 활성화
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
