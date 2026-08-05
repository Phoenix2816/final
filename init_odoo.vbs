Set objShell = CreateObject("WScript.Shell")
objShell.Run """C:\Program Files\Odoo 19.0.20260805\python\python.exe"" ""C:\Program Files\Odoo 19.0.20260805\server\odoo-bin"" -c ""C:\Program Files\Odoo 19.0.20260805\server\odoo.conf"" -i base --stop-after-init", 1, True
