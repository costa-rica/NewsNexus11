import { accessSync, constants, mkdirSync } from "node:fs";
import * as path from "node:path";
import { Sequelize } from "sequelize";

const dbDir = (process.env.PATH_DATABASE || ".").trim();
const dbName = (process.env.NAME_DB || "database.sqlite").trim();
const storage = path.resolve(dbDir, dbName);
const storageDir = path.dirname(storage);

mkdirSync(storageDir, { recursive: true });
accessSync(storageDir, constants.R_OK | constants.W_OK);

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage,
  logging: false,
});

console.log(
  `database location: ${storage}`
);

export { sequelize };
export default sequelize;
