const mongoose = require('mongoose');
const { Schema } = mongoose;

const AlertEventSchema = new Schema(
    {
        // --- ✅ CORRECTED LINE ---
        // Changed type to Mixed. This allows the schema to accept both simple strings
        // (like "USER_ID" for testing) and real ObjectIds in the future.
        userId: {
            type: Schema.Types.Mixed,
            required: true,
            index: true,
        },
        // -------------------------
        geminiAnalysis: {
            threatDetected: { type: Boolean, required: true },
            confidence: { type: Number, required: true },
            detectedSounds: [String],
            detectedKeywords: [String],
            analysis: { type: String, required: true },
            recommendedAction: String,
            severity: { type: String, required: true, trim: true },
            analyzedFile: { type: String, required: true },
        },
        audioUrl: {
            type: String,
            required: true,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        status: {
            type: String,
            enum: ['new', 'acknowledged', 'resolved', 'false_alarm'],
            default: 'new',
        },
        notifiedContacts: [{
            type: Schema.Types.ObjectId,
            ref: 'Contact'
        }]
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

AlertEventSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('AlertEvent', AlertEventSchema);

