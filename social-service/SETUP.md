# 🚀 Social Service - Setup Guide

## Quick Start

### 1. Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** v16 or higher
- **npm** v8 or higher
- **MySQL** or **MariaDB** server

### 2. Setup

Simply run the setup script from the `social-service` directory:

```bash
bash setup.sh
```

This automated script will:
- ✅ Verify Node.js and npm installation
- ✅ Check MySQL/MariaDB status and start if needed
- ✅ Create database (`posts_dev_db`) and user (`posts_user`)
- ✅ Install all npm dependencies
- ✅ Run database migrations
- ✅ Add missing table columns

### 3. Start Development Server

Once setup is complete, start the server:

```bash
npm run dev
```

The service will be available at:
- **Main API**: `http://localhost:3002/api/v1`
- **Health Check**: `http://localhost:3002/health`

---

## Configuration

The service is configured through the `.env` file in the root directory.

### Database Configuration
```env
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=posts_dev_db
DB_USER=posts_user
DB_PASSWORD=posts123
```

### Cloudinary Configuration (for file uploads)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### JWT Configuration
```env
JWT_SECRET=your-secret-key-here
```

### Server Configuration
```env
NODE_ENV=development
PORT=3002
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with nodemon (auto-reload) |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run migrate:up` | Run database migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run migrate:status` | Check migration status |

---

## Project Structure

```
social-service/
├── setup.sh               ← Run this first!
├── .env                   ← Configure here
├── package.json
├── README.md
├── docs/                  ← Documentation
├── scripts/               ← Utility scripts
│   └── migrations/        ← Database migration scripts
├── src/                   ← Source code (DDD structure)
│   ├── app.js            ← Entry point
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
├── tests/
│   └── manual/           ← Manual test files
└── uploads/              ← File uploads directory
```

---

## Troubleshooting

### MySQL Connection Issues

If you get database connection errors:

1. **Check if MySQL is running:**
   ```bash
   sudo systemctl status mysql
   # or
   sudo systemctl status mariadb
   ```

2. **Start MySQL if stopped:**
   ```bash
   sudo systemctl start mysql
   # or
   sudo systemctl start mariadb
   ```

3. **Verify credentials in `.env` match your MySQL setup**

4. **Manually create database and user:**
   ```bash
   sudo mysql -u root
   ```
   ```sql
   CREATE DATABASE IF NOT EXISTS posts_dev_db;
   CREATE USER IF NOT EXISTS 'posts_user'@'localhost' IDENTIFIED BY 'posts123';
   GRANT ALL PRIVILEGES ON posts_dev_db.* TO 'posts_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Migration Issues

If migrations fail:

1. **Check migration status:**
   ```bash
   npm run migrate:status
   ```

2. **Run migrations manually:**
   ```bash
   npm run migrate:up
   ```

3. **Add missing columns (if needed):**
   ```bash
   node scripts/migrations/add-missing-columns.js
   ```

### Port Already in Use

If port 3002 is already in use:

1. **Change port in `.env`:**
   ```env
   PORT=3003
   ```

2. **Or kill process using port 3002:**
   ```bash
   # Find process
   lsof -i :3002
   # Kill process
   kill -9 <PID>
   ```

---

## Documentation

For more detailed information, check out:

- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference
- **[DDD Structure](docs/ESTRUCTURA_DDD.md)** - Architecture explanation
- **[Profile Upload Guide](docs/PROFILE_UPLOAD_IMPLEMENTATION.md)** - File upload implementation

---

## Support

If you encounter any issues not covered here:

1. Check the error logs in the console
2. Review the `.env` configuration
3. Ensure all prerequisites are properly installed
4. Check MySQL/MariaDB is running and accessible

For additional help, consult the documentation files in the `docs/` directory.
