const fs = require('fs');
const path = require('path');
const { analyzeAudioContent, analyzeLatestAudio } = require('../services/audioAnalysisService');

function handleAudioWS(ws) {
    let chunkIndex = 0;
    
    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    
    ws.on('message', async (data) => {
        console.log('Received audio chunk:', data.length || data.byteLength);
        const timestamp = Date.now();
        const filename = `audio_chunk_${timestamp}_${chunkIndex++}.webm`;
        const filePath = path.join(__dirname, '../../uploads', filename);

        // Save the audio file
        fs.writeFile(filePath, data, async (err) => {
            if (err) {
                console.error('Error saving audio chunk:', err);
                ws.send(JSON.stringify({ 
                    status: 'error', 
                    message: 'Failed to save audio.' 
                }));
                return;
            }
            
            console.log('Audio chunk saved successfully:', filename);
            
            try {
                // First save the file, then analyze the latest file in the uploads folder
                // This ensures we're always analyzing the most recent audio
                const analysisResults = await analyzeLatestAudio();
                
                // Log the full analysis response from Gemini
                // console.log('🔍 Gemini Analysis Results for latest audio:', JSON.stringify(analysisResults, null, 2));
                // console.log('📁 Latest file analyzed may be different from the just-saved file');
                
                // Send back the results to the client
                ws.send(JSON.stringify({
                    status: 'success',
                    filename,
                    latestFileAnalyzed: analysisResults.analyzedFile || 'unknown',
                    analysis: analysisResults
                }));
                
            } catch (analysisError) {
                console.error('Error during audio analysis:', analysisError);
                ws.send(JSON.stringify({
                    status: 'warning',
                    filename,
                    message: 'Audio saved but analysis failed'
                }));
            }
        });
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
}

module.exports = { handleAudioWS };