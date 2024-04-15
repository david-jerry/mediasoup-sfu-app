import { Namespace, Socket } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { createRouter, createWorker } from "../mediasoup/workers";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { connectedState, disconnectedState } from "./connectionStates";
import { onRouterRtcCapabilities } from "../mediasoup/getRouterCapabilities";
import { onCreateProducerTransport } from "../mediasoup/createProducerTransport";
import { onConnectProducerTransport } from "../mediasoup/connectProducerTransport";
import { onProduce } from "../mediasoup/produceStream";

let mediasoupRouter: mediasoupTypes.Router;
let producerTransport: mediasoupTypes.Transport;
let consumerTransport: mediasoupTypes.Transport;
let producer: mediasoupTypes.Producer

const WebSocketConnection = async (peers: Namespace) => {

    try {
        const worker = await createWorker();
        mediasoupRouter = await createRouter(worker);
    } catch (error) {
        throw error;
    }

    /**
     * Event handler for new peer connections.
     * This function sets up all necessary event handlers and transports for a connected peer.
     *
     * @param socket - The socket object representing the connected peer.
     */
    peers.on('connection', async (socket: Socket) => {
        console.info(`Peer/Socket Connected: ${socket.id}`);

        /**
         * Event handler for checking the connection state
         * and if the connection is certain return an event message
        */
        connectedState(socket);

        /**
         * Event handler for peer disconnection.
         * This can be used to clean up resources associated with the peer.
         */
        disconnectedState(socket)

        socket.onAny(async (eventName, event) => {
            console.info("Server Listening Event: ", eventName)

            switch (eventName) {
                case "getRouterRtpCapabilities":
                    console.info("Getting router capabilities")
                    onRouterRtcCapabilities(event.type, socket, mediasoupRouter);
                    console.info("Gotten router capabilities")
                    break;
                case "createProducerTransport":
                    console.info("Getting producer transport")
                    const transport = await onCreateProducerTransport(event.type, socket, mediasoupRouter);
                    console.info("producer transport details: ", transport)
                    transport ? producerTransport = transport : null
                    console.info("Gotten producer transport ID", producerTransport.id)
                    break;
                case "connectProducerTransport":
                    console.info("Creating producer transport")
                    await onConnectProducerTransport(event, socket, producerTransport);
                    console.info("Created producer transport")
                    break;
                case "produce":
                    console.info("Stream Producer started")
                    producer = await onProduce(peers, event, socket, producerTransport);
                    producer.on('transportclose', () => {
                        console.log("Producer transport closed");
                        producer.close()
                    })
                    console.info("Stream Producer ended")
                    break;

                case "createConsumerTransport":
                    console.info("Getting producer transport")
                    const ctresp = await onCreateProducerTransport(event.type, socket, mediasoupRouter);
                    console.info("producer transport details: ", ctresp)
                    ctresp ? consumerTransport = ctresp : null
                    console.info("Gotten producer transport")
                    break;
                case "connectConsumerTransport":
                    console.info("Creating Consumer transport")
                    await onConnectProducerTransport(event, socket, consumerTransport);
                    console.info("Created Consumer transport")
                    break;
                case "consume":
                    console.info("Stream Consumer started")
                    producer = await onProduce(peers, event, socket, consumerTransport);
                    console.info("Stream Consumer ended")
                    break;
                default:
                    break;
            }
        })
    });

}

export { WebSocketConnection };