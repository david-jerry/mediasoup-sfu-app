import * as mediasoup from "mediasoup";
import { config } from "./config";
import { Worker, Router, AppData } from "mediasoup/node/lib/types";

// let worker: Array<{
//     worker: Worker
//     router: Router
// }> = [];

let worker: Worker<AppData>;

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

    const mediaCodecs = config.mediasoup.router.mediaCodecs;
    const mediasoupRouter = await newWorker.createRouter({mediaCodecs});
    return mediasoupRouter
}

export { createWorker};