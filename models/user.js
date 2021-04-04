const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize('react-test', 'postgres', '132436', {
  host: 'localhost',
  dialect: 'postgres'
});
const Slots = require('./slots');

class User extends Model {}

User.init({
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'compositeIndex'
  },
  password: {
    type: DataTypes.STRING
  }
}, {
  sequelize,
  modelName: 'User',
  timestamps: false
});

User.hasOne(Slots, {
  foreignKey: 'user_id',
  onDelete: 'RESTRICT',
  onUpdate: 'RESTRICT'
});
module.exports = User;
