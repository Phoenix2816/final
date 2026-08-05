@echo off
echo Starting Odoo initialization...
cd /d "C:\Program Files\Odoo 19.0.20260805\server"
"C:\Program Files\Odoo 19.0.20260805\python\python.exe" odoo-bin -c "C:\Program Files\Odoo 19.0.20260805\server\odoo.conf" -i base --stop-after-init
echo.
echo Done.
pause
