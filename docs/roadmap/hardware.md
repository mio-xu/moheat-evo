# MoHeat Evo hardware roadmap (ideas from demo production)

## Head-tracking sensor in the headset (2026-11-08)
- Today MoHeat Evo has no IMU (gyro / accelerometer). The web demos can only track the head with the camera (MediaPipe face pose) or "look around" with the phone gyroscope; earbud head tracking (AirPods etc.) is not exposed to browsers.
- Future direction: an IMU in the headset, streamed to the page over the existing Web Serial / BLE link, would give camera-free, low-latency, power-cheap head tracking. Voices and warm / cool would stay fixed in the room when you turn your head — a selling point only MoHeat Evo can offer.
- Demo side is ready to accept it: the head-tracking setting will have sources off (default) / camera / phone gyro, and a "device IMU" source can be added later.
