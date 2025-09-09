const mongoose = require('mongoose');
const { Schema } = mongoose;

const SafePlaceSchema = new Schema(
    {
        userId: {
            type: Schema.Types.Mixed,
            required: true,
            index: true,
        },
        placeId: { // Google Place ID
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
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
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        types: [String], // e.g., ['hospital', 'health', 'point_of_interest']
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

SafePlaceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SafePlace', SafePlaceSchema);