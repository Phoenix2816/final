{
    "name": "Position Integration",
    "version": "18.0.1.0.0",
    "category": "Custom",
    "summary": "Read-only viewer for position aggregated results from external API",
    "description": """
Position Integration
====================
Read-only Odoo viewer for position data and aggregated results imported from the external
recruitment API. Access to the data is controlled via per-position API tokens.
""",
    "author": "Itransition",
    "license": "LGPL-3",
    "depends": ["base"],
    "data": [
        "security/ir.model.access.csv",
        "views/position_views.xml",
        "views/attribute_views.xml",
        "views/aggregated_result_views.xml",
        "views/import_wizard_views.xml",
        "views/menu_views.xml",
    ],
    "installable": True,
    "application": True,
    "auto_install": False,
    "assets": {
        "web.assets_backend": [],
    },
}
