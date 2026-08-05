FROM odoo:18

USER root

# Install additional dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-psycopg2 \
    && rm -rf /var/lib/apt/lists/*

# Copy custom module
COPY odoo_addons/odoo_position_integration /mnt/extra-addons/odoo_position_integration

# Copy Odoo config and entrypoint
COPY odoo/odoo.conf /etc/odoo/odoo.conf
COPY entrypoint.py /entrypoint.py

# Set permissions
RUN chown -R odoo:odoo /mnt/extra-addons/odoo_position_integration /var/lib/odoo /entrypoint.py

USER odoo

EXPOSE 8069

CMD ["python3", "/entrypoint.py"]
