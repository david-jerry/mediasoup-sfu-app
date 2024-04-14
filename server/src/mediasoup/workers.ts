import * as mediasoup from "mediasoup";
import { config } from "./config";
import { Worker, Router, AppData } from "mediasoup/node/lib/types";

let worker: Worker<AppData>;
let router: Router<AppData>;

let nextMediasoupWorkerIdx = 0;

const createWorker = async () => {
    const newWorker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    newWorker.on('died', () => {
        console.error('mediasoup worker died, existing in 2 seconds...')
        setTimeout(() => {
            process.exit(1);
        }, 2000);
    })

    worker = newWorker;
    return worker;
}

const createRouter = async (worker: Worker<AppData>) => {
    const mediaCodecs = config.mediasoup.router.mediaCodecs;
    router = await worker.createRouter({mediaCodecs});
    return router;
}

export { createWorker, createRouter};