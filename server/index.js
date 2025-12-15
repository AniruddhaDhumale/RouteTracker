const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;
const ORS_BASE_URL = 'https://api.openrouteservice.org';

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/route/directions', async (req, res) => {
  if (!ORS_API_KEY) {
    return res.status(500).json({ error: 'OpenRouteService API key not configured' });
  }

  try {
    const { coordinates, profile = 'driving-car' } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: 'Invalid coordinates. Provide at least 2 coordinate pairs.' });
    }

    const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates,
        instructions: false,
        geometry: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'OpenRouteService API error', details: errorText });
    }

    const data = await response.json();

    const result = {
      distance: data.routes?.[0]?.summary?.distance || 0,
      duration: data.routes?.[0]?.summary?.duration || 0,
      geometry: data.routes?.[0]?.geometry || null,
    };

    res.json(result);
  } catch (error) {
    console.error('Route directions error:', error);
    res.status(500).json({ error: 'Failed to get route directions' });
  }
});

app.post('/api/route/matrix', async (req, res) => {
  if (!ORS_API_KEY) {
    return res.status(500).json({ error: 'OpenRouteService API key not configured' });
  }

  try {
    const { locations, profile = 'driving-car' } = req.body;

    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return res.status(400).json({ error: 'Invalid locations. Provide at least 2 location pairs.' });
    }

    const response = await fetch(`${ORS_BASE_URL}/v2/matrix/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations,
        metrics: ['distance', 'duration'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS Matrix API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'OpenRouteService API error', details: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Matrix error:', error);
    res.status(500).json({ error: 'Failed to get distance matrix' });
  }
});

app.post('/api/route/snap', async (req, res) => {
  if (!ORS_API_KEY) {
    return res.status(500).json({ error: 'OpenRouteService API key not configured' });
  }

  try {
    const { coordinates, profile = 'driving-car' } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: 'Invalid coordinates. Provide at least 2 coordinate pairs.' });
    }

    const response = await fetch(`${ORS_BASE_URL}/v2/snap/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: coordinates,
        radius: 350,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS Snap API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'OpenRouteService API error', details: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Snap error:', error);
    res.status(500).json({ error: 'Failed to snap to roads' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`ORS API Key configured: ${ORS_API_KEY ? 'Yes' : 'No'}`);
});
