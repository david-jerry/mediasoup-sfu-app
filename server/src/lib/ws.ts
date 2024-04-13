import WebSocket from "ws";
import { types as mediasoupTypes } from "mediasoup";
import { createWorker } from "../mediasoup/workers";
import cors from 'cors';
import { createWebRtcTransport } from "../mediasoup/rtcTransports";

let mediasoupRouter: mediasoupTypes.Router;
let producerTransport: mediasoupTypes.Transport;

const WebSocketConnection = async (websock: WebSocket.Server) => {

    try {
        mediasoupRouter = await createWorker()
    } catch (error) {
        throw error;
    }

    websock.on('connection', (ws: WebSocket) => {
        ws.on('message', (message: string) => {
            const jsonValidation = IsJsonString(message)
            if (!jsonValidation) {
                console.error("json error")
                return
            }

            const event = JSON.parse(message);

            switch (event.type) {
                case "getRouterRtpCapabilities":
                    onRouterRtcCapabilities(event, ws);
                    break;
                case "createProducerTransport":
                    onCreateProducerTransport(event, ws)
                default:
                    break;
            }
        })
    });

    const IsJsonString = (msg: string) => {
        try {
            JSON.parse(msg);
        } catch (error) {
            return false;
        }

        return true;
    }

    const onRouterRtcCapabilities = (event: String, ws: WebSocket) => {
        send(ws, "routerCapabilities", mediasoupRouter.rtpCapabilities);
    };

    const onCreateProducerTransport = async (event: String, ws: WebSocket) => {
        try {
            const {
                transport, params,
            } = await createWebRtcTransport(mediasoupRouter);
            producerTransport = transport
            send(ws, "producerTransportCreated", params)
        } catch (error) {
            console.error(error)
            send(ws, "producerTransportError", error)
        }
    };

    const send = (ws: WebSocket, type: string, msg: any) => {
        const message = {
            type,
            data: msg
        }

        const response = JSON.stringify(message);
        ws.send(response)
    }
}

export { WebSocketConnection };