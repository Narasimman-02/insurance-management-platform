from marshmallow import Schema, fields, validate


class RegisterSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=128))
    role = fields.Str(required=False, load_default="customer",
                       validate=validate.OneOf(["admin", "agent", "customer"]))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


register_schema = RegisterSchema()
login_schema = LoginSchema()
