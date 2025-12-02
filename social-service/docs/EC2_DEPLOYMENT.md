# 🚀 EC2 Deployment Guide - Social Service

## 📋 Resumen

Este servicio incluye un script de despliegue automatizado para EC2 que:
- ✅ Usa credenciales aisladas (`.env.production`)
- ✅ Instala y configura PM2 automáticamente
- ✅ Configura auto-restart en reinicios del servidor
- ✅ Verifica la salud del servicio después del despliegue
- ✅ Es reutilizable para otros servicios

---

## 🎯 Despliegue en EC2

### 1️⃣ **Primera Vez - Configuración Inicial**

#### En tu máquina local:

```bash
# 1. Clonar el repositorio
git clone <tu-repo>
cd social-service

# 2. Crear archivo de credenciales de producción
cp .env.production.template .env.production

# 3. Editar con tus credenciales reales
nano .env.production
```

**Importante:** Configura al menos estas variables:
```env
# Database (usa AWS RDS para producción)
DB_HOST=tu-rds-endpoint.rds.amazonaws.com
DB_PASSWORD=tu-password-seguro

# JWT
JWT_SECRET=un-secret-muy-largo-y-complejo-para-produccion

# Cloudinary (si usas subida de archivos)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

#### En tu instancia EC2:

```bash
# 1. Conectarse a EC2
ssh -i tu-key.pem ubuntu@tu-ec2-ip

# 2. Clonar el repositorio
git clone <tu-repo>
cd social-service

# 3. Copiar credenciales (desde tu máquina local)
# En tu máquina local:
scp -i tu-key.pem .env.production ubuntu@tu-ec2-ip:~/social-service/

# 4. Ejecutar despliegue
bash deploy-ec2.sh
```

¡Listo! El servicio estará corriendo en producción.

---

### 2️⃣ **Actualizaciones Posteriores**

Para actualizaciones futuras:

```bash
# 1. Conectarse a EC2
ssh -i tu-key.pem ubuntu@tu-ec2-ip

# 2. Ir al directorio del proyecto
cd social-service

# 3. Actualizar código
git pull

# 4. Re-desplegar
bash deploy-ec2.sh
```

El script automáticamente:
- Detendrá la versión anterior
- Instalará nuevas dependencias
- Ejecutará migraciones
- Reiniciará el servicio

---

## 🔧 Configuración de AWS EC2

### Security Group

Configura el Security Group de tu instancia EC2:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Tu IP | Acceso SSH |
| Custom TCP | TCP | 3002 | 0.0.0.0/0 | API Social Service |
| MySQL/Aurora | TCP | 3306 | Security Group de RDS | Base de datos (si usas RDS) |

### Recomendaciones

1. **Base de Datos:** Usa AWS RDS en lugar de MySQL local
   - Mejor rendimiento
   - Backups automáticos
   - Alta disponibilidad

2. **Elastic IP:** Asigna una IP elástica para que no cambie al reiniciar

3. **Load Balancer (opcional):** Para múltiples instancias
   - Application Load Balancer
   - Health checks configurados

4. **CloudWatch:** Configura alarmas para monitoreo
   - CPU usage
   - Memory usage
   - Disk space

---

## 📊 Gestión del Servicio

### Comandos PM2 Útiles

```bash
# Ver estado de todos los servicios
pm2 status

# Ver logs en tiempo real
pm2 logs social-service-prod

# Ver logs específicos (últimas 100 líneas)
pm2 logs social-service-prod --lines 100

# Ver logs de errores solamente
pm2 logs social-service-prod --err

# Reiniciar servicio
pm2 restart social-service-prod

# Detener servicio
pm2 stop social-service-prod

# Ver métricas en tiempo real
pm2 monit

# Ver información detallada
pm2 describe social-service-prod

# Limpiar logs antiguos
pm2 flush
```

### Health Check

```bash
# Verificar que el servicio está corriendo
curl http://localhost:3002/health

# Desde otra máquina (reemplaza con tu IP/dominio)
curl http://tu-ec2-ip:3002/health
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Social Service está funcionando correctamente",
  "timestamp": "2025-12-02T12:00:00Z",
  "environment": "production"
}
```

---

## 🔒 Seguridad y Mejores Prácticas

### ✅ Credenciales

- ✅ **NUNCA** subas `.env.production` al repositorio
- ✅ Usa secretos fuertes y únicos para producción
- ✅ Rota las credenciales periódicamente
- ✅ Usa AWS Secrets Manager para credenciales sensibles (avanzado)

### ✅ Firewall

```bash
# Habilitar UFW (Ubuntu Firewall)
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir puerto de la aplicación
sudo ufw allow 3002/tcp

# Ver reglas
sudo ufw status
```

### ✅ SSL/HTTPS (Recomendado)

Para producción, usa Nginx con SSL:

1. **Instalar Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

2. **Configurar reverse proxy:**
```nginx
# /etc/nginx/sites-available/social-service
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Instalar SSL con Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## 🐛 Troubleshooting

### El servicio no inicia

```bash
# Ver logs de PM2
pm2 logs social-service-prod --err

# Ver logs del sistema
journalctl -u pm2-ubuntu -n 50

# Verificar que el puerto no esté ocupado
sudo lsof -i :3002
```

### Error de conexión a la base de datos

```bash
# Verificar credenciales en .env.production
cat .env.production | grep DB_

# Probar conexión a RDS
mysql -h tu-rds-endpoint.rds.amazonaws.com -u posts_user -p

# Verificar Security Groups de RDS permiten conexión desde EC2
```

### El servicio se detiene después de cerrar SSH

```bash
# Verificar que PM2 startup está configurado
pm2 startup

# Guardar configuración actual
pm2 save

# Verificar que está en la lista de servicios
systemctl list-units | grep pm2
```

### Health check falla

```bash
# Verificar que el servicio está corriendo
pm2 status

# Verificar que el puerto está abierto
sudo netstat -tlnp | grep 3002

# Verificar logs
pm2 logs social-service-prod
```

---

## 🔄 Replicar para Otros Servicios

Este mismo patrón puede usarse para otros servicios. Para cada servicio:

1. **Copiar archivos:**
   - `.env.production.template` → Ajustar variables específicas del servicio
   - `deploy-ec2.sh` → Cambiar `SERVICE_NAME` y `PM2_APP_NAME`

2. **Ajustar configuración:**
   ```bash
   # En deploy-ec2.sh, líneas 23-28
   SERVICE_NAME="nombre-del-servicio"
   PM2_APP_NAME="nombre-del-servicio-prod"
   HEALTH_CHECK_URL="http://localhost:PUERTO/health"
   ```

3. **Mantener aislamiento:**
   - Cada servicio tiene su propio `.env.production`
   - Cada servicio corre como proceso PM2 separado
   - Sin conflictos de puertos o credenciales

---

## 📞 Comandos Rápidos de Referencia

```bash
# Desplegar/actualizar
bash deploy-ec2.sh

# Ver estado
pm2 status

# Ver logs
pm2 logs social-service-prod

# Reiniciar
pm2 restart social-service-prod

# Health check
curl http://localhost:3002/health

# Detener
pm2 stop social-service-prod
```

---

## ✅ Checklist de Despliegue

- [ ] Instancia EC2 creada y configurada
- [ ] Security Groups configurados (puertos 22, 3002)
- [ ] RDS creado y accesible desde EC2 (recomendado)
- [ ] `.env.production` creado con credenciales reales
- [ ] Repositorio clonado en EC2
- [ ] `.env.production` copiado a EC2 (via SCP)
- [ ] `bash deploy-ec2.sh` ejecutado exitosamente
- [ ] Health check responde correctamente
- [ ] PM2 auto-restart configurado
- [ ] (Opcional) Nginx configurado con SSL
- [ ] (Opcional) CloudWatch alarmas configuradas
- [ ] Logs funcionando correctamente

---

**¡Listo para producción!** 🚀
