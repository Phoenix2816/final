import subprocess
import sys

python_exe = r"C:\Program Files\Odoo 19.0.20260805\python\python.exe"
odoo_bin = r"C:\Program Files\Odoo 19.0.20260805\server\odoo-bin"
config = r"C:\Program Files\Odoo 19.0.20260805\server\odoo.conf"

cmd = [python_exe, odoo_bin, "-c", config, "-i", "base", "--stop-after-init"]

print("Running Odoo initialization...")
print(f"Command: {' '.join(cmd)}")
print()

result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

print("STDOUT:")
print(result.stdout)
print("\nSTDERR:")
print(result.stderr)
print(f"\nReturn code: {result.returncode}")
