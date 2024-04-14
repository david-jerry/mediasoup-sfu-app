import { Router } from "mediasoup/node/lib/types";
import { config } from "./config";


const createWebRtcTransport = async (mediasoupRouter: Router) => {
    const {
        maxIncomeBitrate,
        initialAvailableOutgoingBitrate,
    } = config.mediasoup.webRtcTransport;

    try {
        const transport = await mediasoupRouter.createWebRtcTransport({
            listenIps: config.mediasoup.webRtcTransport.listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate,
        });

        console.log("Transport Created: ", transport.id)

        if (maxIncomeBitrate) {
            try {
                await transport.setMaxIncomingBitrate(maxIncomeBitrate);
            } catch (error) {
                console.error(error);
            }
        }

        return {
            transport,
            params: {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            },
        };
    } catch (e) {
        console.error(e)
        return {
            transport: null,
            params: {
                e
            }
        }
    }
}


export { createWebRtcTransport };