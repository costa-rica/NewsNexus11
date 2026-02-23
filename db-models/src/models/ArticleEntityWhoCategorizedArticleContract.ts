import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface ArticleEntityWhoCategorizedArticleContractAttributes {
  id: number;
  articleId: number;
  entityWhoCategorizesId: number;
  keyword: string | null;
  keywordRating: number | null;
}

interface ArticleEntityWhoCategorizedArticleContractCreationAttributes extends Optional<ArticleEntityWhoCategorizedArticleContractAttributes, 'id' | 'keyword' | 'keywordRating'> {}

export class ArticleEntityWhoCategorizedArticleContract extends Model<ArticleEntityWhoCategorizedArticleContractAttributes, ArticleEntityWhoCategorizedArticleContractCreationAttributes> implements ArticleEntityWhoCategorizedArticleContractAttributes {
  public id!: number;
  public articleId!: number;
  public entityWhoCategorizesId!: number;
  public keyword!: string | null;
  public keywordRating!: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initArticleEntityWhoCategorizedArticleContract() {
  ArticleEntityWhoCategorizedArticleContract.init(
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
    keyword: {
      type: DataTypes.STRING,
    },
    keywordRating: {
      type: DataTypes.FLOAT,
    },
  },
  {
    sequelize,
    modelName: 'ArticleEntityWhoCategorizedArticleContract',
    tableName: 'ArticleEntityWhoCategorizedArticleContracts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["articleId", "entityWhoCategorizesId", "keyword"],
      },
    ],
  }
  );
  return ArticleEntityWhoCategorizedArticleContract;
}

export default ArticleEntityWhoCategorizedArticleContract;