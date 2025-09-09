// src/services/alertService.js

const Twilio = require('twilio');
const config = require('../config');
const AlertEvent = require('../models/alertEvent');
const Contact = require('../models/contact');
// const User = require('../models/user'); // 👈 Comment out or delete this line

// --- Initialize Twilio Client ---
const twilioClient = new Twilio(config.twilio.accountSid, config.twilio.authToken);

exports.triggerAlert = async (alertData) => {
    try {
        const { userId, geminiAnalysis, location, audioUrl } = alertData;
        console.log('🚨 TRIGGERING ALERT: Saving event and notifying contacts.');

        // --- 1. Save the Alert Event to Database ---
        const alertEvent = new AlertEvent({
            userId,
            geminiAnalysis,
            location,
            audioUrl,
        });
        await alertEvent.save();
        console.log('✅ Alert event saved successfully:', alertEvent._id);

        // --- 2. Find Contacts and Set Placeholder User ---
        
        // --- TEMPORARY WORKAROUND ---
        // We use a placeholder user name because the User model is not implemented yet.
        const alertingUser = { name: 'the user' }; // ❗ Placeholder name
        const contactsToNotify = await Contact.find({ userId, isPrimary: true }).lean();
        // -----------------------------

        if (contactsToNotify.length === 0) {
            console.warn('⚠️ No primary emergency contacts found for user:', userId);
            return alertEvent;
        }

        // --- 3. Craft and Send SMS via Twilio ---
        const googleMapsLink = `http://www.google.com/maps?q=${location.coordinates[1]},${location.coordinates[0]}`;
        const messageBody = `SHEield Emergency Alert for ${alertingUser.name}:
Severity: ${geminiAnalysis.severity.toUpperCase()}
Analysis: ${geminiAnalysis.analysis}
Location: ${googleMapsLink}
Listen to Audio: ${audioUrl}`;

        console.log(`Sending Twilio SMS to ${contactsToNotify.length} contacts.`);

        const messagePromises = contactsToNotify.map(contact => {
            return twilioClient.messages.create({
                body: messageBody,
                from: config.twilio.phoneNumber,
                to: contact.phoneE164,
            }).then(message => console.log(`SMS sent successfully to ${contact.name}: SID ${message.sid}`))
              .catch(err => console.error(`Failed to send SMS to ${contact.name}:`, err.message));
        });

        await Promise.all(messagePromises);
        
        // --- 4. Update Alert with Notified Contacts ---
        const notifiedContactIds = contactsToNotify.map(c => c._id);
        alertEvent.notifiedContacts = notifiedContactIds;
        await alertEvent.save();
        
        return alertEvent;

    } catch (error) {
        console.error('❌ CRITICAL: Error during alert trigger process:', error);
    }
};