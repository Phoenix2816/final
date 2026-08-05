@echo off
echo Starting Odoo database initialization...
cd /d "C:\Program Files\Odoo 19.0.20260805\server"
"C:\Program Files\Odoo 19.0.20260805\python\python.exe" odoo-bin -c "C:\Program Files\Odoo 19.0.20260805\server\odoo.conf" -i base --stop-after-init > "C:\Users\Admin\Desktop\Itransition\4 — копия\testing\odoo_init.log" 2>&1
echo.
echo Initialization finished. Check odoo_init.log for details.
pause
