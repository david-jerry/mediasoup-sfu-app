"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
// import WebSocket from "ws";
import { io as WebSocket } from "socket.io-client";
import { Device } from "mediasoup-client";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  Producer,
  RtpCapabilities,
  Transport,
} from "mediasoup-client/lib/types";
import { v4 as uuidV4, v4 } from "uuid";
import { IsJsonString } from "@/lib/utils";


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

  let [message, setMessage] = useState<string>('')

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
  const [socket, setSocket] = useState<any>(null)
  const [websocketUrl, setWebsocketUrl] = useState("http://localhost:4000/mediasoup-ws");
  const [textWebCam, setTextWebCam] = useState('');
  const [textPublish, setTextPublish] = useState('');
  const [textScreen, setTextScreen] = useState('');
  const [textSubscribe, setTextSubscribe] = useState('');
  const [userId, setUserId] = useState<typeof v4 | null>(null)
  const [isWebcam, setIsWebcam] = useState<boolean>(true)
  const [device, setDevice] = useState<Device | null>(null); // mediasoup Device
  const [rtpCapabilities, setRtpCapabilities] = useState<RtpCapabilities | null>(null); // RTP Capabilities for the device
  const [producer, setProducer] = useState<Producer | undefined>(undefined)
  const [producerTransport, setProducerTransport] = useState<Transport | null>(
    null
  ); // Transport for sending media
  const [consumerTransport, setConsumerTransport] = useState<any>(null); // Transport for receiving media


  const connect = () => {
    // starting the socket requests
    socket!.onopen = () => {
      const msg = {
        type: "getRouterRtpCapabilities"
      }

      const resp = JSON.stringify(msg);
      socket!.send(resp);
    }

    socket!.onmessage = (e: { data: any; }) => {
      const jsonValidation = IsJsonString(message)
      if (!jsonValidation) {
        console.error("json error")
        return
      }

      // TODO: check this if there is an error output
      let response = JSON.parse(JSON.stringify(e.data));

      switch (response.type) {
        case "routerCapabilities":
          onRouterCapabilities(response)
          break;
        case 'producerTransportCreated':
          onProducerTransportCreated(response);
          break
        default:
          break
      }
    }
  }


  const onRouterCapabilities = (resp: any) => {
    loadDevice(resp.data);
    if (btnCamRef.current) {
      btnCamRef.current.disabled = false
    }
    if (btnScreenRef.current) {
      btnScreenRef.current.disabled = false
    }
  };

  const onProducerTransportCreated = async (event: any) => {
    if (event.error) {
      console.error("producer transport create error: ", event.error)
      return;
    }

    const newTransport = device!.createSendTransport(event.data)
    setProducerTransport(newTransport);

    producerTransport!.on('connect', async ({ dtlsParameters }, callback, errback) => {
      const msg = {
        type: "connectProducerTransport",
        dtlsParameters
      }
      const resp = JSON.stringify(msg)
      socket!.send(resp);

      socket!.addEventListener('producerConnected', (event: any) => {
        callback(); //means done
      })
    });

    // Begind producer transport
    producerTransport!.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      const msg = {
        type: 'produce',
        transportId: producerTransport!.id,
        kind,
        rtpParameters
      }

      const resp = JSON.stringify(msg)
      socket!.send(resp);
      socket!.addEventListener('producing', (resp: any) => {
        callback(resp.data.id)
      })
    });

    //@ts-expect-error
    producerTransport!.on('connectionStatechange', (state: any) => {
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

      const newProducer = await producerTransport!.produce(params)
      setProducer(newProducer)
    } catch (error) {
      console.error(error)
      setTextPublish("failed!")
    }
  }

  const publish = (e: any) => {
    const newWebCam = (e.target.id)
    setIsWebcam(newWebCam === 'btn_webcam');
    setTextPublish(isWebcam ? textWebCam : textScreen)
    if (btnScreenRef.current && btnCamRef.current) {
      btnScreenRef.current.disabled = false;
      btnCamRef.current.disabled = false;
    }

    const message = {
      type: 'createProducerTransport',
      forceTcp: false,
      rtpCapabilities: device!.rtpCapabilities
    }

    const resp = JSON.stringify(message);
    socket!.send(resp);
  }

  const loadDevice = async (routerRtpCapabilities: RtpCapabilities) => {
    setRtpCapabilities(routerRtpCapabilities)
    try {
      const newDevice = new Device();
      setDevice(newDevice)
    } catch (error: any) {
      if (error.name === "UnsupportedError") {
        console.log("browser not supported")
      }
    }

    await device!.load({ routerRtpCapabilities })
  }

  /**
   * Function to start the camera and obtain a media stream.
   * This stream is then attached to the local video element for preview.
   */
  const startCamera = async () => {
    if (!device?.canProduce('video')) {
      console.error("Cannot produce video")
      return;
    }

    let stream;

    try {
      // if not screen share show the video only then if screenshare display the screenshared.
      stream = isWebcam ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true }) : await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (error) {
      console.error("Error accessing camera:", error);
      throw error
    }

    return stream;
  };

  useEffect(() => {
    const ws = WebSocket(websocketUrl)
    console.log("Socket: ", ws)
    setSocket(ws);
    setUserId(uuidV4);
    
    connect();
  }, [])

  return (
    <main className="max-h-screen p-24 gap-6 grid gird-cols-1 lg:grid-cols-2">
      <video className="h-screen" ref={videoRef} autoPlay={true} playsInline={true} />
      <video className="h-screen" ref={remoteVideoRef} autoPlay={true} playsInline={true} />
      <div className="gap-5 w-screen px-4 md:px-24 lg:px-32 xl:px-44 flex items-center justify-center">
        <button id="btn_webcam" onClick={publish} className="h-16 flex flex-col items-center justify-center mx-auto px-6 rounded-xl bg-black text-white hover:bg-gray-700 duration-300 ease-in-out" ref={btnCamRef} type="button">Publish Camera</button>
        <button onClick={publish} className="h-16 flex flex-col items-center justify-center mx-auto px-6 rounded-xl bg-black text-white hover:bg-gray-700 duration-300 ease-in-out" ref={btnScreenRef} type="button">Screen Share</button>
        <button className="h-16 flex flex-col items-center justify-center mx-auto px-6 rounded-xl bg-black text-white hover:bg-gray-700 duration-300 ease-in-out" ref={btnSubRef} type="button">Subscribe</button>
      </div>
    </main>
  );
}
