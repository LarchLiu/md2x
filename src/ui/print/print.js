const rootElement = document.getElementById('print-root');
const errorElement = document.getElementById('print-error');
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
let cleanedUp = false;
let fallbackTimer = null;

function showError(message) {
  if (!errorElement) {
    console.error(message);
    return;
  }
  errorElement.textContent = message;
  errorElement.hidden = false;
}

async function finishPrint(reason) {
  if (cleanedUp) {
    return;
  }
  cleanedUp = true;
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  if (token) {
    try {
      await chrome.runtime.sendMessage({
        type: 'PRINT_JOB_COMPLETE',
        token,
        reason,
        closeTab: false
      });
    } catch (error) {
      console.error('Failed to complete print job:', error);
    }
  }
  window.close();
}

function waitForImages(container) {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(images.map((img) => {
    if (img.complete) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    });
  }));
}

async function renderAndPrint(job) {
  if (!rootElement) {
    showError('Missing print root element');
    await finishPrint('missing-root');
    return;
  }

  const contentWrapper = document.createElement('div');
  contentWrapper.id = 'markdown-content';
  contentWrapper.innerHTML = job.html || '';
  rootElement.innerHTML = '';
  rootElement.appendChild(contentWrapper);

  if (job.title) {
    document.title = job.title;
  }

  await waitForImages(contentWrapper);

  setTimeout(() => {
    window.print();
  }, 0);

  fallbackTimer = setTimeout(() => {
    finishPrint('timeout');
  }, 120000);
}

async function requestAndRender() {
  if (!token) {
    showError('Missing print job token');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PRINT_JOB_REQUEST',
      token
    });

    if (!response || !response.success) {
      showError(response?.error || 'Failed to load print job');
      await finishPrint('job-error');
      return;
    }

    const payload = response.payload || {};
    const totalLength = typeof payload.length === 'number' ? payload.length : 0;
    const chunkSize = typeof payload.chunkSize === 'number' && payload.chunkSize > 0 ? payload.chunkSize : 256 * 1024;

    const chunks = [];
    let offset = 0;
    while (offset < totalLength) {
      const fetchResponse = await chrome.runtime.sendMessage({
        type: 'PRINT_JOB_FETCH_CHUNK',
        token,
        offset,
        length: chunkSize
      });

      if (!fetchResponse || !fetchResponse.success) {
        showError(fetchResponse?.error || 'Failed to retrieve print data');
        await finishPrint('chunk-error');
        return;
      }

      const chunk = typeof fetchResponse.chunk === 'string' ? fetchResponse.chunk : '';
      chunks.push(chunk);
      const nextOffset = typeof fetchResponse.nextOffset === 'number' ? fetchResponse.nextOffset : offset + chunk.length;

      if (chunk.length === 0 || nextOffset <= offset) {
        offset = totalLength;
      } else {
        offset = nextOffset;
      }
    }

    const job = {
      html: chunks.join(''),
      title: payload.title,
      filename: payload.filename
    };

    await renderAndPrint(job);
  } catch (error) {
    console.error('Print job request failed:', error);
    showError('Unable to request print job.');
    await finishPrint('request-error');
  }
}

window.addEventListener('afterprint', () => {
  finishPrint('afterprint');
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    finishPrint('escape');
  }
});

window.addEventListener('beforeunload', () => {
  if (!cleanedUp) {
    cleanedUp = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (token) {
      chrome.runtime.sendMessage({
        type: 'PRINT_JOB_COMPLETE',
        token,
        reason: 'beforeunload',
        closeTab: false
      }).catch((error) => {
        console.error('Failed to cleanup print job on unload:', error);
      });
    }
  }
});

requestAndRender();
