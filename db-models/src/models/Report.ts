import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface ReportAttributes {
  id: number;
  dateSubmittedToClient: Date | null;
  nameCrFormat: string | null;
  nameZipFile: string | null;
  userId: number;
}

interface ReportCreationAttributes extends Optional<ReportAttributes, 'id' | 'dateSubmittedToClient' | 'nameCrFormat' | 'nameZipFile'> {}

export class Report extends Model<ReportAttributes, ReportCreationAttributes> implements ReportAttributes {
  public id!: number;
  public dateSubmittedToClient!: Date | null;
  public nameCrFormat!: string | null;
  public nameZipFile!: string | null;
  public userId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initReport() {
  Report.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      dateSubmittedToClient: {
        type: DataTypes.DATE,
      },
      nameCrFormat: {
        type: DataTypes.STRING,
      },
      nameZipFile: {
        type: DataTypes.STRING,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Report',
      tableName: 'Reports',
      timestamps: true,
    }
  );
  return Report;
}

export default Report;