document.addEventListener('DOMContentLoaded', () => {
  // Query the active tab
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    const tab = tabs[0];
    
    try {
      // Execute script to extract Schema.org data
      const results = await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: extractSchemaData,
      });
      
      const schemas = results[0].result;
      displaySchemas(schemas);
      
    } catch (error) {
      console.error('Error:', error);
      displayError('Failed to extract schema data');
    }
  });
});

function extractSchemaData() {
  const schemas = [];
  
  // Extract JSON-LD
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      schemas.push({
        type: 'JSON-LD',
        content: data,
        valid: true
      });
    } catch (e) {
      schemas.push({
        type: 'JSON-LD',
        content: script.textContent,
        valid: false,
        error: 'Invalid JSON-LD syntax'
      });
    }
  });
  
  // Extract Microdata
  const microdataElements = document.querySelectorAll('[itemtype]');
  microdataElements.forEach(element => {
    const itemType = element.getAttribute('itemtype');
    const itemProps = {};
    
    element.querySelectorAll('[itemprop]').forEach(prop => {
      const propName = prop.getAttribute('itemprop');
      itemProps[propName] = prop.textContent.trim();
    });
    
    schemas.push({
      type: 'Microdata',
      content: {
        '@type': itemType,
        ...itemProps
      },
      valid: true
    });
  });
  
  return schemas;
}

function displaySchemas(schemas) {
  const schemaList = document.getElementById('schemaList');
  const schemaCount = document.getElementById('schemaCount');
  
  schemaCount.textContent = `${schemas.length} schema${schemas.length !== 1 ? 's' : ''} found`;
  
  if (schemas.length === 0) {
    schemaList.innerHTML = '<div class="schema-item">No Schema.org data found on this page.</div>';
    return;
  }
  
  schemas.forEach((schema, index) => {
    const schemaDiv = document.createElement('div');
    schemaDiv.className = 'schema-item';
    
    const typeDiv = document.createElement('div');
    typeDiv.className = 'schema-type';
    typeDiv.textContent = `${schema.type} Schema #${index + 1}`;
    
    const contentPre = document.createElement('pre');
    contentPre.className = 'schema-content';
    contentPre.textContent = JSON.stringify(schema.content, null, 2);
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy to Clipboard';
    copyButton.onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(schema.content, null, 2));
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy to Clipboard';
      }, 2000);
    };
    
    schemaDiv.appendChild(typeDiv);
    schemaDiv.appendChild(contentPre);
    schemaDiv.appendChild(copyButton);
    
    if (!schema.valid) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'validation-error';
      errorDiv.textContent = schema.error;
      schemaDiv.appendChild(errorDiv);
    } else {
      const validDiv = document.createElement('div');
      validDiv.className = 'validation-success';
      validDiv.textContent = 'Schema validation passed';
      schemaDiv.appendChild(validDiv);
    }
    
    schemaList.appendChild(schemaDiv);
  });
}

function displayError(message) {
  const schemaList = document.getElementById('schemaList');
  schemaList.innerHTML = `<div class="validation-error">${message}</div>`;
}