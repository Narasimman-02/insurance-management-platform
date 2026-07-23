from marshmallow import Schema, fields, validate


class CustomerSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    dob = fields.Date(required=False, allow_none=True)
    phone = fields.Str(required=False, allow_none=True, validate=validate.Length(max=20))
    address = fields.Str(required=False, allow_none=True, validate=validate.Length(max=255))
    email = fields.Email(required=True)
    created_at = fields.DateTime(dump_only=True)


customer_schema = CustomerSchema()
customer_list_schema = CustomerSchema(many=True)
