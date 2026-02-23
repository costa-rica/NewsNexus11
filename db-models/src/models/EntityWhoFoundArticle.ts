import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface EntityWhoFoundArticleAttributes {
  id: number;
  userId: number | null;
  newsArticleAggregatorSourceId: number | null;
}

interface EntityWhoFoundArticleCreationAttributes extends Optional<EntityWhoFoundArticleAttributes, 'id' | 'userId' | 'newsArticleAggregatorSourceId'> {}

export class EntityWhoFoundArticle extends Model<EntityWhoFoundArticleAttributes, EntityWhoFoundArticleCreationAttributes> implements EntityWhoFoundArticleAttributes {
  public id!: number;
  public userId!: number | null;
  public newsArticleAggregatorSourceId!: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initEntityWhoFoundArticle() {
  EntityWhoFoundArticle.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
      },
      newsArticleAggregatorSourceId: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      modelName: 'EntityWhoFoundArticle',
      tableName: 'EntityWhoFoundArticles',
      timestamps: true,
    }
  );
  return EntityWhoFoundArticle;
}

export default EntityWhoFoundArticle;