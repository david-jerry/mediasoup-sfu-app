import express from "express";
import * as http from "http";
import { Server } from "socket.io";
import { WebSocketConnection } from "./socket/ws";
import cors from 'cors';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';


// connection settings with horizontally scaling in order to be able to support thousands of concurrent clients at the same time.
const main = async () => {
    const port = 4000; // can be a environment variable for security purposes
    if (cluster.isPrimary) {
        const numCPUs = availableParallelism();
        // create one worker per available core
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork({
                PORT: 3000 + 1
            })
        }

        // setting up the adapter on the primary thread
        setupPrimary();
    } else {
        // initialize express server
        const app = express();
        // create server
        const server = http.createServer(app);

        // implement cors security header
        app.use(
            cors({
                origin: "*",
                credentials: true,
            })
        )

        // initialize socket io
        const io = new Server(server, {
            cors: {
                origin: "*",
                credentials: true,
            },
            connectionStateRecovery: {},
            adapter: createAdapter()
        });

        // create websocket peer connection over s specific namespace
        const peer = io.of("/mediasoup-ws")



        WebSocketConnection(peer);


        server.listen(port, () => {
            console.log(`Server listening on port ${port}, with full socket address at: http://localhost:${port}/mediasoup-ws`)
        })
    }

}



export { main }