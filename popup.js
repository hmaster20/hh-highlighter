document.addEventListener('DOMContentLoaded', () => {
    const toggleExtension = document.getElementById('toggleExtension');
    const colorPicker = document.getElementById('colorPicker');
    const borderStyle = document.getElementById('borderStyle');
    const borderWidth = document.getElementById('borderWidth');
    const overlayOpacity = document.getElementById('overlayOpacity');
    const opacityValue = document.getElementById('opacityValue');
    const resetSettings = document.getElementById('resetSettings');
    const statusMessage = document.getElementById('statusMessage');
    
    // Обновляем отображение значения прозрачности
    overlayOpacity.addEventListener('input', () => {
      opacityValue.textContent = `${overlayOpacity.value}%`;
    });
    
    // Загружаем сохраненные настройки
    chrome.storage.local.get([
      'extensionEnabled', 
      'highlightColor', 
      'borderStyle', 
      'borderWidth',
      'overlayOpacity'
    ], (data) => {
      // Устанавливаем значения из сохраненных настроек
      toggleExtension.checked = data.extensionEnabled !== false; // По умолчанию включено
      colorPicker.value = data.highlightColor || '#808080';
      borderStyle.value = data.borderStyle || 'dashed';
      borderWidth.value = data.borderWidth || '4';
      overlayOpacity.value = data.overlayOpacity || '30';
      opacityValue.textContent = `${overlayOpacity.value}%`;
    });
    
    // Сохраняем изменения настроек
    const saveSettings = () => {
      const settings = {
        extensionEnabled: toggleExtension.checked,
        highlightColor: colorPicker.value,
        borderStyle: borderStyle.value,
        borderWidth: borderWidth.value,
        overlayOpacity: overlayOpacity.value
      };
      
      chrome.storage.local.set(settings, () => {
        statusMessage.textContent = 'Настройки сохранены';
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 2000);
        
        // Отправляем сообщение content script для обновления стилей
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateStyles',
              settings: settings
            });
          }
        });
      });
    };
    
    // Обработчики изменений
    toggleExtension.addEventListener('change', saveSettings);
    colorPicker.addEventListener('change', saveSettings);
    borderStyle.addEventListener('change', saveSettings);
    borderWidth.addEventListener('change', saveSettings);
    overlayOpacity.addEventListener('change', saveSettings);
    
    // Сброс настроек
    resetSettings.addEventListener('click', () => {
      // Устанавливаем значения по умолчанию
      toggleExtension.checked = true;
      colorPicker.value = '#808080';
      borderStyle.value = 'dashed';
      borderWidth.value = '4';
      overlayOpacity.value = '30';
      opacityValue.textContent = '30%';
      
      // Сохраняем значения по умолчанию
      saveSettings();
    });
  });