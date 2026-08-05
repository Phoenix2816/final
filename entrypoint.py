#!/usr/bin/env python3
import os
import sys
import subprocess

config_path = "/etc/odoo/odoo.conf"

config = f"""[options]
admin_passwd = {os.environ.get('ODOO_ADMIN_PASSWORD', 'admin')}

db_host = {os.environ.get('DB_HOST', 'localhost')}
db_port = {os.environ.get('DB_PORT', '5432')}
db_user = {os.environ.get('DB_USER', 'odoo')}
db_password = {os.environ.get('DB_PASSWORD', 'odoo')}
db_name = {os.environ.get('DB_NAME', 'odoo')}
db_sslmode = {os.environ.get('DB_SSLMODE', 'prefer')}

addons_path = /mnt/extra-addons/odoo_position_integration,/usr/lib/python3/dist-packages/odoo/addons

http_port = 8069
http_interface = 0.0.0.0
workers = 0
log_level = info
"""

with open(config_path, "w") as f:
    f.write(config)

print(f"Config written to {config_path}")

# Start Odoo
sys.exit(subprocess.call(["odoo", "-c", config_path]))
