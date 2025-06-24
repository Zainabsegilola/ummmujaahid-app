import { config } from 'dotenv';

config(); // Load environment variables from .env.local

const apiKey = process.env.NEXT_PUBLIC_SUPADATA_API_KEY;
const url = 'https://api.supadata.ai/v1/youtube/transcript?url=https://youtu.be/pShdOD-iVzA&text=true';

async function testConnection() {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Connection successful:', data.content);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();