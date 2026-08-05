import json
import logging
import urllib.request
import urllib.error
import ssl

from odoo import models, fields
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


def _fetch_external_aggregations(api_url, api_token, timeout=30):
    if not api_url:
        raise ValueError("API URL is required")
    if not api_token:
        raise ValueError("API token is required")

    req = urllib.request.Request(api_url)
    req.add_header("Authorization", "Bearer %s" % api_token)
    req.add_header("Accept", "application/json")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        raise ValueError("External API error %s: %s" % (e.code, body[:300]))
    except urllib.error.URLError as e:
        raise ValueError("Cannot reach external API (%s): %s" % (api_url, e.reason))

    try:
        return json.loads(body)
    except ValueError:
        raise ValueError("External API did not return valid JSON: %s" % body[:300])


class OdooPositionImportWizard(models.TransientModel):
    _name = "odoo.position.import.wizard"
    _description = "Import aggregated results from external API"

    api_url = fields.Char(
        string="API URL",
        required=True,
        default="https://final-dhkq.onrender.com/api/external/aggregations",
        help="URL of the external aggregated-results endpoint.",
    )
    api_token = fields.Char(
        string="API Token",
        required=True,
        help="Per-position API token generated on the external position form.",
    )

    @staticmethod
    def _to_text(value):
        if value is None:
            return ""
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False)
        if isinstance(value, bool):
            return "true" if value else "false"
        return str(value)

    @staticmethod
    def _to_odoo_datetime(value):
        if not value:
            return False
        if isinstance(value, str):
            try:
                return fields.Datetime.to_string(fields.Datetime.from_string(value))
            except ValueError:
                import datetime
                try:
                    dt = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
                    return fields.Datetime.to_string(dt)
                except (ValueError, TypeError):
                    return False
        return False

    def _decode_aggregation(self, aggregation):
        rows = []
        if not isinstance(aggregation, dict):
            return rows

        popular = aggregation.get("popular") or []
        for item in popular:
            if isinstance(item, dict):
                rows.append(("popular", self._to_text(item.get("value")), item.get("count", 0)))
            else:
                rows.append(("popular", self._to_text(item), 1))

        scalar_keys = [
            "avg", "min", "max", "median",
            "trueCount", "falseCount", "truePct", "falsePct",
            "true_count", "false_count", "true_pct", "false_pct",
            "earliest", "latest", "earliestFrom", "latestTo",
        ]
        for key in scalar_keys:
            if key in aggregation and aggregation[key] is not None:
                rows.append((key, self._to_text(aggregation[key]), 0))
        return rows

    def _import_payload(self, payload):
        self.ensure_one()
        Position = self.env["odoo.position"].sudo().with_context(active_test=False)

        pos_data = payload.get("position") or {}
        source_id = pos_data.get("id")
        stats = payload.get("stats") or {}

        existing = None
        if source_id:
            existing = Position.search(
                [("source_position_id", "=", source_id), ("api_token", "=", self.api_token)],
                order="id desc",
                limit=1,
            )

        vals = {
            "name": pos_data.get("title") or pos_data.get("name") or "Imported Position",
            "company": pos_data.get("company", ""),
            "level": pos_data.get("level", ""),
            "short_description": pos_data.get("shortDescription", ""),
            "visibility": pos_data.get("visibility", ""),
            "required_technologies": ", ".join(pos_data.get("requiredTechnologies") or pos_data.get("projectTags") or []),
            "source_position_id": source_id,
            "api_token": self.api_token,
            "candidate_count": stats.get("candidateCount", 0),
            "cv_count": stats.get("cvCount", 0),
            "total_likes": stats.get("totalLikes", 0),
            "generated_at": self._to_odoo_datetime(payload.get("generatedAt")),
        }

        if existing:
            existing.write(vals)
            position = existing
            position.attribute_ids.unlink()
        else:
            position = Position.create(vals)

        Attribute = self.env["odoo.position.attribute"].sudo().with_context(active_test=False)
        Result = self.env["odoo.position.aggregated.result"].sudo().with_context(active_test=False)

        for attr_data in payload.get("attributes") or []:
            aggregation = attr_data.get("aggregation") or {}
            attr_vals = {
                "position_id": position.id,
                "external_attribute_id": attr_data.get("attributeId"),
                "title": attr_data.get("title") or attr_data.get("name") or "",
                "type": attr_data.get("type", ""),
                "category": attr_data.get("category", ""),
                "value_count": aggregation.get("count", 0),
                "value_total": aggregation.get("total", 0),
                "aggregation": json.dumps(aggregation, ensure_ascii=False),
            }
            attribute = Attribute.create(attr_vals)

            for metric, value, count in self._decode_aggregation(aggregation):
                Result.create({
                    "attribute_id": attribute.id,
                    "metric": metric,
                    "value": value,
                    "count": count or 0,
                })

        return position

    def action_import(self):
        self.ensure_one()
        try:
            payload = _fetch_external_aggregations(self.api_url, self.api_token)
        except ValueError as e:
            raise UserError(str(e))
        except Exception as e:
            _logger.exception("API import failed")
            raise UserError("Import failed: %s" % str(e))

        position = self._import_payload(payload)

        self.env["bus.bus"]._sendone(
            self.env.user, "odoo_position_import", {"position_id": position.id}
        )

        return {
            "type": "ir.actions.act_window",
            "name": "Imported Position",
            "view_mode": "form",
            "res_model": "odoo.position",
            "res_id": position.id,
            "views": [(False, "form")],
            "context": {"form_view_ref": "odoo_position_integration.view_position_form"},
        }

    def action_open_list(self):
        return {
            "type": "ir.actions.act_window",
            "name": "Imported Positions",
            "view_mode": "list,form",
            "res_model": "odoo.position",
            "views": [(False, "list"), (False, "form")],
        }
