# Database Overview

This document provides a comprehensive overview of the NewsNexus11Db database schema. All tables use SQLite as the underlying database engine and are managed through Sequelize ORM.

## NewsNexus11Db Description

- One class per table (`src/models/<Name>.ts`) with strong typings.
- Centralized initialization and associations.
- Emit `.d.ts` so downstream apps (API, mobile) get type-safe imports.
- dist/ is the output directory for compiled JavaScript files.
- src/ is the source directory for TypeScript files.
- All tables have an updatedAt and createdAt field.

## Database / Project Architecture

### Project Structure

```
NewsNexus11Db/
├── src/                          # TypeScript source files
│   ├── index.ts                  # Main entry point
│   └── models/                   # Sequelize model definitions
│       ├── _connection.ts        # Database connection setup
│       ├── _index.ts            # Model registry and exports
│       ├── _associations.ts     # All model relationships
│       ├── Article.ts           # Core article model
│       ├── User.ts              # User management
│       └── [ other models...] # Complete model suite
├── dist/                        # Compiled JavaScript output
│   ├── index.js                 # Compiled entry point
│   ├── index.d.ts               # TypeScript declarations
│   └── models/                  # Compiled models with .d.ts files
├── docs/                        # Documentation
└── package.json                 # Project configuration
```

### Using This Package in Your Application

**IMPORTANT: Models must be initialized before use.**

When consuming this package in a microservice or application, you MUST call `initModels()` at the very start of your application, before importing any other modules that use the database models.

#### Initialization Pattern

```javascript
require("dotenv").config();

// Step 1: Initialize models FIRST, before any other imports
const { initModels, sequelize } = require("@newsnexus/db-models");
initModels();

// Step 2: Now import other modules that use the models
const { myFunction } = require("./modules/myModule");
const { anotherFunction } = require("./modules/anotherModule");

// Step 3: (Optional) Sync database schema if tables don't exist
async function main() {
  await sequelize.sync(); // Creates tables if they don't exist

  // Your application logic here
}

main();
```

#### Why This Order Matters

- `initModels()` calls all model initialization functions (e.g., `initArticle()`, `initUser()`, etc.)
- It then calls `applyAssociations()` to set up all model relationships
- Models are unusable until this initialization completes
- If you try to use models before calling `initModels()`, you'll get errors like:
  - `TypeError: Cannot read properties of undefined (reading 'constructor')`
  - `TypeError: Cannot read properties of undefined (reading 'sequelize')`

#### Environment Variables

The package inherits environment variables from the consuming application. No `.env` file is needed in the package itself.

Required environment variables:

- `PATH_DATABASE`: Directory path for the database file (e.g., `/Users/nick/_databases/NewsNexus10/`)
- `NAME_DB`: Database filename (e.g., `newsnexus10.db`)

#### Creating Database Schema

If your database is new or missing tables, use `sequelize.sync()`:

```javascript
// Creates all tables based on model definitions
await sequelize.sync();

// Or with options:
await sequelize.sync({ alter: true }); // Updates existing tables to match models
await sequelize.sync({ force: true }); // WARNING: Drops all tables first
```

#### Using Models

After initialization, import and use models normally:

```javascript
const { Article, NewsApiRequest, User } = require("@newsnexus/db-models");

// Query examples
const articles = await Article.findAll({ limit: 10 });
const request = await NewsApiRequest.findOne({ where: { id: 1 } });
```

## Template (copy for each new model)

```ts
// src/models/Example.ts
import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from "sequelize";
import { sequelize } from "./_connection";

export class Example extends Model<
  InferAttributes<Example>,
  InferCreationAttributes<Example>
> {
  declare id: CreationOptional<number>;
  declare name: string;

  // FK example:
  // declare userId: ForeignKey<User["id"]>;
  // declare user?: NonAttribute<User>;
}

export function initExample() {
  Example.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      // userId: { type: DataTypes.INTEGER, allowNull: false }
    },
    {
      sequelize,
      tableName: "examples",
      timestamps: true,
    },
  );
  return Example;
}
```

## Example src/models/\_index.ts

```ts
// SAMPLE of different proejctsrc/models/_index.ts
import { sequelize } from "./_connection";

import { initExample, Example } from "./Example";

import { applyAssociations } from "./_associations";

/** Initialize all models and associations once per process. */
export function initModels() {
  initExample();
  applyAssociations();

  return {
    sequelize,
    Example,
  };
}

// 👇 Export named items for consumers
export { sequelize, Example };

// 👇 Export named items for consumers
export { sequelize, Example };
```

### Database Configuration

- **Database Type**: SQLite (via Sequelize ORM)
- **Environment Variables**:
  - `PATH_DATABASE`: Directory path for database file
  - `NAME_DB`: Database filename
- **No .env file required**: Inherits environment from importing application
