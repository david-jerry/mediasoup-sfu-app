import express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import { WebSocketConnection } from "./lib/ws";
import cors from 'cors';

const main = async () => {
    const app = express();
    const server = http.createServer(app);
    const websocket = new WebSocket.Server({server, path: "/ws"})

    app.use(
        cors({
            origin: "*",
            credentials: true,
        })
    )

    WebSocketConnection(websocket);

    const port = 4000;

    server.listen(port, () => {
        console.log(`Server listening on port ${port}`)
    })

}



export { main }