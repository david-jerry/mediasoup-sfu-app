import { Namespace, Socket } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { createRouter, createWorker } from "../mediasoup/workers";
import { createWebRtcTransport } from "../mediasoup/rtcTransports";
import { IsJsonString, broadcast, send } from "./utils";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

let mediasoupRouter: mediasoupTypes.Router;
let producerTransport: mediasoupTypes.Transport;
let producer: mediasoupTypes.Producer

const WebSocketConnection = async (io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {

    try {
        const worker = await createWorker();
        mediasoupRouter = await createRouter(worker);
    } catch (error) {
        throw error;
    }

    io.on('connection', async (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
        console.info(`Peer/Socket Connected: ${socket.id}`);

        socket.emit('connection-success', {
            socketId: socket.id
        });

        /**
         * Event handler for peer disconnection.
         * This can be used to clean up resources associated with the peer.
         */
        socket.on("disconnect", () => {
            console.log("Peer disconnected");
        });

        socket.on('message', (message: string) => {
            const jsonValidation = IsJsonString(message)
            if (!jsonValidation) {
                console.error("json error")
                return
            }

            const event = JSON.parse(message);

            switch (event.type) {
                case "getRouterRtpCapabilities":
                    onRouterRtcCapabilities(event, socket);
                    break;
                case "createProducerTransport":
                    onCreateProducerTransport(event, socket);
                    break;
                case "connectProducerTransport":
                    onConnectProducerTransport(event, socket);
                    break;
                case "produce":
                    onProduce(event, socket);
                    break;
                default:
                    break;
            }
        })
    });

    const onProduce = async (event: any, ws: Socket) => {
        const {
            kind,
            rtpParameters
        } = event;

        producer = await producerTransport.produce({ kind, rtpParameters })
        const resp = {
            id: producer.id
        }

        // send to listeners
        send(ws, 'producing', resp)
        // broadcast to everyone connected
        broadcast(ws, "newProducer", "New user")
    }

    const onRouterRtcCapabilities = (event: String, ws: Socket) => {
        send(ws, "routerCapabilities", mediasoupRouter.rtpCapabilities);
    };

    const onCreateProducerTransport = async (event: String, ws: Socket) => {
        try {
            const {
                transport, params,
            } = await createWebRtcTransport(mediasoupRouter);
            producerTransport = transport!
            send(ws, "producerTransportCreated", params)
        } catch (error) {
            console.error(error)
            send(ws, "producerTransportError", error)
        }
    };

    // TODO: Watch for error
    const onConnectProducerTransport = async (event: any, socket: Socket) => {
        await producerTransport.connect({ dltsParameters: event.dtlsParameters })
        send(socket, 'producerConnected', 'producer is connected')
    };

}

export { WebSocketConnection };