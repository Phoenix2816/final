# Odoo Deployment Guide (Non-Docker)

## IMPORTANT: MySQL Compatibility Note

**Odoo requires PostgreSQL.** It does NOT support MySQL.

- The course project backend uses MySQL (Aiven cloud, via `server/.env`)
- Odoo uses its **own PostgreSQL database** for internal storage
- Odoo communicates with the course project via HTTP API calls only
- No database integration between Odoo and MySQL is needed

## Prerequisites

### Windows
1. **PostgreSQL 16** — Download from https://www.postgresql.org/download/windows/
   - Install with password `odoo`
   - Set port to 5432
   - Create database: `createdb -U postgres odoo`
   - Create user: `createuser -U postgres --superuser odoo`

2. **Python 3.12** (64-bit)
   - Download from https://www.python.org/downloads/windows/
   - Add to PATH during installation

3. **wkhtmltopdf** (for PDF reports)
   - Download from https://github.com/wkhtmltopdf/wkhtmltopdf/releases
   - Install `wkhtmltox-0.12.x.x_msvc.exe` 
   - Add to PATH

4. **Git** (for cloning Odoo source)

5. **Build tools** (MSVC, if not already present)

## Installation Steps

### 1. Install PostgreSQL
```bash
# After installing PostgreSQL, create the Odoo database and user
psql -U postgres -c "CREATE DATABASE odoo;"
psql -U postgres -c "CREATE USER odoo WITH PASSWORD 'odoo';"
psql -U postgres -c "ALTER USER odoo CREATEDB;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE odoo TO odoo;"
```

### 2. Install Python Dependencies
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Install Odoo from Source
```bash
git clone -b 18.0 https://github.com/odoo/odoo.git
cd odoo
# Or download the latest stable release zip
```

### 4. Configure Odoo
Create `odoo.conf`:
```ini
[options]
addons_path = /path/to/odoo/addons,/path/to/testing/odoo_addons
data_dir = /var/lib/odoo
admin_passwd = admin
db_host = localhost
db_port = 5432
db_user = odoo
db_password = odoo
db_name = odoo
without_demo = all
log_level = info
```

### 5. Run Odoo
```bash
# Install the module on first run
python odoo-bin -c odoo.conf -i base,odoo_position_integration

# Or just start the server
python odoo-bin -c odoo.conf
```

### 6. Access Odoo
- URL: http://localhost:8069
- Default login: admin / admin

## Quick Start with Docker (Alternative)

Since Odoo setup without Docker is complex, the easiest approach:

```bash
docker-compose up -d
# Wait 30-60 seconds for first boot
# Access at http://localhost:8069
```

The docker-compose.yml already includes:
- PostgreSQL 16 container (for Odoo's database)
- Odoo 18 container with the module pre-installing
- `host.docker.internal:host-gateway` for API access to localhost:5000

## Environment Variables for Odoo Container

The Odoo container configuration uses:
- `DB_HOST=db` — PostgreSQL container hostname
- `DB_USER=odoo`
- `DB_PASSWORD=odoo`
- `DB_NAME=odoo`

These are independent of your course project's MySQL configuration.

## Integration Flow

1. Course project backend (MySQL) serves data via HTTP API at `localhost:5000`
2. Odoo (PostgreSQL) stores its own copy of imported data
3. Odoo's import wizard calls `http://host.docker.internal:5000/api/external/aggregations` with Bearer token
4. Course project validates token and returns aggregation JSON
5. Odoo stores the data in its own PostgreSQL tables
