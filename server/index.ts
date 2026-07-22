import express from 'express';
import cors from 'cors';
import path from 'path';
import { adaptNextRoute } from './adapter';

import * as collectionRoute from '../src/api/collection/route';
import * as collectionLinksRoute from '../src/api/collection/links/route';
import * as collectionIdRoute from '../src/api/collection/[id]/route';
import * as collectionIdClearRoute from '../src/api/collection/[id]/clear/route';
import * as collectionIdRebuildEdgesRoute from '../src/api/collection/[id]/rebuild-edges/route';
import * as collectionIdCacheStatusRoute from '../src/api/collection/[id]/cache-status/route';
import * as collectionsRoute from '../src/api/collections/route';
import * as expandIdRoute from '../src/api/expand/[id]/route';
import * as queueRoute from '../src/api/queue/route';
import * as queueStatusRoute from '../src/api/queue/status/route';
import * as searchRoute from '../src/api/search/route';
import * as settingsRoute from '../src/api/settings/route';
import * as settingsBackupManualRoute from '../src/api/settings/backup/manual/route';
import * as settingsBackupRestoreRoute from '../src/api/settings/backup/restore/route';
import * as settingsCacheRoute from '../src/api/settings/cache/route';
import * as settingsS2UsageRoute from '../src/api/settings/s2-usage/route';
import * as tagsRoute from '../src/api/tags/route';
import * as tagsIdRoute from '../src/api/tags/[id]/route';

const app = express();
app.use(cors());
// Parse large JSON payloads as this app accepts full paper objects
app.use(express.json({ limit: '10mb' }));

app.all('/api/collection', (req, res) => adaptNextRoute(req, res, collectionRoute));
app.all('/api/collection/links', (req, res) => adaptNextRoute(req, res, collectionLinksRoute));
app.all('/api/collection/:id', (req, res) => adaptNextRoute(req, res, collectionIdRoute, { id: req.params.id }));
app.all('/api/collection/:id/clear', (req, res) => adaptNextRoute(req, res, collectionIdClearRoute, { id: req.params.id }));
app.all('/api/collection/:id/rebuild-edges', (req, res) => adaptNextRoute(req, res, collectionIdRebuildEdgesRoute, { id: req.params.id }));
app.all('/api/collection/:id/cache-status', (req, res) => adaptNextRoute(req, res, collectionIdCacheStatusRoute, { id: req.params.id }));
app.all('/api/collections', (req, res) => adaptNextRoute(req, res, collectionsRoute));
app.all('/api/expand/:id', (req, res) => adaptNextRoute(req, res, expandIdRoute, { id: req.params.id }));
app.all('/api/queue', (req, res) => adaptNextRoute(req, res, queueRoute));
app.all('/api/queue/status', (req, res) => adaptNextRoute(req, res, queueStatusRoute));
app.all('/api/search', (req, res) => adaptNextRoute(req, res, searchRoute));
app.all('/api/settings', (req, res) => adaptNextRoute(req, res, settingsRoute));
app.all('/api/settings/backup/manual', (req, res) => adaptNextRoute(req, res, settingsBackupManualRoute));
app.all('/api/settings/backup/restore', (req, res) => adaptNextRoute(req, res, settingsBackupRestoreRoute));
app.all('/api/settings/cache', (req, res) => adaptNextRoute(req, res, settingsCacheRoute));
app.all('/api/settings/s2-usage', (req, res) => adaptNextRoute(req, res, settingsS2UsageRoute));
app.all('/api/tags', (req, res) => adaptNextRoute(req, res, tagsRoute));
app.all('/api/tags/:id', (req, res) => adaptNextRoute(req, res, tagsIdRoute, { id: req.params.id }));

const outPath = path.join(__dirname, '../out');
app.use(express.static(outPath));

app.use((req, res) => {
  res.sendFile(path.join(outPath, 'index.html'));
});

const port = process.env.DEV_API_PORT || process.env.PORT || 8005;
app.listen(port, () => {
  console.log(`Standalone server listening on port ${port}`);
  // Keep the event loop alive
  setInterval(() => {}, 1000 * 60 * 60);
});
