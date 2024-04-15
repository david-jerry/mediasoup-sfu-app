import { Socket } from "socket.io";
import { send } from "../lib/utils";


const disconnectedState = (socket: Socket) => {
    socket.on("disconnect", () => {
        console.log("Peer disconnected");
        send(socket, 'connection-disconnected', 'disconnected');
        /**
         * any additional command can be put below here
         * to terminate any ws event and connection
         */
    });
}

const connectedState = (socket: Socket) => {
    const conData = {
        socketId: socket.id,
        connected: socket.connected
    }
    console.log(conData.connected)

    send(socket, 'connection-success', conData);
}

export { disconnectedState, connectedState };