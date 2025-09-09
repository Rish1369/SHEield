const AlertEvent = require('../models/alertEvent');
const Contact = require('../models/contact');
// const notificationService = require('../services/notificationService'); // You would create this next

/**
 * 🚨 Creates a new alert event when a threat is detected.
 * This is the most critical function. It saves the event and should trigger notifications.
 */
exports.createAlert = async (req, res) => {
    try {
        console.log('Creating new alert event from request body:', req.body);
        const { userId, geminiAnalysis, location } = req.body;

        if (!userId || !geminiAnalysis || !location) {
            return res.status(400).json({ error: 'Missing required fields: userId, geminiAnalysis, or location.' });
        }

        const alertEvent = new AlertEvent({
            userId,
            geminiAnalysis,
            location
        });

        await alertEvent.save();
        console.log('✅ New alert event saved successfully:', alertEvent._id);

        // --- TRIGGER NOTIFICATIONS ---
        // This is where you would notify emergency contacts.
        console.log('Finding emergency contacts for user:', userId);
        const contactsToNotify = await Contact.find({ userId, isPrimary: true });

        if (contactsToNotify.length > 0) {
            console.log(`Found ${contactsToNotify.length} primary contacts to notify.`);
            // TODO: Integrate a real notification service (e.g., Twilio for SMS, SendGrid for email)
            // await notificationService.sendAlerts(contactsToNotify, alertEvent);

            // For now, we'll just log it and update the alert document
            const notifiedContactIds = contactsToNotify.map(c => c._id);
            alertEvent.notifiedContacts = notifiedContactIds;
            await alertEvent.save();
        } else {
            console.warn('⚠️ No primary emergency contacts found for user:', userId);
        }

        res.status(201).json({ message: 'Alert event created successfully', alertEvent });

    } catch (err) {
        console.error('❌ Error creating alert event:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * 📈 Retrieves all alerts for a specific user.
 */
exports.getAlertsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching all alerts for user ID:', userId);

        const alerts = await AlertEvent.find({ userId }).sort({ createdAt: -1 });

        console.log(`Found ${alerts.length} alerts for user.`);
        res.status(200).json({
            message: 'Alerts retrieved successfully',
            count: alerts.length,
            alerts
        });
    } catch (err) {
        console.error('❌ Error fetching alerts by user:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * 📄 Retrieves a single alert event by its ID.
 */
exports.getAlertById = async (req, res) => {
    try {
        const { alertId } = req.params;
        console.log('Fetching alert by ID:', alertId);

        const alert = await AlertEvent.findById(alertId)
            .populate('notifiedContacts', 'name phoneE164 relationship'); // Populates contact details

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found.' });
        }

        res.status(200).json({ message: 'Alert retrieved successfully', alert });
    } catch (err) {
        console.error('❌ Error fetching alert by ID:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * 🔄 Updates the status of an existing alert.
 */
exports.updateAlertStatus = async (req, res) => {
    try {
        const { alertId } = req.params;
        const { status } = req.body;
        console.log(`Updating status for alert ${alertId} to "${status}"`);

        const allowedStatuses = ['new', 'acknowledged', 'resolved', 'false_alarm'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
        }

        const updatedAlert = await AlertEvent.findByIdAndUpdate(
            alertId,
            { status },
            { new: true } // This option returns the modified document
        );

        if (!updatedAlert) {
            return res.status(404).json({ message: 'Alert not found.' });
        }

        console.log('✅ Alert status updated successfully.');
        res.status(200).json({ message: 'Alert status updated', alert: updatedAlert });

    } catch (err) {
        console.error('❌ Error updating alert status:', err);
        res.status(500).json({ error: err.message });
    }
};
