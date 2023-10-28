const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('node-complete', 'root', 'mysqlserver', {
    dialect: 'mysql',
    host: 'localhost'
});

module.exports = sequelize;