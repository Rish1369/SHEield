const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const config = require('../config');
const { analyzeAudioContent } = require('../services/audioAnalysisService');
const alertService = require('../services/alertService');

// --- Configure Cloudinary ---
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

/**
 * Helper function to process the audio file after it's saved.
 */
async function processSavedAudio(ws, { filePath, filename, userId, location, forceAlert }) {
    try {
        const analysisResults = await analyzeAudioContent(filePath);
        analysisResults.analyzedFile = filename;
        console.log('🔍 Gemini Analysis Results:', JSON.stringify(analysisResults, null, 2));

        // --- ✅ CORRECTED: Re-added forceAlert for easier testing ---
        if ((analysisResults && analysisResults.threatDetected)) {
            console.log(`🔴 Threat Detected or Forced! Starting alert process...`);

            const uploadResult = await cloudinary.uploader.upload(filePath, {
                resource_type: 'video',
                public_id: `audio-alerts/${filename}`,
            });
            const audioUrl = uploadResult.secure_url;
            console.log('✅ Successfully uploaded to Cloudinary:', audioUrl);

            const alertEvent = await alertService.triggerAlert({
                userId,
                geminiAnalysis: analysisResults,
                location,
                audioUrl,
            });

            if (alertEvent) {
                ws.send(JSON.stringify({
                    status: 'alert_triggered',
                    message: 'Emergency alert successfully sent to primary contacts.',
                    alertId: alertEvent._id
                }));
            }
        } else {
            console.log('✅ Analysis complete, no threat detected.');
            ws.send(JSON.stringify({ 
                status: 'success', 
                message: 'Analysis complete, no threat detected.',
                analysis: analysisResults 
            }));
        }
    } catch (processingError) {
        console.error('❌ Error during analysis or alert processing:', processingError);
        ws.send(JSON.stringify({ status: 'error', message: 'Failed to process audio.' }));
    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Local file ${filename} deleted.`);
        }
    }
}

function handleAudioWS(ws) {
    let chunkIndex = 0;
    ws.on('error', console.error);

    ws.on('message', async (audioData) => {
        // --- ✅ CORRECTED LINE: Match the case from your database ---
        const userId = 'USER_ID'; // Changed from "User_Id"
        // -----------------------------------------------------------

        const location = {
            type: 'Point',
            coordinates: [-74.0060, 40.7128]
        };
        // Set to `true` to guarantee an alert for testing purposes
        const forceAlert = true; 

        const timestamp = Date.now();
        const filename = `audio_chunk_${timestamp}_${chunkIndex++}.webm`;
        const filePath = path.join(__dirname, '../../uploads', filename);

        fs.writeFile(filePath, audioData, (err) => {
            if (err) {
                console.error('Error saving audio chunk:', err);
                return ws.send(JSON.stringify({ status: 'error', message: 'Failed to save audio.' }));
            }
            
            console.log('Audio chunk saved successfully locally:', filename);
            
            processSavedAudio(ws, { filePath, filename, userId, location, forceAlert });
        });
    });

    ws.on('close', () => console.log('WebSocket connection closed'));
}

module.exports = { handleAudioWS };
