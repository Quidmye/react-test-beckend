const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize('react-test', 'postgres', '132436', {
  host: 'localhost',
  dialect: 'postgres'
});
const User = require('./user');

class Slots extends Model {}

Slots.init({
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'compositeIndex'
  },
  value: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  modelName: 'Slots',
  timestamps: false
});

module.exports = Slots;
