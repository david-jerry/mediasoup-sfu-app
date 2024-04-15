import { Socket } from "socket.io";
import { send } from "../lib/utils";
import { types as mediasoupTypes } from "mediasoup";


/**
  * Event handler for fetching router RTP capabilities.
  * RTP capabilities are required for configuring transports and producers/consumers.
  */
const onRouterRtcCapabilities = (event: string, ws: Socket, mediasoupRouter: mediasoupTypes.Router) => {
  send(ws, event, { data: mediasoupRouter.rtpCapabilities });
};


export { onRouterRtcCapabilities };