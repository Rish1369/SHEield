const mongoose = require('mongoose');
const { Schema } = mongoose;

const ContactSchema = new Schema(
    {
        // --- ✅ CORRECTED LINE ---
        // Changed type to Mixed for consistency with the AlertEvent model.
        // This allows the schema to accept both simple strings (like "USER_ID")
        // and real ObjectIds in the future.
        userId: {
            type: Schema.Types.Mixed,
            required: true,
            index: true,
        },
        // -------------------------
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phoneE164: {
            type: String,
            required: true,
            trim: true,
        },
        relationship: {
            type: String,
            trim: true,
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('Contact', ContactSchema);