import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './_connection';

interface StateAttributes {
  id: number;
  name: string;
  abbreviation: string;
}

interface StateCreationAttributes extends Optional<StateAttributes, 'id'> {}

export class State extends Model<StateAttributes, StateCreationAttributes> implements StateAttributes {
  public id!: number;
  public name!: string;
  public abbreviation!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initState() {
  State.init(
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
      abbreviation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'State',
      tableName: 'States',
      timestamps: true,
    }
  );
  return State;
}

export default State;