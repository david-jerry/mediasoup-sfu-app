import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import WebSocket from "ws";
import { Device } from "mediasoup-client";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
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
  const btnSub = useRef<HTMLButtonElement|null>(null)
  const btnScreen = useRef<HTMLButtonElement|null>(null)

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
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [websocketUrl, setWebsocketUrl] = useState("ws://localhost:4000/ws");
  const [textWebCam, setTextWebCam] = useState('');
  const [textPublish, setTextPublish] = useState('');
  const [textScreen, setTextScreen] = useState('');
  const [textSubscribe, setTextSubscribe] = useState('');
  const [userId, setUserId] = useState<typeof v4|null>(null)
  const [isWebcam, setIsWebcam] = useState<boolean>(false)
  const [device, setDevice] = useState<Device | null>(null); // mediasoup Device
  const [rtpCapabilities, setRtpCapabilities] = useState<RtpCapabilities | null>(null); // RTP Capabilities for the device
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

    socket!.onmessage = (e) => {
      const jsonValidation = IsJsonString(message)
      if (!jsonValidation) {
        console.error("json error")
        return
      }

      // TODO: check this if there is an error output
      let response = JSON.parse(JSON.stringify(e.data));

      switch (response.type) {
        case "":
          onRouterCapabilities(response)
          break;
        default:
          break
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

    const publish = (e: any) => {
      const newWebCam = (e.target.id)
      setIsWebcam(newWebCam === 'btn_webcam');
      setTextPublish(isWebcam ? textWebCam : textScreen)
      if(btnScreenRef.current && btnCamRef.current) {
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

    const IsJsonString = (msg: string) => {
      try {
        JSON.parse(msg);
      } catch (error) {
        return false;
      }

      return true;
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
  }

  /**
   * Function to start the camera and obtain a media stream.
   * This stream is then attached to the local video element for preview.
   */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        const track = stream.getVideoTracks()[0];
        videoRef.current.srcObject = stream;
        setParams((current) => ({ ...current, track }));
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  useEffect(() => {
    const ws = new WebSocket(websocketUrl)
    setSocket(ws);
    setUserId(uuidV4)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
    </main>
  );
}
