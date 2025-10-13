const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, enum: ['ADMIN', 'CUSTOMER', 'SUPER_ADMIN'] },
        permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permissions" }],
    },
    { timestamps: true }
);

module.exports = mongoose.models.Role || mongoose.model("Role", RoleSchema);
