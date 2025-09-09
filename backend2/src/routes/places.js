const express = require('express');
const router = express.Router();
const { findNearbyPlaces, saveSafePlace, getSavedSafePlaces } = require('../controllers/placesController');

// Find nearby safe places
router.post('/nearby', findNearbyPlaces);

// Save a new safe place
router.post('/save', saveSafePlace);

// Get all saved safe places for a user
router.get('/saved/:userId', getSavedSafePlaces);

module.exports = router;