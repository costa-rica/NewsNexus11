import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface KeywordAttributes {
  id: number;
  keyword: string;
  category: string | null;
  isArchived: boolean;
}

interface KeywordCreationAttributes extends Optional<KeywordAttributes, 'id' | 'category' | 'isArchived'> {}

export class Keyword extends Model<KeywordAttributes, KeywordCreationAttributes> implements KeywordAttributes {
  public id!: number;
  public keyword!: string;
  public category!: string | null;
  public isArchived!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initKeyword() {
  Keyword.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      keyword: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
      },
      isArchived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Keyword',
      tableName: 'Keywords',
      timestamps: true,
    }
  );
  return Keyword;
}

export default Keyword;