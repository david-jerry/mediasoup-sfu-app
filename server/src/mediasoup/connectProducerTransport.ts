import { Socket } from "socket.io";
import { send } from "../lib/utils";
import { types as mediasoupTypes } from "mediasoup";

// TODO: Watch for error
/**
* Event handler for connecting the sending transport.
* This step is required before the transport can be used to send media.
* @param {object} data.dtlsParameters - Datagram Transport Layer Security (DTLS) parameters.
* These parameters are necessary for securing the transport with encryption.
*/
const onConnectProducerTransport = async (event: any, socket: Socket, producerTransport: mediasoupTypes.Transport) => {
    await producerTransport.connect({ dtlsParameters: event.data })
    send(socket, 'producerConnected', { data: producerTransport })
};

export { onConnectProducerTransport }