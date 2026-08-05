#!/usr/bin/env python3
import os
import sys
import subprocess

config_path = "/etc/odoo/odoo.conf"

lines = ["[options]"]
lines.append(f"admin_passwd = {os.environ.get('ODOO_ADMIN_PASSWORD', 'admin')}")
lines.append(f"db_host = {os.environ.get('DB_HOST', 'localhost')}")
lines.append(f"db_port = {os.environ.get('DB_PORT', '5432')}")
lines.append(f"db_user = {os.environ.get('DB_USER', 'odoo')}")
lines.append(f"db_password = {os.environ.get('DB_PASSWORD', 'odoo')}")
lines.append(f"db_sslmode = {os.environ.get('DB_SSLMODE', 'prefer')}")

db_name = os.environ.get('DB_NAME')
if db_name:
    lines.append(f"db_name = {db_name}")
    lines.append(f"dbfilter = {os.environ.get('DBFILTER', '^' + db_name + '$')}")
else:
    lines.append("# db_name = odoo")
    lines.append("# dbfilter = ^odoo$")

lines.append("addons_path = /mnt/extra-addons,/usr/lib/python3/dist-packages/odoo/addons")
lines.append("http_port = 8069")
lines.append("http_interface = 0.0.0.0")
lines.append("workers = 0")
lines.append("log_level = info")

config = "\n".join(lines) + "\n"

with open(config_path, "w") as f:
    f.write(config)

print(f"Config written to {config_path}")
print("DB_NAME:", db_name or "(not set)")

# If DB_NAME is set, try to initialize the database
if db_name:
    print(f"Attempting to initialize database '{db_name}'...")
    try:
        result = subprocess.run(
            ["odoo", "-c", config_path, "-i", "base", "--stop-after-init", "--no-xmlrpc"],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            print(f"Database '{db_name}' initialized successfully")
        else:
            print(f"Init returned code {result.returncode}")
            if result.stderr:
                print("STDERR:", result.stderr[-500:])
    except subprocess.TimeoutExpired:
        print("Init timed out, continuing anyway...")
    except Exception as e:
        print(f"Init error: {e}, continuing anyway...")

sys.exit(subprocess.call(["odoo", "-c", config_path]))
