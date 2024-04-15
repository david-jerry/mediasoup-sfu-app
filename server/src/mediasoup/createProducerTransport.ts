import { Socket } from "socket.io";
import { send } from "../lib/utils";
import { createWebRtcTransport } from "./rtcTransports";
import { types as mediasoupTypes } from "mediasoup";

/**
* Event handler for creating a producer transport.
* A transport is required for sending or producing media.
* This event is called when a peer requests to create a transport.
*/
const onCreateProducerTransport = async (event: string, ws: Socket, mediasoupRouter: mediasoupTypes.Router) => {
    try {
        const {
            transport, params,
        } = await createWebRtcTransport(mediasoupRouter);
        send(ws, "producerTransportCreated", params)

        return transport
    } catch (error) {
        console.error(error)
        send(ws, "producerTransportError", error)
        return null
    }
};

export { onCreateProducerTransport }