const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "OrderHistory", required: true },
        invoiceNumber: { type: String, required: true, unique: true },
        issueDate: { type: Date, default: Date.now },
        payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
        paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid' },
        paymentGatewayFee: { type: Number, default: 0 },
        url: { type: String },
    },
    { timestamps: true }
)

const Invoice = mongoose.model("Invoice", invoiceSchema);
module.exports = Invoice;
