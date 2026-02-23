import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface ArticleEntityWhoCategorizedArticleContracts02Attributes {
  id: number;
  articleId: number;
  entityWhoCategorizesId: number;
  key: string | null;
  valueString: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
}

interface ArticleEntityWhoCategorizedArticleContracts02CreationAttributes extends Optional<ArticleEntityWhoCategorizedArticleContracts02Attributes, 'id' | 'key' | 'valueString' | 'valueNumber' | 'valueBoolean'> {}

export class ArticleEntityWhoCategorizedArticleContracts02 extends Model<ArticleEntityWhoCategorizedArticleContracts02Attributes, ArticleEntityWhoCategorizedArticleContracts02CreationAttributes> implements ArticleEntityWhoCategorizedArticleContracts02Attributes {
  public id!: number;
  public articleId!: number;
  public entityWhoCategorizesId!: number;
  public key!: string | null;
  public valueString!: string | null;
  public valueNumber!: number | null;
  public valueBoolean!: boolean | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initArticleEntityWhoCategorizedArticleContracts02() {
  ArticleEntityWhoCategorizedArticleContracts02.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    entityWhoCategorizesId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING,
    },
    valueString: {
      type: DataTypes.STRING,
    },
    valueNumber: {
      type: DataTypes.FLOAT,
    },
    valueBoolean: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    sequelize,
    modelName: 'ArticleEntityWhoCategorizedArticleContracts02',
    tableName: 'ArticleEntityWhoCategorizedArticleContracts02',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["articleId", "entityWhoCategorizesId", "key"],
      },
    ],
  }
  );
  return ArticleEntityWhoCategorizedArticleContracts02;
}

export default ArticleEntityWhoCategorizedArticleContracts02;
