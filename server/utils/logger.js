const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

const ts = () => new Date().toISOString();

const logger = {
  success: (msg) =>
    console.log(`${c.green}${c.bold}✓${c.reset} ${c.gray}[${ts()}]${c.reset} ${msg}`),

  error: (msg, err) =>
    console.error(
      `${c.red}${c.bold}✗${c.reset} ${c.gray}[${ts()}]${c.reset} ${c.red}${msg}${c.reset}`,
      err ? (err.message || String(err)) : ''
    ),

  info: (msg) =>
    console.log(`${c.cyan}${c.bold}ℹ${c.reset} ${c.gray}[${ts()}]${c.reset} ${msg}`),

  warn: (msg) =>
    console.warn(`${c.yellow}${c.bold}⚠${c.reset} ${c.gray}[${ts()}]${c.reset} ${c.yellow}${msg}${c.reset}`),
};

export default logger;
