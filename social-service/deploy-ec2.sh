#!/bin/bash

# =====================================================
# SOCIAL SERVICE - EC2 DEPLOYMENT SCRIPT
# =====================================================
# 
# Este script despliega el Social Service en producción (EC2)
# 
# Características:
# - Usa credenciales aisladas (.env.production)
# - Instala y configura PM2 para gestión de procesos
# - Configura auto-restart en reinicios del servidor
# - Maneja logs de producción
# - Verifica salud del servicio
# 
# Uso: bash deploy-ec2.sh
# =====================================================

set -e  # Exit on error

# --- Colors for better output ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Configuration ---
SERVICE_NAME="social-service"
APP_DIR="$(pwd)"
ENV_PROD_FILE=".env.production"
ENV_TEMPLATE_FILE=".env.production.template"
PM2_APP_NAME="social-service-prod"
HEALTH_CHECK_URL="http://localhost:3002/health"
MAX_HEALTH_RETRIES=10

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     SOCIAL SERVICE - EC2 DEPLOYMENT                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# =====================================================
# STEP 1: VERIFY PRODUCTION CREDENTIALS
# =====================================================
echo -e "${YELLOW}📋 Step 1: Verificando credenciales de producción...${NC}"

if [ ! -f "$ENV_PROD_FILE" ]; then
    echo -e "${RED}❌ Error: No se encontró $ENV_PROD_FILE${NC}"
    echo -e "${YELLOW}ℹ️  Creando desde plantilla...${NC}"
    
    if [ -f "$ENV_TEMPLATE_FILE" ]; then
        cp "$ENV_TEMPLATE_FILE" "$ENV_PROD_FILE"
        echo -e "${YELLOW}⚠️  Archivo $ENV_PROD_FILE creado desde plantilla.${NC}"
        echo -e "${YELLOW}⚠️  DEBES editar $ENV_PROD_FILE con tus credenciales reales antes de continuar.${NC}"
        echo ""
        echo -e "${CYAN}Edita el archivo con:${NC}"
        echo -e "${CYAN}  nano $ENV_PROD_FILE${NC}"
        echo ""
        echo -e "${CYAN}Luego ejecuta de nuevo:${NC}"
        echo -e "${CYAN}  bash deploy-ec2.sh${NC}"
        exit 1
    else
        echo -e "${RED}❌ Error: No se encontró la plantilla $ENV_TEMPLATE_FILE${NC}"
        exit 1
    fi
fi

# Verify critical variables
echo -e "${CYAN}   Validando variables críticas...${NC}"
source "$ENV_PROD_FILE"

if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ Error: Faltan variables críticas en $ENV_PROD_FILE${NC}"
    echo -e "${YELLOW}   Asegúrate de configurar: DB_HOST, DB_PASSWORD, JWT_SECRET${NC}"
    exit 1
fi

if [ "$DB_PASSWORD" = "YOUR_SECURE_PASSWORD_HERE" ] || [ "$JWT_SECRET" = "YOUR_PRODUCTION_JWT_SECRET_HERE_MAKE_IT_VERY_LONG_AND_COMPLEX" ]; then
    echo -e "${RED}❌ Error: Debes cambiar los valores por defecto en $ENV_PROD_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Credenciales de producción verificadas${NC}"
echo ""

# =====================================================
# STEP 2: SYSTEM REQUIREMENTS
# =====================================================
echo -e "${YELLOW}🔧 Step 2: Verificando requisitos del sistema...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo -e "${YELLOW}   Instalando Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm $NPM_VERSION${NC}"
echo ""

# =====================================================
# STEP 3: INSTALL PM2
# =====================================================
echo -e "${YELLOW}⚙️  Step 3: Configurando PM2...${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${CYAN}   PM2 no encontrado. Instalando...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 instalado${NC}"
else
    PM2_VERSION=$(pm2 --version)
    echo -e "${GREEN}✅ PM2 $PM2_VERSION ya está instalado${NC}"
fi
echo ""

# =====================================================
# STEP 4: INSTALL DEPENDENCIES
# =====================================================
echo -e "${YELLOW}📦 Step 4: Instalando dependencias...${NC}"

# Install production dependencies only
if npm ci --omit=dev; then
    echo -e "${GREEN}✅ Dependencias de producción instaladas${NC}"
else
    echo -e "${YELLOW}⚠️  npm ci falló, intentando npm install...${NC}"
    npm install --production
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
fi
echo ""

# =====================================================
# STEP 5: DATABASE SETUP
# =====================================================
echo -e "${YELLOW}🗄️  Step 5: Verificando base de datos...${NC}"

# Copy production env temporarily for migrations
cp .env .env.backup 2>/dev/null || true
cp "$ENV_PROD_FILE" .env

echo -e "${CYAN}   Ejecutando migraciones...${NC}"
if npm run migrate:up; then
    echo -e "${GREEN}✅ Migraciones ejecutadas${NC}"
else
    echo -e "${YELLOW}⚠️  Advertencia: Error en migraciones (puede ser normal si ya están aplicadas)${NC}"
fi

# Restore original .env
mv .env.backup .env 2>/dev/null || true
echo ""

# =====================================================
# STEP 6: STOP EXISTING PROCESS
# =====================================================
echo -e "${YELLOW}🛑 Step 6: Deteniendo procesos existentes...${NC}"

if pm2 describe "$PM2_APP_NAME" &> /dev/null; then
    echo -e "${CYAN}   Deteniendo $PM2_APP_NAME...${NC}"
    pm2 delete "$PM2_APP_NAME"
    echo -e "${GREEN}✅ Proceso anterior detenido${NC}"
else
    echo -e "${CYAN}   No hay procesos previos${NC}"
fi
echo ""

# =====================================================
# STEP 7: START APPLICATION
# =====================================================
echo -e "${YELLOW}🚀 Step 7: Iniciando aplicación en producción...${NC}"

# Start with PM2 using production env
pm2 start npm \
    --name "$PM2_APP_NAME" \
    --interpreter bash \
    -- start \
    --env-file "$ENV_PROD_FILE" \
    --time \
    --merge-logs \
    --log-date-format "YYYY-MM-DD HH:mm:ss Z"

echo -e "${GREEN}✅ Aplicación iniciada con PM2${NC}"
echo ""

# =====================================================
# STEP 8: CONFIGURE AUTO-RESTART
# =====================================================
echo -e "${YELLOW}♻️  Step 8: Configurando auto-restart...${NC}"

# Save PM2 process list
pm2 save

# Setup startup script (only if not already configured)
if ! pm2 startup | grep -q "PM2 startup script already configured"; then
    echo -e "${CYAN}   Configurando PM2 para auto-inicio...${NC}"
    STARTUP_CMD=$(pm2 startup | grep "sudo.*pm2 startup" | tail -1)
    if [ -n "$STARTUP_CMD" ]; then
        eval "$STARTUP_CMD"
        pm2 save
        echo -e "${GREEN}✅ Auto-restart configurado${NC}"
    fi
else
    echo -e "${GREEN}✅ Auto-restart ya configurado${NC}"
fi
echo ""

# =====================================================
# STEP 9: HEALTH CHECK
# =====================================================
echo -e "${YELLOW}🏥 Step 9: Verificando salud del servicio...${NC}"

sleep 3  # Give the service time to start

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_HEALTH_RETRIES ]; do
    if curl -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Servicio respondiendo correctamente${NC}"
        HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL")
        echo -e "${CYAN}   $HEALTH_RESPONSE${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_HEALTH_RETRIES ]; then
            echo -e "${YELLOW}   ⏳ Esperando servicio... (intento $RETRY_COUNT/$MAX_HEALTH_RETRIES)${NC}"
            sleep 2
        else
            echo -e "${RED}❌ Advertencia: El servicio no responde en $HEALTH_CHECK_URL${NC}"
            echo -e "${YELLOW}   Verifica los logs con: pm2 logs $PM2_APP_NAME${NC}"
        fi
    fi
done
echo ""

# =====================================================
# DEPLOYMENT SUCCESS
# =====================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ DEPLOYMENT COMPLETADO EXITOSAMENTE         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Show application status
echo -e "${BLUE}📊 Estado de la Aplicación:${NC}"
pm2 status "$PM2_APP_NAME"
echo ""

# Show useful commands
echo -e "${BLUE}📝 Comandos Útiles:${NC}"
echo -e "${CYAN}  Ver logs en tiempo real:${NC}      pm2 logs $PM2_APP_NAME"
echo -e "${CYAN}  Ver status:${NC}                   pm2 status"
echo -e "${CYAN}  Reiniciar servicio:${NC}          pm2 restart $PM2_APP_NAME"
echo -e "${CYAN}  Detener servicio:${NC}            pm2 stop $PM2_APP_NAME"
echo -e "${CYAN}  Ver métricas:${NC}                pm2 monit"
echo ""

# Show service info
echo -e "${BLUE}🌐 Información del Servicio:${NC}"
echo -e "${CYAN}  Service Name:${NC}                $SERVICE_NAME"
echo -e "${CYAN}  PM2 Process Name:${NC}           $PM2_APP_NAME"
echo -e "${CYAN}  Port:${NC}                        ${PORT:-3002}"
echo -e "${CYAN}  Health Check:${NC}               $HEALTH_CHECK_URL"
echo -e "${CYAN}  Environment File:${NC}           $ENV_PROD_FILE"
echo ""

# Security reminder
echo -e "${YELLOW}🔒 Recordatorio de Seguridad:${NC}"
echo -e "${YELLOW}   ⚠️  Asegúrate de configurar Security Groups en AWS${NC}"
echo -e "${YELLOW}   ⚠️  Abre el puerto ${PORT:-3002} en el Security Group${NC}"
echo -e "${YELLOW}   ⚠️  NO subas $ENV_PROD_FILE al repositorio${NC}"
echo ""

echo -e "${GREEN}🎉 ¡Despliegue completado con éxito!${NC}"
