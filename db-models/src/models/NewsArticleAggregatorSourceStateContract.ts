import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface NewsArticleAggregatorSourceStateContractAttributes {
  id: number;
  stateId: number;
  newsArticleAggregatorSourceId: number;
}

interface NewsArticleAggregatorSourceStateContractCreationAttributes extends Optional<NewsArticleAggregatorSourceStateContractAttributes, 'id'> {}

export class NewsArticleAggregatorSourceStateContract extends Model<NewsArticleAggregatorSourceStateContractAttributes, NewsArticleAggregatorSourceStateContractCreationAttributes> implements NewsArticleAggregatorSourceStateContractAttributes {
  public id!: number;
  public stateId!: number;
  public newsArticleAggregatorSourceId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initNewsArticleAggregatorSourceStateContract() {
  NewsArticleAggregatorSourceStateContract.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      stateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      newsArticleAggregatorSourceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'NewsArticleAggregatorSourceStateContract',
      tableName: 'NewsArticleAggregatorSourceStateContracts',
      timestamps: true,
    }
  );
  return NewsArticleAggregatorSourceStateContract;
}

export default NewsArticleAggregatorSourceStateContract;