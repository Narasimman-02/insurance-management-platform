from marshmallow import Schema, fields, validate


class PolicySchema(Schema):
    id = fields.Int(dump_only=True)
    customer_id = fields.Int(required=True)
    policy_type = fields.Str(required=True, validate=validate.OneOf(
        ["life", "health", "vehicle", "home", "travel"]
    ))
    policy_number = fields.Str(dump_only=True)
    premium_amount = fields.Decimal(required=True, as_string=False, places=2,
                                     validate=validate.Range(min=0.01))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    status = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


policy_schema = PolicySchema()
policy_list_schema = PolicySchema(many=True)
