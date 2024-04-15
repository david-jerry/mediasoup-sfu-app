import { Namespace, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

const IsJsonString = (msg: string) => {
    try {
        JSON.parse(msg);
    } catch (error) {
        return false;
    }

    return true;
}

const send = (socket: Socket, type: string, msg: any) => {
    const msgs = {
        type,
        data: msg
    }

    socket.emit(msgs.type, msgs.data)
}

const broadcast = (io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, type: string, msg: any) => {
    const msgs = {
        type,
        data: msg
    }
    io.emit(msgs.type, msgs.data)
}


export { IsJsonString, send, broadcast }