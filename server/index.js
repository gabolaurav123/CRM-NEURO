import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDatabaseSchema } from './db.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { requireInternalApiKey } from './middleware/internal.middleware.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import conversationsRoutes from './routes/conversations.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import followupsRoutes from './routes/followups.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import internalRoutes from './routes/internal.routes.js';
import { startWhatsappKeepAlive } from './services/whatsappSessionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3001);

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: true,
    credentials: false
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    product: process.env.PRODUCT_NAME || 'Gimnasio del Cerebro'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/internal', requireInternalApiKey, internalRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/leads', requireAuth, leadsRoutes);
app.use('/api/conversations', requireAuth, conversationsRoutes);
app.use('/api/whatsapp', requireAuth, whatsappRoutes);
app.use('/api/payments', requireAuth, paymentsRoutes);
app.use('/api/followups', requireAuth, followupsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) next();
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  const payload = {
    error: error.message || 'SERVER_ERROR'
  };

  if (process.env.NODE_ENV !== 'production' && error.stack) {
    payload.stack = error.stack;
  }

  if (status >= 500) {
    console.error('[server]', error);
  }

  res.status(status).json(payload);
});

ensureDatabaseSchema()
  .catch((error) => {
    console.error('[postgres] Schema check failed:', error.message);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`[server] Gimnasio del Cerebro listening on port ${port}`);
      startWhatsappKeepAlive();
    });
  });
