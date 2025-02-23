chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SETTINGS') {
    chrome.windows.create({
      url: 'settings.html',
      type: 'popup',
      width: 440,
      height: 600
    });
  }
}); 