FROM odoo:18

USER root

# Install additional dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-psycopg2 \
    && rm -rf /var/lib/apt/lists/*

# Copy custom module
COPY odoo_addons/odoo_position_integration /mnt/extra-addons/odoo_position_integration

# Copy Odoo config template and entrypoint
COPY odoo/odoo.conf /etc/odoo/odoo.conf.template
COPY entrypoint.py /entrypoint.py

# Set permissions
RUN chown -R odoo:odoo /mnt/extra-addons/odoo_position_integration /var/lib/odoo /entrypoint.py

EXPOSE 8069

# Run entrypoint as root to generate config, then switch to odoo user
CMD ["sh", "-c", "python3 /entrypoint.py"]
