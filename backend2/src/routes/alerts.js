const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Create a new alert event
router.post('/create', alertController.createAlert);

// Get all alerts for a specific user
router.get('/user/:userId', alertController.getAlertsByUser);

// Get a single alert by its ID
router.get('/:alertId', alertController.getAlertById);

// Update an alert's status
router.put('/status/:alertId', alertController.updateAlertStatus);

module.exports = router;