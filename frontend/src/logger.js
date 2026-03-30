import axios from 'axios';

// Create a separate instance or use fetch to avoid circular dependency chains if api.js uses this
const LOG_ENDPOINT = `${window.location.origin}/api/v1/logs`;



const sendLog = async (level, message, context = {}) => {
    // Always log to console
    if (level === 'ERROR') {
        console.error(message, context);
    } else if (level === 'WARN') {
        console.warn(message, context);
    } else {
        console.log(message, context);
    }

    try {
        await axios.post(LOG_ENDPOINT, {
            level,
            message,
            context
        });
    } catch (err) {
        // Prevent infinite loops if logging fails
        console.error('Failed to send log to backend:', err);
    }
};

const logger = {
    info: (message, context) => sendLog('INFO', message, context),
    warn: (message, context) => sendLog('WARN', message, context),
    error: (message, context) => sendLog('ERROR', message, context),
};

export default logger;
