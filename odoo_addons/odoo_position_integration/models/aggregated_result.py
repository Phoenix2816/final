from odoo import models, fields


class AggregatedResult(models.Model):
    _name = "odoo.position.aggregated.result"
    _description = "Aggregated Result"

    attribute_id = fields.Many2one("odoo.position.attribute", string="Attribute", required=True, ondelete="cascade")
    position_id = fields.Many2one("odoo.position", string="Position", related="attribute_id.position_id", store=True)
    metric = fields.Char(string="Metric", required=True)
    value = fields.Text(string="Value")
    count = fields.Integer(string="Count", default=0)
