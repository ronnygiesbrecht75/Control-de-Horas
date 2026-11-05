import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'server-data.json');

// Helper to read server data
function loadServerData(): { employees: any[]; records: any[] } {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading server data:', err);
  }
  return { employees: [], records: [] };
}

// Helper to save server data
function saveServerData(data: { employees: any[]; records: any[] }) {
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

  // API: Get all synced state
  app.get('/api/sync/state', (req, res) => {
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
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
