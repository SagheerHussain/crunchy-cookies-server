const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
    {
        name: { type: String, required: true , enum: ['ADMIN', 'CUSTOMER', 'SUPER_ADMIN']},
        permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permissions" }],
    },
    { timestamps: true }
);

const Role = mongoose.model("Role", RoleSchema);

module.exports = Role;