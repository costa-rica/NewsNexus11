import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface NewsRssRequestAttributes {
  id: number;
  newsArticleAggregatorSourceId: number;
  countOfArticlesReceivedFromRequest: number | null;
  countOfArticlesSavedToDbFromRequest: number | null;
  dateStartOfRequest: string | null;
  dateEndOfRequest: string | null;
  gotResponse: boolean | null;
}

interface NewsRssRequestCreationAttributes extends Optional<NewsRssRequestAttributes, 'id' | 'countOfArticlesReceivedFromRequest' | 'countOfArticlesSavedToDbFromRequest' | 'dateStartOfRequest' | 'dateEndOfRequest' | 'gotResponse'> {}

export class NewsRssRequest extends Model<NewsRssRequestAttributes, NewsRssRequestCreationAttributes> implements NewsRssRequestAttributes {
  public id!: number;
  public newsArticleAggregatorSourceId!: number;
  public countOfArticlesReceivedFromRequest!: number | null;
  public countOfArticlesSavedToDbFromRequest!: number | null;
  public dateStartOfRequest!: string | null;
  public dateEndOfRequest!: string | null;
  public gotResponse!: boolean | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initNewsRssRequest() {
  NewsRssRequest.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      newsArticleAggregatorSourceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      countOfArticlesReceivedFromRequest: {
        type: DataTypes.INTEGER,
      },
      countOfArticlesSavedToDbFromRequest: {
        type: DataTypes.INTEGER,
      },
      dateStartOfRequest: {
        type: DataTypes.DATEONLY,
      },
      dateEndOfRequest: {
        type: DataTypes.DATEONLY,
      },
      gotResponse: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      sequelize,
      modelName: 'NewsRssRequest',
      tableName: 'NewsRssRequests',
      timestamps: true,
    }
  );
  return NewsRssRequest;
}

export default NewsRssRequest;