import { RtpCodecCapability } from 'mediasoup/node/lib/RtpParameters';
import { WorkerLogTag } from 'mediasoup/node/lib/Worker';
import { TransportListenInfo } from 'mediasoup/node/lib/types';
import os from 'os'; // basically to check how many cpu we have free


// mediasoup configurations
export const config = {
    listenIp: "0.0.0.0",
    listenPort: 3000,

    mediasoup: {
        numWorkers: Object.keys(os.cpus()).length, // checking how many cores is running on the host device
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: 'debug',
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
            ] as WorkerLogTag[]
        },

        router: {
            /**
             * The media codecs configuration array.
             * Each object in this array provides configuration for a specific audio or video codec.
             */
            mediaCodecs: [
                {
                    /** Indicates this is an audio codec configuration */
                    kind: "audio",
                    /**
                     * Specifies the MIME type for the Opus codec, known for good audio quality at various bit rates.
                     * Format: <type>/<subtype>, e.g., audio/opus
                     */
                    mimeType: 'audio/opus',
                    /**
                    * Specifies the number of audio samples processed per second (48,000 samples per second for high-quality audio).
                    * Higher values generally allow better audio quality.
                    */
                    clockRate: 48000,
                    /** Specifies the number of audio channels (2 for stereo audio). */
                    channels: 2,
                    /**
                     * Optional: Specifies a preferred payload type number for the codec.
                     * Helps ensure consistency in payload type numbering across different sessions or applications.
                     */
                    preferredPayloadType: 96, // Example value
                    /**
                    * Optional: Specifies a list of RTCP feedback mechanisms supported by the codec.
                    * Helps optimize codec behavior in response to network conditions.
                    */
                    rtcpFeedback: [
                        // Example values
                        { type: "nack" },
                        { type: "nack", parameter: "pli" },
                    ],
                },
                {
                    /** Indicates this is a video codec configuration */
                    kind: 'video',
                    /** Specifies the MIME type for the VP8 codec, commonly used for video compression. */
                    mimeType: 'video/VP8',
                    /** Specifies the clock rate, or the number of timing ticks per second (commonly 90,000 for video). */
                    clockRate: 90000,
                    /**
                     * Optional: Specifies codec-specific parameters.
                     * In this case, sets the starting bitrate for the codec.
                     */
                    parameter: {
                        'x-google-start-bitrate': 1000
                    },
                    /**
                    * Optional: Specifies a preferred payload type number for the codec.
                    * Helps ensure consistency in payload type numbering across different sessions or applications.
                    */
                    preferredPayloadType: 97, // Example value
                    /**
                    * Optional: Specifies a list of RTCP feedback mechanisms supported by the codec.
                    * Helps optimize codec behavior in response to network conditions.
                    */
                    rtcpFeedback: [
                        // Example values
                        { type: "nack" },
                        { type: "ccm", parameter: "fir" },
                        { type: "goog-remb" },
                    ],
                },
            ] as RtpCodecCapability[],
        },
        // webRTCTransport settings
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: '127.0.0.1'
                },
            ] as TransportListenInfo[],
            maxIncomeBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000,
        },
    }
} as const;
