import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface ArtificialIntelligenceAttributes {
  id: number;
  name: string;
  description: string | null;
  huggingFaceModelName: string | null;
  huggingFaceModelType: string | null;
}

interface ArtificialIntelligenceCreationAttributes extends Optional<ArtificialIntelligenceAttributes, 'id' | 'description' | 'huggingFaceModelName' | 'huggingFaceModelType'> {}

export class ArtificialIntelligence extends Model<ArtificialIntelligenceAttributes, ArtificialIntelligenceCreationAttributes> implements ArtificialIntelligenceAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public huggingFaceModelName!: string | null;
  public huggingFaceModelType!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initArtificialIntelligence() {
  ArtificialIntelligence.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
      },
      huggingFaceModelName: {
        type: DataTypes.STRING,
      },
      huggingFaceModelType: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'ArtificialIntelligence',
      tableName: 'ArtificialIntelligences',
      timestamps: true,
    }
  );
  return ArtificialIntelligence;
}

export default ArtificialIntelligence;