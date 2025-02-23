document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.sync.get({
    textSize: 16,
    transparency: 100,
    theme: 'light',
    contrast: 100
  }, (settings) => {
    // Initialize input values
    document.getElementById('textSize').value = settings.textSize;
    document.getElementById('textSizeValue').textContent = settings.textSize;
    
    document.getElementById('transparency').value = settings.transparency;
    document.getElementById('transparencyValue').textContent = settings.transparency;
    
    document.getElementById('theme').value = settings.theme;
    
    document.getElementById('contrast').value = settings.contrast;
    document.getElementById('contrastValue').textContent = settings.contrast;
  });

  // Add event listeners for settings changes
  document.getElementById('textSize').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('textSizeValue').textContent = value;
    saveSettings({ textSize: Number(value) });
  });

  document.getElementById('transparency').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('transparencyValue').textContent = value;
    saveSettings({ transparency: Number(value) });
  });

  document.getElementById('theme').addEventListener('change', (e) => {
    saveSettings({ theme: e.target.value });
  });

  document.getElementById('contrast').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('contrastValue').textContent = value;
    saveSettings({ contrast: Number(value) });
  });

  // Back button handler
  document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = 'popup.html';
  });
});

function saveSettings(changes) {
  chrome.storage.sync.get(null, (currentSettings) => {
    const newSettings = { ...currentSettings, ...changes };
    chrome.storage.sync.set(newSettings, () => {
      // Notify content script of settings changes
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SETTINGS_UPDATED',
          settings: newSettings
        });
      });
    });
  });
} 