from odoo import models, fields


class Position(models.Model):
    _name = "odoo.position"
    _description = "Imported Position"
    _order = "id desc"

    name = fields.Char(string="Title", required=True)
    company = fields.Char(string="Company")
    level = fields.Char(string="Level")
    short_description = fields.Text(string="Short Description")
    visibility = fields.Char(string="Visibility")
    source_position_id = fields.Integer(string="Source Position ID")
    api_token = fields.Char(string="API Token", required=True)
    candidate_count = fields.Integer(string="Candidate Count", default=0)
    cv_count = fields.Integer(string="CV Count", default=0)
    total_likes = fields.Integer(string="Total Likes", default=0)
    generated_at = fields.Datetime(string="Generated At")

    attribute_ids = fields.One2many("odoo.position.attribute", "position_id", string="Attributes")

    def action_reimport(self):
        return {
            "type": "ir.actions.act_window",
            "name": "Import from API",
            "view_mode": "form",
            "res_model": "odoo.position.import.wizard",
            "target": "new",
            "context": {"default_api_token": self.api_token},
        }

    def action_open_attributes(self):
        return {
            "type": "ir.actions.act_window",
            "name": "Attributes",
            "view_mode": "list,form",
            "res_model": "odoo.position.attribute",
            "views": [(False, "list"), (False, "form")],
            "domain": [("position_id", "=", self.id)],
            "context": {"search_default_position_id": self.id},
        }
