# 📋 Profile Upload Implementation - Social Service

## ✅ IMPLEMENTACIÓN COMPLETADA

### 📂 Archivos Modificados/Creados

#### 1. **Migración de Base de Datos**
- `run-migration.js` - Script para agregar columnas necesarias automáticamente
- Columnas agregadas: `display_name`, `username`, `avatar_url`, `bio`, `birth_date`, `gender`, `followers_count`, `following_count`, `posts_count`, `is_verified`, `is_active`

#### 2. **Middleware de Upload**
- `src/infrastructure/middleware/uploadMiddleware.js` - Actualizado con funcionalidad específica para perfiles
- Funcionalidad: Cloudinary storage, redimensión 500x500px, límite 5MB, formatos JPG/PNG/GIF/WEBP

#### 3. **Middleware de Validación**
- `src/infrastructure/middleware/profileValidationMiddleware.js` - NUEVO
- Validaciones: displayName (requerido), bio (500 chars), birthDate (edad ≥13), gender (4 valores válidos)

#### 4. **Modelo de Base de Datos**
- `src/infrastructure/database/models/UserProfileModel.js` - Actualizado
- Campos ajustados según especificación técnica

#### 5. **Caso de Uso**
- `src/application/use-cases/userProfile/CreateUserProfileUseCase.js` - Actualizado
- Soporte para upload y validaciones específicas

#### 6. **Controlador**
- `src/presentation/controllers/UserProfileController.js` - Actualizado método `createProfile`
- Implementación completa según especificación

#### 7. **Rutas**
- `src/presentation/routes/profileRoutes.js` - NUEVO
- `src/SocialServiceApp.js` - Actualizado para integrar nuevas rutas

#### 8. **Archivo de Prueba**
- `test-profile-upload.html` - Interface web para probar el endpoint

---

## 🚀 CONFIGURACIÓN DE DESPLIEGUE

### 1. **Variables de Entorno Requeridas**
```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=posts_dev_db
DB_USER=posts_user
DB_PASSWORD=posts123

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
```

### 2. **Comando de Instalación y Migración**
```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar migración automática
node run-migration.js

# 3. Iniciar servicio
npm start
```

### 3. **Dependencias Incluidas**
- `multer` - Manejo de multipart/form-data
- `cloudinary` - Almacenamiento y procesamiento de imágenes
- `multer-storage-cloudinary` - Integración Multer + Cloudinary

---

## 📡 ENDPOINT IMPLEMENTADO

### **POST /api/v1/profiles**

#### **Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>
```

#### **Campos del Form:**
```
displayName: string (1-100 chars) [REQUERIDO]
avatar: file (JPG/PNG/GIF/WEBP, max 5MB) [REQUERIDO]
bio: string (max 500 chars) [OPCIONAL]
birthDate: string "YYYY-MM-DD" [OPCIONAL]
gender: string "male|female|other|prefer_not_to_say" [OPCIONAL]
```

#### **Response Exitoso (201):**
```json
{
  "success": true,
  "message": "Perfil creado exitosamente",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "display_name": "Juan Pérez",
    "bio": "Desarrollador...",
    "avatar_url": "https://res.cloudinary.com/...",
    "birth_date": "1990-05-15",
    "gender": "male",
    "followers_count": 0,
    "following_count": 0,
    "posts_count": 0,
    "is_verified": false,
    "is_active": true,
    "created_at": "2025-11-14T11:00:00Z",
    "updated_at": "2025-11-14T11:00:00Z"
  }
}
```

---

## 🧪 TESTING

### **Archivo de Prueba:**
- Abrir `test-profile-upload.html` en el navegador
- Incluye casos de prueba pre-configurados
- Interface visual para probar todas las validaciones

### **Casos de Prueba Implementados:**
- ✅ Perfil mínimo (displayName + avatar)
- ✅ Perfil completo (todos los campos)
- ✅ Validación displayName requerido
- ✅ Validación avatar requerido
- ✅ Validación tamaño archivo (5MB)
- ✅ Validación formato archivo
- ✅ Validación bio (500 chars)
- ✅ Validación birthDate (formato + edad ≥13)
- ✅ Validación gender (4 valores)
- ✅ Validación perfil duplicado
- ✅ Validación autenticación JWT

---

## 🔧 CONFIGURACIÓN CLOUDINARY

### **Configuración Automática:**
- Carpeta: `profiles/avatars`
- Transformación: 500x500px con crop fill
- Optimización: Quality auto, format auto
- Nombre de archivo: `avatar_{user_id}_{timestamp}`

### **Validaciones de Archivo:**
- Formatos: JPG, JPEG, PNG, GIF, WEBP
- Tamaño máximo: 5MB
- Campo requerido: `avatar`
- Un solo archivo por request

---

## 📊 ESTRUCTURA DE BASE DE DATOS

### **Tabla: user_profiles**
```sql
CREATE TABLE user_profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio VARCHAR(500),
  avatar_url VARCHAR(500) NOT NULL,
  birth_date DATE,
  gender ENUM('male','female','other','prefer_not_to_say'),
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  posts_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔐 SEGURIDAD IMPLEMENTADA

- ✅ Validación JWT obligatoria
- ✅ Validación de tipos MIME
- ✅ Límite de tamaño de archivo
- ✅ Sanitización de campos de texto
- ✅ Prevención de campos prohibidos
- ✅ Validación de perfil duplicado
- ✅ Rate limiting general

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### **Diferencias con Especificación:**
- Campo `username` agregado a BD pero no usado en endpoint actual
- Campos `location`, `website`, `cover_url` en modelo pero no en API
- Enfoque en casos de uso esenciales según especificación

### **Middleware Chain:**
1. `authenticateToken` - Extrae user_id del JWT
2. `validateMultipartContentType` - Verifica Content-Type
3. `uploadAvatar` - Procesa archivo con Cloudinary
4. `validateProfileData` - Valida todos los campos
5. `createProfile` - Crea perfil en base de datos

### **Error Handling:**
- Errores específicos por tipo de validación
- Códigos HTTP correctos (400, 401, 409, 413, 415)
- Mensajes descriptivos según especificación
- Logs detallados para debugging

---

## ✅ STATUS: IMPLEMENTACIÓN COMPLETA Y LISTA PARA DESPLIEGUE

La implementación está 100% completada según las especificaciones técnicas proporcionadas. Solo se requiere ejecutar la migración y configurar las variables de entorno de Cloudinary.