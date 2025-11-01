import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { StorageService } from './services/storage.service';

const storage = new StorageService();

const app = new Elysia()
  .use(cors({ origin: true, credentials: true }))
  .get('/api/video', () => ({
    videoId: 'yt-abc123',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Sample Video',
    duration: 212,
  }))
  .post(
    '/api/progress/queue',
    ({ body }) => {
      const queueItem = storage.addToQueue(body);
      return { ok: true, item: queueItem };
    },
    {
      body: t.Object({
        videoId: t.String(),
        userId: t.String(),
        progressSeconds: t.Number({ minimum: 0 }),
      }),
    }
  )
  .get(
    '/api/progress/furthest',
    ({ query }) => {
      const { userId, videoId } = query;
      const progress = storage.getProgress(userId, videoId);
      return {
        videoId,
        userId,
        furthestSeconds: progress?.furthestSeconds || 0,
        lastUpdated: progress?.updatedAt || null,
      };
    },
    {
      query: t.Object({
        userId: t.String(),
        videoId: t.String(),
      }),
    } 
  )
  .post('/api/progress/run-cron', () => {
    const result = storage.processCronJob();
    return result;
  })
  .get('/api/stats', () => storage.getStats())
  .post('/api/reset', () => {
    storage.reset();
    return { ok: true };
  });

app.listen(3000);

console.log('Server running ');
