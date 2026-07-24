from marshmallow import Schema, fields, validate


class ClaimSchema(Schema):
    id = fields.Int(dump_only=True)
    policy_id = fields.Int(required=True)
    claim_amount = fields.Decimal(required=True, as_string=False, places=2,
                                   validate=validate.Range(min=0.01))
    reason = fields.Str(required=True, validate=validate.Length(min=1, max=2000))
    status = fields.Str(dump_only=True)
    submission_date = fields.DateTime(dump_only=True)


claim_schema = ClaimSchema()
claim_list_schema = ClaimSchema(many=True)
