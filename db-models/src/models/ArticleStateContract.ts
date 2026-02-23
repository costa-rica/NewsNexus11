import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface ArticleStateContractAttributes {
  id: number;
  articleId: number;
  stateId: number;
}

interface ArticleStateContractCreationAttributes extends Optional<ArticleStateContractAttributes, 'id'> {}

export class ArticleStateContract extends Model<ArticleStateContractAttributes, ArticleStateContractCreationAttributes> implements ArticleStateContractAttributes {
  public id!: number;
  public articleId!: number;
  public stateId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initArticleStateContract() {
  ArticleStateContract.init(
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
      stateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ArticleStateContract',
      tableName: 'ArticleStateContracts',
      timestamps: true,
    }
  );
  return ArticleStateContract;
}

export default ArticleStateContract;