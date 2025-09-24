const mongoose = require("mongoose");

const permissionsSchema = new mongoose.Schema(
    {
        permission: [
            {
                module: { type: String, required: true },
                actions: [{ type: String, enum: ["read", "read_one", "create", "update", "delete"], default: "read" }],
            },
        ],
    },
    { timestamps: true }
);

const Permissions = mongoose.model("Permissions", permissionsSchema);

module.exports = Permissions;
