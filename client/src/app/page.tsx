"use client";

import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import { Device } from "mediasoup-client"
import {
  Device as DeviceType,
  DtlsParameters,
  IceCandidate,
  IceParameters,
  Producer,
  RtpCapabilities,
  Transport,
} from "mediasoup-client/lib/types";
import { v4 as uuidV4, v4 } from "uuid";


export default function Home() {
  /**
   * References to the local and remote video HTML elements.
   * These refs are used to attach media streams to the video elements for playback.
   */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const btnCamRef = useRef<HTMLButtonElement | null>(null);
  const btnScreenRef = useRef<HTMLButtonElement | null>(null);
  const btnSubRef = useRef<HTMLButtonElement | null>(null)


  /**
   * State to hold encoding parameters for the media stream.
   * Encoding parameters control the quality and bandwidth usage of the transmitted video.
   * Each object in the encoding array represents a different layer of encoding,
   * allowing for scalable video coding (SVC). The parameters defined here are:
   * - rid: The encoding layer identifier.
   * - maxBitrate: The maximum bitrate for this layer.
   * - scalabilityMode: The scalability mode which specifies the temporal and spatial scalability.
   *
   * Additionally, codecOptions are provided to control the initial bitrate.
   */
  const [params, setParams] = useState({
    encoding: [
      { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" }, // Lowest quality layer
      { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" }, // Middle quality layer
      { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" }, // Highest quality layer
    ],
    codecOptions: { videoGoogleStartBitrate: 1000 }, // Initial bitrate
  });

  /**
   * State to hold references to various mediasoup client-side entities.
   * These entities are crucial for managing the media transmission and reception.
   */

  const [socket, setSocket] = useState<any>(null); // mediasoup Device
  const [device, setDevice] = useState<Device | null>(null); // mediasoup Device
  const [rtpCapabilities, setRtpCapabilities] = useState<RtpCapabilities | null>(null); // RTP Capabilities for the device
  const [producer, setProducer] = useState<Producer | undefined>(undefined)
  const [producerTransport, setProducerTransport] = useState<Transport | null>(
    null
  ); // Transport for sending media
  const [consumerTransport, setConsumerTransport] = useState<any>(null); // Transport for receiving media

  const textWebCam = 'streaming from webcam';
  const textScreen = 'sharing screen';
  const [textPublish, setTextPublish] = useState('');
  const [textSubscribe, setTextSubscribe] = useState('');

  const [userId, setUserId] = useState<typeof v4 | null>(null)
  const [isWebcam, setIsWebcam] = useState<boolean | null>(null)

  useEffect(() => {
    if (btnCamRef.current) {
      btnCamRef.current.disabled = true
    }
    if (btnScreenRef.current) {
      btnScreenRef.current.disabled = true
    }

    const socket: Socket = io("http://localhost:4000/mediasoup-ws");
    console.log(socket)
    setSocket(socket);


    return () => {
      socket.disconnect();
    };
  }, [])

  useEffect(() => {
    socket.on('connection-success', async (args: any) => { connect(socket, args) })
  }, [socket])


  // create device and set the router capabilities to that device
  const connect = (ws: Socket, args: any) => {
    setSocket(ws);
    console.log("Socket: ", socket.connected)
    setUserId(args.socketId)

    initializeCamera();

    // getting router capabilities
    const msg = {
      type: "routerCapabilities"
    }
    ws.emit("getRouterRtpCapabilities", msg);


    ws.onAny(async (eventName, args) => {
      console.log("Listener EventName: ", eventName)

      // TODO: I need to check this if there is an error output
      let response = args;
      console.log("Listener Arguments: ", response)

      switch (eventName) {
        case "routerCapabilities":
          await onRouterCapabilities(response)
          break;
        case 'producerTransportCreated':
          await onProducerTransportCreated(response);
          break
        default:
          break
      }
    })
  }

  const onRouterCapabilities = async (resp: any) => {
    const newDevice = new Device();
    await loadDevice(resp.data, newDevice);
    if (btnCamRef.current) {
      btnCamRef.current.disabled = false
    }
    if (btnScreenRef.current) {
      btnScreenRef.current.disabled = false
    }
  };

  const loadDevice = async (routerRtpCapabilities: RtpCapabilities, newDevice: DeviceType) => {
    console.log("RTP Capabilities: ", routerRtpCapabilities)
    setRtpCapabilities(routerRtpCapabilities)
    try {
      console.info("Set Device: ", newDevice?.loaded)
      await newDevice.load({ routerRtpCapabilities });
      console.info("After Loading Device: ", device?.loaded)
    } catch (error: any) {
      if (error.name === "UnsupportedError") {
        console.log("browser not supported")
      }
    }
    setDevice(newDevice);
  }









  /**
   * Function to start the camera and obtain a media stream.
   * This stream is then attached to the local video element for preview.
   */
  const startCamera = async () => {
    if (!device!.canProduce('video')) {
      console.error("Cannot produce video")
      return;
    }

    let stream;

    try {
      // if not screen share show the video only then if screen share display the shared screen/whitebpard.
      stream = isWebcam ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true }) : await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (error) {
      console.error("Error accessing camera:", error);
      throw error
    }

    return stream;
  };

  const onProducerTransportCreated = async (event: any) => {
    console.log(event)
    if (event.error) {
      console.error("producer transport create error: ", event.error)
      return;
    }

    let newTransport = device!.createSendTransport(event)
    console.log("Producer Transport: ", newTransport)
    setProducerTransport(newTransport || null);

    newTransport!?.on('connect', async ({ dtlsParameters }, callback: any, errback: any) => {
      try {
        const msg = {
          type: "connectProducerTransport",
          data: dtlsParameters
        }

        socket!.emit(msg.type, msg);

        socket!.on('producerConnected', (event: any) => {
          console.log("Got producerConnected: ", event)
          callback(); //means done
        })
      } catch (error: any) {
        errback(error)
      }
    });

    // Begin producer transport
    newTransport!.on('produce', async ({ kind, rtpParameters }, callback: any, errback: any) => {
      try {
        const msg = {
          type: 'produce',
          transportId: newTransport!.id,
          kind,
          rtpParameters
        }


        socket!.emit(msg.type, { data: msg });

        socket!.on('producing', (resp: any) => {
          callback(resp.data.id)
        })
      } catch (error: any) {
        errback(error)
      }
    });

    newTransport!.on('connectionstatechange', (state: any) => {
      switch ((state)) {
        case "connecting":
          setTextPublish("publishing...")
          break;
        case "connected":
          videoRef!.current!.srcObject = stream;
          setTextPublish("published")
          break
        case "failed":
          producerTransport?.close()
          setTextPublish("failed")
          break
        default:
          break;
      }
    })
    // End producer transport function

    let stream: any;
    try {
      stream = await startCamera()
      if (videoRef.current) {
        const track = stream.getVideoTracks()[0];
        videoRef.current.srcObject = stream;
        setParams((current) => ({ ...current, track }));
      }

      const newProducer = await newTransport!.produce(params)
      setProducer(newProducer)
    } catch (error) {
      console.error(error)
      setTextPublish("failed!")
    }
  }

  const publish = (webCam: boolean) => {
    console.log("Clicked publish button")
    setIsWebcam(webCam);
    setTextPublish(webCam ? textWebCam : textScreen)

    console.log("Starting webcam, first known socket: ", socket)
    console.log("Connected device: ", device)

    const message = {
      type: "producerTransportCreated",
      forceTcp: false,
      rtpCapabilities: device!.rtpCapabilities
    }

    console.log("Sending producer transport event message", message)

    socket?.emit("createProducerTransport", message);
  }




  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        const track = stream.getVideoTracks()[0];
        videoRef.current.srcObject = stream;
        setParams((current) => ({ ...current, track }));
      }
    } catch (error: any) {
      console.error("Error accessing camera: ", error);
    }
  }

  return (
    <main className="w-screen max-h-screen p-24 h-screen">
      <div className="max-h-[calc(100vh_-_64px)] gap-6 grid gird-cols-1 lg:grid-cols-2">
        <video className="border-black rounded-xl border-4 w-full block h-full" ref={videoRef} autoPlay playsInline />
        <video className="border-black rounded-xl border-4 w-full block h-full" ref={remoteVideoRef} autoPlay playsInline />
      </div>
      <div className="py-6 gap-5 w-full px-4 md:px-24 lg:px-32 xl:px-44 flex items-center justify-center">
        <button onClick={() => publish(true)} className={`${isWebcam && isWebcam !== null ? 'bg-red-500 text-white' : 'bg-black text-white hover:bg-gray-700'} h-16 flex flex-col items-center justify-center mx-auto px-6 rounded-xl duration-300 ease-in-out`} ref={btnCamRef} type="button">Publish Camera</button>
        <button onClick={() => publish(false)} className={`${!isWebcam === null && isWebcam !== true ? 'bg-red-500 text-white' : 'bg-black text-white hover:bg-gray-700'} h-16 flex flex-col items-center justify-center mx-auto px-6 rounded-xl duration-300 ease-in-out`} ref={btnScreenRef} type="button">Screen Share</button>
        <button className="h-16 flex flex-col items-center justify-center mx-auto px-6 rounded-xl bg-black text-white hover:bg-gray-700 duration-300 ease-in-out" ref={btnSubRef} type="button">Subscribe</button>
      </div>
    </main>
  );
}

