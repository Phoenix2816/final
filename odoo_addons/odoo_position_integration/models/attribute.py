from odoo import models, fields


class Attribute(models.Model):
    _name = "odoo.position.attribute"
    _description = "Imported Position Attribute"

    position_id = fields.Many2one("odoo.position", string="Position", required=True, ondelete="cascade")
    external_attribute_id = fields.Integer(string="External Attribute ID")
    title = fields.Char(string="Title", required=True)
    type = fields.Char(string="Type")
    category = fields.Char(string="Category")
    value_count = fields.Integer(string="Value Count", default=0)
    value_total = fields.Integer(string="Value Total", default=0)
    aggregation = fields.Text(string="Aggregation", default="[]")

    result_ids = fields.One2many("odoo.position.aggregated.result", "attribute_id", string="Results")
