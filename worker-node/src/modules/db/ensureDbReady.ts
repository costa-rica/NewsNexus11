import { initModels, sequelize } from '@newsnexus/db-models';

let dbReadyPromise: Promise<void> | null = null;

export const ensureDbReady = async (): Promise<void> => {
  if (dbReadyPromise) {
    return dbReadyPromise;
  }

  dbReadyPromise = (async () => {
    initModels();
    await sequelize.authenticate();
    await sequelize.sync();
  })();

  return dbReadyPromise;
};

export default ensureDbReady;
