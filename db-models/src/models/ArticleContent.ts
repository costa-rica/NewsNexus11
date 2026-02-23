import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface ArticleContentAttributes {
  id: number;
  articleId: number;
  content: string;
  scrapeStatusCheerio: boolean | null;
  scrapeStatusPuppeteer: boolean | null;
}

interface ArticleContentCreationAttributes extends Optional<ArticleContentAttributes, 'id' | 'scrapeStatusCheerio' | 'scrapeStatusPuppeteer'> {}

export class ArticleContent extends Model<ArticleContentAttributes, ArticleContentCreationAttributes> implements ArticleContentAttributes {
  public id!: number;
  public articleId!: number;
  public content!: string;
  public scrapeStatusCheerio!: boolean | null;
  public scrapeStatusPuppeteer!: boolean | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initArticleContent() {
  ArticleContent.init(
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
      content: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      scrapeStatusCheerio: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null,
      },
      scrapeStatusPuppeteer: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'ArticleContent',
      tableName: 'ArticleContents',
      timestamps: true,
    }
  );
  return ArticleContent;
}

export default ArticleContent;