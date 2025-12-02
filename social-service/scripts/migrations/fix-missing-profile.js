require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { UserProfileModel } = require('../../src/infrastructure/database/models');
const sequelize = require('../../src/infrastructure/config/database');

/**
 * Script para crear perfiles faltantes para usuarios que tienen publicaciones
 * pero no tienen perfil en la tabla user_profiles
 */
async function fixMissingProfile() {
    try {
        console.log('🔍 Conectando a la base de datos...');
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa\n');

        // Usuario que necesita perfil
        const userId = '3f077e86-d4f6-45fd-8228-26019523e3eb';
        const email = 'wh092634@gmail.com';

        console.log(`📋 Verificando perfil para usuario: ${userId}`);

        // Verificar si ya existe
        const existingProfile = await UserProfileModel.findOne({
            where: { user_id: userId }
        });

        if (existingProfile) {
            console.log('⚠️ El usuario ya tiene un perfil:');
            console.log(JSON.stringify({
                id: existingProfile.id,
                user_id: existingProfile.user_id,
                display_name: existingProfile.display_name,
                avatar_url: existingProfile.avatar_url
            }, null, 2));
            return;
        }

        console.log('❌ No se encontró perfil. Creando uno nuevo...\n');

        // Avatar por defecto (imagen de placeholder)
        const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(email.split('@')[0]) + '&background=random&size=200';

        // Crear perfil básico
        const newProfile = await UserProfileModel.create({
            id: uuidv4(),
            user_id: userId,
            display_name: email.split('@')[0], // Usar parte del email como nombre
            bio: 'Usuario de Aura', // Bio por defecto
            avatar_url: defaultAvatar, // Avatar generado con UI Avatars
            cover_url: null,
            location: null,
            website: null,
            birth_date: null,
            gender: null,
            privacy_settings: null,
            preferences: null,
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            is_verified: false,
            is_active: true,
            last_active_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        });

        console.log('✅ Perfil creado exitosamente:');
        console.log(JSON.stringify({
            id: newProfile.id,
            user_id: newProfile.user_id,
            display_name: newProfile.display_name,
            avatar_url: newProfile.avatar_url,
            created_at: newProfile.created_at
        }, null, 2));

        console.log('\n📝 Ahora el usuario puede:');
        console.log('1. Ver sus publicaciones con perfil asociado');
        console.log('2. Actualizar su perfil (nombre, bio, avatar) desde la app');
        console.log('3. Usar todos los endpoints de la API sin errores 404\n');

    } catch (error) {
        console.error('❌ Error al crear perfil:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar script
fixMissingProfile();
