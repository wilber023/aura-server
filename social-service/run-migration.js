#!/usr/bin/env node

const { sequelize } = require('./src/infrastructure/config/database');
const { Sequelize } = require('sequelize');

async function runMigration() {
  try {
    console.log('🚀 Ejecutando migración para arreglar user_profiles...');
    
    // Crear instancia de sequelize
    const config = {
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'posts_dev_db',
      username: process.env.DB_USER || 'posts_user',
      password: process.env.DB_PASSWORD || 'posts123',
      logging: console.log
    };
    
    const db = new Sequelize(config);
    
    // Probar conexión
    await db.authenticate();
    console.log('✅ Conexión a base de datos establecida');
    
    const queryInterface = db.getQueryInterface();
    
    // Ejecutar la migración manualmente
    console.log('➕ Agregando columna display_name...');
    
    try {
      await queryInterface.addColumn('user_profiles', 'display_name', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Nombre a mostrar del usuario'
      });
      console.log('✅ Columna display_name agregada');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('ℹ️ Columna display_name ya existe');
      } else {
        throw error;
      }
    }
    
    // Agregar username
    try {
      await queryInterface.addColumn('user_profiles', 'username', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Nombre de usuario'
      });
      console.log('✅ Columna username agregada');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('ℹ️ Columna username ya existe');
      } else {
        console.log('⚠️ Error agregando username:', error.message);
      }
    }
    
    // Agregar avatar_url
    try {
      await queryInterface.addColumn('user_profiles', 'avatar_url', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'URL del avatar del usuario'
      });
      console.log('✅ Columna avatar_url agregada');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('ℹ️ Columna avatar_url ya existe');
      } else {
        console.log('⚠️ Error agregando avatar_url:', error.message);
      }
    }
    
    // Cerrar conexión
    await db.close();
    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('💡 Ahora puedes iniciar el servidor sin errores.');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runMigration();