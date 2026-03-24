const API_BASE_URL = 'http://localhost:5000';

const healthCheckButton = document.getElementById('health-check-btn');
const outputElement = document.getElementById('output');

async function checkBackendHealth() {
  outputElement.textContent = 'Loading...';

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    outputElement.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    outputElement.textContent = `Request failed: ${error.message}`;
  }
}

healthCheckButton.addEventListener('click', checkBackendHealth);
