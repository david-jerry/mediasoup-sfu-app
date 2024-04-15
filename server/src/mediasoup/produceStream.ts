import { Namespace, Socket } from "socket.io";
import { broadcast, send } from "../lib/utils";
import { types as mediasoupTypes } from "mediasoup";
import { DefaultEventsMap } from "socket.io/dist/typed-events";


/**
* Event handler for producing media.
* This function sets up a producer for sending media to the peer.
* A producer represents the source of a single media track (audio or video).
*/
const onProduce = async (peers: Namespace, event: any, ws: Socket, producerTransport: mediasoupTypes.Transport) => {
    console.log("on produce event values: ", event)

    const {
        kind,
        rtpParameters
    } = event;

    const producer = await producerTransport.produce({ kind, rtpParameters })
    const resp = {
        id: producer.id
    }

    // send to listeners
    send(ws, 'producing', resp)
    // broadcast to everyone connected
    broadcast(peers, "newProducer", "New user")
    return producer
}

export { onProduce };