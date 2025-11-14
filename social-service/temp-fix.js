#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixFriendshipController() {
  const filePath = 'src/presentation/controllers/FriendshipController.js';
  
  try {
    console.log('🔧 Arreglando FriendshipController temporalmente...');
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Reemplazar todas las consultas problemáticas de include
    const problematicIncludes = [
      /include:\s*\[\s*{\s*model:\s*UserProfileModel,[\s\S]*?}\s*\]/g
    ];
    
    problematicIncludes.forEach(pattern => {
      content = content.replace(pattern, '// include comentado temporalmente hasta agregar columnas faltantes');
    });
    
    // También reemplazar attributes problemáticos individualmente
    content = content.replace(
      /attributes:\s*\['user_id',\s*'display_name'[^\]]*\]/g, 
      "attributes: ['user_id', 'id']"
    );
    
    fs.writeFileSync(filePath, content);
    console.log('✅ FriendshipController corregido temporalmente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixFriendshipController();