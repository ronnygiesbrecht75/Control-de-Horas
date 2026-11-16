import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'server-data.json');

interface ServerData {
  employees: any[];
  records: any[];
  adjustments: any[];
  vacations: any[];
  currency?: { symbol: string; code: string };
}

// Helper to read server data
function loadServerData(): ServerData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        employees: Array.isArray(parsed.employees) ? parsed.employees : [],
        records: Array.isArray(parsed.records) ? parsed.records : [],
        adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
        vacations: Array.isArray(parsed.vacations) ? parsed.vacations : [],
        currency: parsed.currency || { symbol: '₲', code: 'PYG' }
      };
    }
  } catch (err) {
    console.error('Error reading server data:', err);
  }
  return {
    employees: [],
    records: [],
    adjustments: [],
    vacations: [],
    currency: { symbol: '₲', code: 'PYG' }
  };
}

// Helper to save server data
function saveServerData(data: ServerData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server data:', err);
  }
}

async function start() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Enable CORS so desktop Electron app on PC can sync to cloud
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API: Google Maps Platform client configuration (key provisioned via AI Studio environment)
  app.get('/api/maps-config', (_req, res) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({ apiKey });
  });

  // API: Server-side Reverse Geocoding proxy (avoids browser CORS issues per GMP best practices)
  app.get('/api/reverse-geocode', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Coordenadas inválidas' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      return res.json({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      const data: any = await response.json();
      if (response.ok && data?.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
        return res.json({
          address: data.results[0].formatted_address,
          placeId: data.results[0].place_id
        });
      }
      if (response.status === 429 || data?.status === 'OVER_QUERY_LIMIT') {
        return res.status(429).json({ error: 'RESOURCE_EXHAUSTED', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      }
      return res.json({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    } catch (err) {
      console.debug('Reverse geocode fallback:', err);
      return res.json({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  });

  // API: Get all synced state
  app.get('/api/sync/state', (_req, res) => {
    const data = loadServerData();
    res.json(data);
  });

  // API: Save employees from PC / Admin
  app.post('/api/sync/employees', (req, res) => {
    const { employees } = req.body;
    if (Array.isArray(employees)) {
      const current = loadServerData();
      current.employees = employees;
      saveServerData(current);
      return res.json({ success: true, count: employees.length });
    }
    res.status(400).json({ error: 'Invalid employees data' });
  });

  // API: Save records from PC / Admin
  app.post('/api/sync/records', (req, res) => {
    const { records } = req.body;
    if (Array.isArray(records)) {
      const current = loadServerData();
      current.records = records;
      saveServerData(current);
      return res.json({ success: true, count: records.length });
    }
    res.status(400).json({ error: 'Invalid records data' });
  });

  // API: Save adjustments (payments / liquidations) from PC / Admin
  app.post('/api/sync/adjustments', (req, res) => {
    const { adjustments } = req.body;
    if (Array.isArray(adjustments)) {
      const current = loadServerData();
      current.adjustments = adjustments;
      saveServerData(current);
      return res.json({ success: true, count: adjustments.length });
    }
    res.status(400).json({ error: 'Invalid adjustments data' });
  });

  // API: Save vacations from PC / Admin
  app.post('/api/sync/vacations', (req, res) => {
    const { vacations } = req.body;
    if (Array.isArray(vacations)) {
      const current = loadServerData();
      current.vacations = vacations;
      saveServerData(current);
      return res.json({ success: true, count: vacations.length });
    }
    res.status(400).json({ error: 'Invalid vacations data' });
  });

  // API: Post single vacation request from employee phone
  app.post('/api/sync/vacation-request', (req, res) => {
    const { vacation } = req.body;
    if (vacation && vacation.id && vacation.employeeId) {
      const current = loadServerData();
      const idx = current.vacations.findIndex((v: any) => v.id === vacation.id);
      if (idx >= 0) {
        current.vacations[idx] = vacation;
      } else {
        current.vacations.push(vacation);
      }
      saveServerData(current);
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Missing vacation data' });
  });

  // API: Save currency setting
  app.post('/api/sync/currency', (req, res) => {
    const { currency } = req.body;
    if (currency && currency.symbol && currency.code) {
      const current = loadServerData();
      current.currency = currency;
      saveServerData(current);
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Invalid currency data' });
  });

  // API: Post single punch from employee phone
  app.post('/api/sync/punch', (req, res) => {
    const { record } = req.body;
    const current = loadServerData();
    if (record) {
      const idx = current.records.findIndex(
        (r: any) => r.id === record.id || (r.employeeId === record.employeeId && r.dateStr === record.dateStr)
      );
      if (idx >= 0) {
        current.records[idx] = record;
      } else {
        current.records.push(record);
      }
      saveServerData(current);
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Missing record' });
  });

  // API: Verify license key for PWA mobile access
  app.get('/api/verify-license/:key', (req, res) => {
    const rawKey = (req.params.key || '').trim().toUpperCase();
    const current = loadServerData();
    const cleanKey = rawKey.replace(/^LIC-/, '');

    const matched = current.employees.find((e: any) => {
      if (!e.licenseKey) return false;
      const k = e.licenseKey.trim().toUpperCase();
      return k === rawKey || k.replace(/^LIC-/, '') === cleanKey;
    });

    if (matched) {
      if (!matched.active) {
        return res.status(403).json({ error: 'Empleado inactivo' });
      }
      return res.json({ valid: true, employee: matched });
    }

    res.status(404).json({ error: 'Licencia no encontrada' });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
