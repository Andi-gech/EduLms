const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMode: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    txtRef: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const Payment = mongoose.model("Payment", PaymentSchema);
module.exports.Payment = Payment;