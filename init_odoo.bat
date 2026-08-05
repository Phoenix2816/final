@echo off
echo Initializing Odoo database...
"C:\Program Files\Odoo 19.0.20260805\python\python.exe" "C:\Program Files\Odoo 19.0.20260805\server\odoo-bin" -c "C:\Program Files\Odoo 19.0.20260805\server\odoo.conf" -i base --stop-after-init
echo.
echo Initialization complete. Starting Odoo service...
net start odoo-server-19.0
echo.
echo Odoo started. Access at http://localhost:8069
pause
