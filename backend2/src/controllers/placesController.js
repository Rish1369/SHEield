const axios = require('axios');
const config = require('../config');
const SafePlace = require('../models/safePlace');

/**
 * @desc    Find nearby safe places using Google Places API
 * @route   POST /api/places/nearby
 */
exports.findNearbyPlaces = async (req, res) => {
    const { lat, lng, radius, type } = req.body;
    const apiKey = config.apiKeys.googleMaps;

    if (!lat || !lng || !radius || !type) {
        return res.status(400).json({ message: 'Missing required parameters: lat, lng, radius, type' });
    }
    if (!apiKey) {
        return res.status(500).json({ message: 'Google Maps API key is not configured on the server.' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;

    try {
        console.log(`Fetching nearby places for type: ${type}`);
        const response = await axios.get(url);

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
            throw new Error(response.data.error_message || `Google API Error: ${response.data.status}`);
        }

        res.status(200).json({ places: response.data.results });

    } catch (error) {
        console.error('Error fetching from Google Places API:', error.message);
        res.status(500).json({ message: 'Failed to fetch nearby places.' });
    }
};

/**
 * @desc    Add a safe place to a user's saved list
 * @route   POST /api/places/save
 */
exports.saveSafePlace = async (req, res) => {
    const { userId, place } = req.body; 

    if (!userId || !place) {
        return res.status(400).json({ message: 'User ID and place data are required.' });
    }

    try {
        const newSafePlace = new SafePlace({
            userId: userId,
            placeId: place.place_id,
            name: place.name,
            address: place.vicinity,
            location: {
                type: 'Point',
                coordinates: [place.geometry.location.lng, place.geometry.location.lat]
            },
            types: place.types,
        });

        await newSafePlace.save();
        res.status(201).json({ message: 'Safe place saved successfully.', place: newSafePlace });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'This place is already saved.' });
        }
        console.error('Error saving safe place:', error);
        res.status(500).json({ message: 'Failed to save safe place.' });
    }
};

/**
 * @desc    Get a user's saved safe places
 * @route   GET /api/places/saved/:userId
 */
exports.getSavedSafePlaces = async (req, res) => {
    const { userId } = req.params;

    try {
        const savedPlaces = await SafePlace.find({ userId: userId });
        res.status(200).json({ places: savedPlaces });
    } catch (error) {
        console.error('Error fetching saved places:', error);
        res.status(500).json({ message: 'Failed to fetch saved places.' });
    }
};