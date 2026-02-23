import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

// Define the Attributes Interface
interface PromptAttributes {
  id: number;
  promptInMarkdown: string;
}

// Define the Creation Attributes Interface
interface PromptCreationAttributes extends Optional<PromptAttributes, 'id'> {}

// Define the Class
export class Prompt extends Model<PromptAttributes, PromptCreationAttributes> implements PromptAttributes {
  public id!: number;
  public promptInMarkdown!: string;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Define the initialization function
export function initPrompt() {
  Prompt.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      promptInMarkdown: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Prompt',
      tableName: 'Prompts',
      timestamps: true,
    }
  );
  return Prompt;
}

export default Prompt;
