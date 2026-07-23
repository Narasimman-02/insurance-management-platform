from marshmallow import Schema, fields, validate


class PremiumPaymentSchema(Schema):
    id = fields.Int(dump_only=True)
    policy_id = fields.Int(required=True)
    payment_date = fields.DateTime(dump_only=True)
    amount = fields.Decimal(required=True, as_string=False, places=2,
                             validate=validate.Range(min=0.01))
    payment_status = fields.Str(dump_only=True)


premium_payment_schema = PremiumPaymentSchema()
premium_payment_list_schema = PremiumPaymentSchema(many=True)
