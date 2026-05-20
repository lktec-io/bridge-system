import 'dotenv/config';
import app    from './app.js';
import { testConnection }        from './config/database.js';
import { startInspectionReminder } from './cron/inspectionReminderJob.js';
import logger from './utils/logger.js';

const PORT     = process.env.PORT     || 8005;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function start() {
  // ── Database ──────────────────────────────────────────────
  try {
    await testConnection();
    logger.success('MySQL connected');
  } catch (err) {
    logger.error('MySQL connection FAILED — check DB_* variables in .env', err);
    process.exit(1);
  }

  // ── Background jobs ───────────────────────────────────────
  startInspectionReminder();

  // ── HTTP server ───────────────────────────────────────────
  const server = app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   Bridge Information System — API v1     ║');
    console.log(`  ║   Port        : ${String(PORT).padEnd(24)}║`);
    console.log(`  ║   Environment : ${NODE_ENV.padEnd(24)}║`);
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
    logger.success(`Server listening on port ${PORT}`);
  });

  // ── Graceful shutdown ─────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.success('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException',  (err)    => { logger.error('Uncaught exception',  err);    process.exit(1); });
  process.on('unhandledRejection', (reason) => { logger.error('Unhandled rejection', reason); process.exit(1); });
}

start();
