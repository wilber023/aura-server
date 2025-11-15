#!/usr/bin/env node

const { Sequelize } = require('sequelize');

async function runMigration() {
  try {
    console.log('🚀 Ejecutando migración para arreglar user_profiles...');

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

    await db.authenticate();
    console.log('✅ Conexión a base de datos establecida');

    const queryInterface = db.getQueryInterface();

    console.log("🔍 Verificando estructura de tabla...");
    const table = await queryInterface.describeTable('user_profiles');

    // Función para agregar columnas de forma segura
    const addColumnSafe = async (column, options) => {
      if (!table[column]) {
        await queryInterface.addColumn('user_profiles', column, options);
        console.log(`✅ ${column} agregado`);
      } else {
        console.log(`ℹ ${column} ya existe`);
      }
    };

    // display_name
    await addColumnSafe('display_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    // username
    await addColumnSafe('username', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    // avatar_url
    await addColumnSafe('avatar_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // bio - biografía con límite de 500 caracteres
    await addColumnSafe('bio', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: "Biografía del usuario - máximo 500 caracteres"
    });

    // birth_date - fecha de nacimiento
    await addColumnSafe('birth_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: "Fecha de nacimiento en formato YYYY-MM-DD"
    });

    // gender - género con valores específicos
    await addColumnSafe('gender', {
      type: Sequelize.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
      allowNull: true,
      comment: "Género del usuario"
    });

    // followers_count - contador de seguidores
    await addColumnSafe('followers_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Número de seguidores"
    });

    // following_count - contador de seguidos
    await addColumnSafe('following_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Número de usuarios seguidos"
    });

    // posts_count - contador de publicaciones
    await addColumnSafe('posts_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Número de publicaciones"
    });

    // is_verified - cuenta verificada
    await addColumnSafe('is_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Cuenta verificada"
    });

    // is_active - cuenta activa
    await addColumnSafe('is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Cuenta activa"
    });

    await db.close();
    console.log('🎉 ¡Migración completada exitosamente!');

  } catch (e) {
    console.error('❌ Error ejecutando migración:', e);
    process.exit(1);
  }
}

runMigration();
