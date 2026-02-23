process.env.LOAD_LEGACY_ROUTERS = 'false';

// Import after test env override so legacy routers do not initialize in smoke tests.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../../src/app').default;

export default app;
