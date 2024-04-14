import { Socket } from "socket.io";

const IsJsonString = (msg: string) => {
    try {
        JSON.parse(msg);
    } catch (error) {
        return false;
    }

    return true;
}

const send = (socket: Socket, type: string, msg: any) => {
    const message = {
        type,
        data: msg
    }

    const resp = JSON.stringify(message);
    socket.emit(resp)
}

const broadcast = (socket: Socket, type: string, msg: any) => {
    const msgs = {
        type,
        data: msg
    }
    const resp = JSON.stringify(msgs)
    socket.broadcast.emit(resp)
}


export { IsJsonString, send, broadcast }