import "./App.css";
import { HandLandmarker, PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import React, { useRef, useState, useEffect } from "react";
import GraphSingleHand from "./GraphSingleHand";
import GraphBothHands from "./GraphBothHands";
import MovementPhaseChart from "./MovementPhaseChart";
import GraphSingleWrist from "./GraphSingleWrist";
import MovementPhaseWrist from "./MovementPhaseWrist";
// import { exportChartsToPDF } from "./exportToPDF";

function App() {
    const [desiredReps, setDesiredReps] = useState(5);
    const desiredRepsRef = useRef(5);
    const [selectedExercise, setSelectedExercise] = useState("arm_raise");
    const [webcamRunning, setWebcamRunning] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [currentHand, setCurrentHand] = useState("");
    const currentHandRef = useRef("");
    const [selectedHand, setSelectedHand] = useState("");
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const timerIdRef = useRef(null);
    const isCountingDownRef = useRef(false);
    const currentHandPhaseRef = useRef("left");
    const initialHandRef = useRef("");
    const [leftRepetitions, setLeftRepetitions] = useState([]);
    const [rightRepetitions, setRightRepetitions] = useState([]);
    const [bothRepetitions, setBothRepetitions] = useState([]);
    const [showCharts, setShowCharts] = useState(false);
    const lBaselineShoulderYRef = useRef(null);
    const rBaselineShoulderYRef = useRef(null);
    const [leftPhasesData, setLeftPhasesData] = useState([]);
    const [rightPhasesData, setRightPhasesData] = useState([]);
    const [bothPhasesData, setBothPhasesData] = useState([]);
    const [leftHandStats, setLeftHandStats] = useState([]);
    const [rightHandStats, setRightHandStats] = useState([]);
    const [bothHandsStats, setBothHandsStats] = useState([]);
    const [displayedExercise, setDisplayedExercise] = useState(null);
    const [displayMessage, setDisplayMessage] = useState(currentHandPhaseRef.current === "both" ? "Поднимите обе руки вверх" : `Поднимите ${currentHand === "left" ? "левую" : "правую"} руку вверх`);
    const [angleThresholds, setAngleThresholds] = useState({
        up: 20,
        down: 20,
    });

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const handLandmarkerRef = useRef(null);
    const poseLandmarkerRef = useRef(null);
    const canvasCtxRef = useRef(null);
    const drawingUtilsRef = useRef(null);

    // Функция для получения противоположной руки
    const oppositeHand = (hand) => (hand === "left" ? "right" : "left");

    // Данные для левой и правой руки
    const leftHandData = useRef({
        counter: 0,
        repetitions: [],
        lastLinearVelocity: 0,
        currentRepetition: null,
        maxAngleWrist: 0,
        minAngleWrist: 0,
        wristAmplitude: 0,
        maxShoulderAngle: 0,
        minShoulderAngle: 180,
        shoulderAmplitude: 0,
        maxElbowAngle: 0,
        minElbowAngle: 180,
        elbowAmplitude: 0,
        movementPhases: [],
        cycleTimes: [],
        angularVelocities: [],
        lastShoulderAngle: null,
        lastElbowAngle: null,
        lastTime: null,
        startTime: null,
    });

    const rightHandData = useRef({
        counter: 0,
        repetitions: [],
        lastLinearVelocity: 0,
        currentRepetition: null,
        maxAngleWrist: 0,
        minAngleWrist: 0,
        wristAmplitude: 0,
        maxShoulderAngle: 0,
        minShoulderAngle: 180,
        shoulderAmplitude: 0,
        maxElbowAngle: 0,
        minElbowAngle: 180,
        elbowAmplitude: 0,
        movementPhases: [],
        cycleTimes: [],
        angularVelocities: [],
        lastShoulderAngle: null,
        lastElbowAngle: null,
        lastTime: null,
        startTime: null,
    });

    const bothHandsData = useRef({
        counter: 0,
        repetitions: [],
        lastLinearVelocityLeft: 0,
        lastLinearVelocityRight: 0,
        currentRepetition: null,
        maxShoulderAngleLeft: 0,
        minShoulderAngleLeft: 180,
        shoulderAmplitudeLeft: 0,
        maxShoulderAngleRight: 0,
        minShoulderAngleRight: 180,
        shoulderAmplitudeRight: 0,
        movementPhases: [],
        cycleTimes: [],
        angularVelocitiesLeft: [],
        angularVelocitiesRight: [],
        lastShoulderAngleLeft: null,
        lastShoulderAngleRight: null,
        lastTime: null,
        startTime: null,
    });

    // Глобальные переменные для трекинга
    const lastVideoTimeRef = useRef(-1);
    let handUp = false;

    const movementPhaseRef = useRef("initial");
    let movementPhases = [];
    let cycleTimes = [];
    let angularVelocities = [];
    let lastShoulderAngle = null;
    let lastElbowAngle = null;
    let lastTime = null;
    let startTime = null;

    useEffect(() => {
        // Инициализируем `poseLandmarker` после монтирования компонента
        createPoseLandmarker();
    }, []);

    useEffect(() => {
        currentHandRef.current = currentHand;
    }, [currentHand]);

    const createPoseLandmarker = async () => {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
                // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                delegate: "GPU",
            },
            runningMode: "VIDEO",
        });

        poseLandmarkerRef.current = poseLandmarker;

        // Загружаем модель Hand Landmarker
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
        });
        handLandmarkerRef.current = handLandmarker;

        // Устанавливаем размеры видео и канваса
        if (videoRef.current && canvasRef.current) {
            videoRef.current.width = 1280;
            videoRef.current.height = 960;
            canvasRef.current.width = 1280;
            canvasRef.current.height = 960;
            canvasCtxRef.current = canvasRef.current.getContext("2d");
            drawingUtilsRef.current = new DrawingUtils(canvasCtxRef.current);

            // После успешной инициализации poseLandmarker
            setIsModelLoaded(true);
        } else {
            console.error("Video or Canvas element is not available.");
        }
    };

    useEffect(() => {
        return () => {
            // Очистка таймера при размонтировании
            clearInterval(timerIdRef.current);

            // Остановка камеры и очистка canvas
            if (webcamRunning) {
                const video = videoRef.current;
                if (video && video.srcObject) {
                    video.removeEventListener("loadeddata", predictWebcam);
                    const stream = video.srcObject;
                    const tracks = stream.getTracks();
                    tracks.forEach((track) => {
                        track.stop();
                        stream.removeTrack(track);
                    });
                    video.srcObject = null;
                }
                clearCanvas();
            }
        };
    }, []);

    // Управление видеопотоком при изменении состояния webcamRunning
    useEffect(() => {
        if (webcamRunning) {
            if (!isModelLoaded) {
                console.log("Wait! poseLandmarker not loaded yet.");
                setWebcamRunning(false);
                return;
            }
            const video = videoRef.current;
            if (!video) {
                console.log("Video element not available yet.");
                setWebcamRunning(false);
                return;
            }
            // Включаем камеру
            const constraints = {
                video: true,
            };
            navigator.mediaDevices
                .getUserMedia(constraints)
                .then((stream) => {
                    video.srcObject = stream;
                    video.addEventListener("loadeddata", predictWebcam);
                })
                .catch((error) => {
                    console.error("Error accessing webcam:", error);
                });
        } else {
            // Останавливаем камеру
            const video = videoRef.current;
            if (video && video.srcObject) {
                video.removeEventListener("loadeddata", predictWebcam);
                const stream = video.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach((track) => {
                    track.stop();
                    stream.removeTrack(track);
                });
                video.srcObject = null;
            }
        }
    }, [webcamRunning, isModelLoaded]);

    const resetScenario = () => {
        let handData;

        if (currentHandPhaseRef.current === "left") {
            handData = leftHandData.current;
        } else if (currentHandPhaseRef.current === "right") {
            handData = rightHandData.current;
        } else if (currentHandPhaseRef.current === "both") {
            handData = bothHandsData.current;
        }

        // Сбрасываем данные текущей руки или обеих рук
        if (handData) {
            handData.counter = 0;
            handData.maxShoulderAngleLeft = 0;
            handData.minShoulderAngleLeft = 180;
            handData.shoulderAmplitudeLeft = 0;
            handData.maxShoulderAngleRight = 0;
            handData.minShoulderAngleRight = 180;
            handData.shoulderAmplitudeRight = 0;
            handData.movementPhases = [];
            handData.cycleTimes = [];
            handData.angularVelocitiesLeft = [];
            handData.angularVelocitiesRight = [];
            handData.lastShoulderAngleLeft = null;
            handData.lastShoulderAngleRight = null;
            handData.lastTime = null;
            handData.startTime = null;
            handData.repetitions = [];
            handData.currentRepetition = null;
        }

        // Сбрасываем глобальные переменные
        movementPhaseRef.current = "initial";
        movementPhases = [];
        cycleTimes = [];
        angularVelocities = [];
        lastShoulderAngle = null;
        lastElbowAngle = null;
        lastTime = null;
        startTime = null;
        handUp = false;

        // Обновляем интерфейс
        document.getElementById("counter").innerHTML = `Количество повторений: ${handData ? handData.counter : 0}`;
        if (currentHandPhaseRef.current === "both") {
            document.getElementById("message").innerHTML = `Поднимите обе руки вверх`;
        } else {
            document.getElementById("message").innerHTML = `Поднимите ${currentHandRef.current === "left" ? "левую" : "правую"} руку вверх`;
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const enableCam = () => {
        if (!isModelLoaded) {
            console.log("Wait! poseLandmarker not loaded yet.");
            return;
        }
        if (!webcamRunning) {
            if (!selectedHand) {
                alert("Пожалуйста, выберите начальную руку прежде чем включить камеру.");
                return;
            }
            // Сохраняем начальную руку
            initialHandRef.current = selectedHand;

            currentHandPhaseRef.current = selectedHand;
            currentHandRef.current = selectedHand;
            setCurrentHand(selectedHand);
            resetScenario();
            setWebcamRunning(true);

            // Запускаем обратный отсчёт
            // startCountdown();
            waitStart();
        } else {
            // Останавливаем упражнение
            setIsCountingDown(false);
            isCountingDownRef.current = false;
            setCountdown(5);
            setWebcamRunning(false);

            clearCanvas();

            // Сбрасываем выбор руки для следующего упражнения
            setSelectedHand("");
        }
    };

    const startCountdown = () => {
        setIsCountingDown(true);
        isCountingDownRef.current = true;
        setCountdown(5); // Устанавливаем значение 5 секунды

        timerIdRef.current = setInterval(() => {
            setCountdown((prevCountdown) => {
                if (prevCountdown <= 1) {
                    clearInterval(timerIdRef.current);
                    setIsCountingDown(false);
                    isCountingDownRef.current = false;
                    setCountdown(0);
                    // Отсчёт завершён, анализ начнётся автоматически
                    captureBaseline();
                    return 0;
                } else {
                    return prevCountdown - 1;
                }
            });
        }, 1000);
    };

    const captureBaseline = () => {
        if (!poseLandmarkerRef.current) {
            console.error("Pose landmarker not initialized.");
            return;
        }

        const video = videoRef.current;
        if (!video) {
            console.error("Video element not available.");
            return;
        }

        // Захватываем кадр и получаем позу
        // const startTimeMs = performance.now();
        // poseLandmarkerRef.current.detectForVideo(video, startTimeMs, (result) => {
        //     if (result.landmarks && result.landmarks.length > 0) {
        //         const landmarks = result.landmarks[0];

        //         // Нормализуем координаты
        //         const lShoulder = landmarks[11];
        //         const rShoulder = landmarks[12];

        //         if (lShoulder && rShoulder) {
        //             lBaselineShoulderYRef.current = lShoulder.y;
        //             rBaselineShoulderYRef.current = rShoulder.y;
        //             console.log("Baseline shoulders Y positions captured.");
        //         } else {
        //             console.error("Shoulder landmarks not detected.");
        //         }
        //     } else {
        //         console.error("No pose landmarks detected.");
        //     }
        // });
    };

    function calcAngle(p1, p2, p3) {
        const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
        let angle = Math.abs(radians * (180.0 / Math.PI));

        if (angle > 180.0) {
            angle = 360 - angle;
        }

        return angle;
    }
    function calcAngle360(p1, p2, p3) {
        const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
        let angle = Math.abs(radians * (180.0 / Math.PI));

        // if (angle > 180.0) {
        //     angle = 360 - angle;
        // }

        return angle;
    }

    const exercises = {
        arm_raise: {
            name: "Поднятие руки в сторону",
            targetConnections: {
                left: [
                    { start: 23, end: 11 },
                    { start: 11, end: 13 },
                    { start: 13, end: 15 },
                ],
                right: [
                    { start: 24, end: 12 },
                    { start: 12, end: 14 },
                    { start: 14, end: 16 },
                ],
            },
            targetIndices: {
                left: [23, 11, 13, 15],
                right: [24, 12, 14, 16],
            },
            analyzeFunction: analyzeArmRaise,
        },
        wrist_curl: {
            name: "Поднятие кисти",
            targetConnections: { left: [], right: [] },
            targetIndices: { left: [], right: [] },
            analyzeFunction: analyzeWristCurl,
        },
    };

    const waitForUserInput = () => {
        return new Promise((resolve) => {
            const handleInteraction = () => {
                // Удаляем оба слушателя при срабатывании
                document.removeEventListener("keydown", handleInteraction);
                document.removeEventListener("click", handleInteraction);
                resolve();
            };

            // Добавляем слушатели с { once: true } для автоматического удаления
            document.addEventListener("keydown", handleInteraction, { once: true });
            document.addEventListener("click", handleInteraction, { once: true });
        });
    };

    const handleArmSwitch = async () => {
        console.log("Переход к другой руке");

        // Блокируем дальнейший анализ
        isCountingDownRef.current = true;

        const opposite = oppositeHand(initialHandRef.current);
        currentHandPhaseRef.current = opposite;
        currentHandRef.current = opposite;
        setCurrentHand(opposite);

        // Показываем сообщение пользователю
        setDisplayMessage("Нажмите любую клавишу или кнопку мыши для продолжения");

        // Ждём ввода
        await waitForUserInput();

        // Разблокируем анализ
        isCountingDownRef.current = false;

        // Возвращаем стандартное сообщение
        setDisplayMessage(`Поднимите ${opposite === "left" ? "левую" : "правую"} руку вверх`);

        resetScenario();
    };

    const waitStart = async () => {
        try {
            isCountingDownRef.current = true;
            setDisplayMessage("Нажмите любую клавишу или кнопку мыши для продолжения");

            // Явно обновляем состояние перед ожиданием
            await new Promise((resolve) => setTimeout(resolve, 50));

            await waitForUserInput();

            isCountingDownRef.current = false;
            setDisplayMessage(`Поднимите ${initialHandRef.current === "left" ? "левую" : "правую"} руку вверх`);
        } catch (error) {
            console.error("Error in waitStart:", error);
        }
    };

    const ArmRaiseCharts = () => (
        <>
            <h2>Результаты упражнения "Поднятие руки в сторону"</h2>
            <GraphSingleHand repetitions={leftRepetitions} handLabel="Левая рука" lineColor="rgba(75, 192, 192, 1)" />
            <GraphSingleHand repetitions={rightRepetitions} handLabel="Правая рука" lineColor="rgba(153, 102, 255, 1)" />
            <GraphBothHands bothRepetitions={bothRepetitions} />
            <h2>Графики фаз движения</h2>
            <MovementPhaseChart phasesDataLeft={leftPhasesData} phasesDataRight={[]} handLabel="Левая рука" />
            <MovementPhaseChart phasesDataLeft={[]} phasesDataRight={rightPhasesData} handLabel="Правая рука" />
            <MovementPhaseChart phasesDataLeft={bothPhasesData.left} phasesDataRight={bothPhasesData.right} handLabel="Обе руки" />
        </>
    );

    const WristCurlCharts = () => (
        <>
            <h2>Результаты упражнения "Поднятие кисти"</h2>
            <GraphSingleWrist repetitions={leftRepetitions} handLabel="Левая кисть" lineColor="rgba(255, 99, 132, 1)" />
            <GraphSingleWrist repetitions={rightRepetitions} handLabel="Правая кисть" lineColor="rgba(54, 162, 235, 1)" />
            <h3>Фазы движения кисти</h3>
            {/* <MovementPhaseWrist phasesDataLeft={leftPhasesData} phasesDataRight={[]} handLabel="Левая кисть" />
            <MovementPhaseWrist phasesDataLeft={[]} phasesDataRight={rightPhasesData} handLabel="Правая кисть" /> */}
        </>
    );
    let lastCallId = 0;

    async function predictWebcam() {
        if (!webcamRunning) {
            return;
        }
        const callId = ++lastCallId;
        // console.log(`[${callId}] predictWebcam started, exercise: ${selectedExercise}`);

        const canvasElement = canvasRef.current;
        const video = videoRef.current;
        const canvasCtx = canvasCtxRef.current;
        const drawingUtils = drawingUtilsRef.current;

        if (!canvasElement || !video || !canvasCtx || !drawingUtils) {
            console.error("One or more required elements are not available.");
            return;
        }

        let startTimeMs = performance.now();
        if (lastVideoTimeRef.current !== video.currentTime) {
            lastVideoTimeRef.current = video.currentTime;

            if (selectedExercise === "wrist_curl") {
                const handLandmarker = handLandmarkerRef.current;
                // Используем Hand Landmarker для упражнения с кистью
                try {
                    // console.log("=== Debug: Hand Landmarker Check ===");
                    // console.log("Video currentTime:", video.currentTime);
                    // console.log("Last video time:", lastVideoTimeRef.current);
                    // console.log("Time condition:", lastVideoTimeRef.current !== video.currentTime);
                    // console.log("Selected exercise:", selectedExercise);
                    // console.log("Hand Landmarker initialized:", !!handLandmarkerRef.current);
                    // console.log("Video stream state:", video.srcObject?.getTracks()?.[0]?.readyState);

                    const result = handLandmarker.detectForVideo(video, startTimeMs);
                    canvasCtx.save();
                    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                    // Получаем данные текущего упражнения
                    const exerciseData = exercises[selectedExercise];

                    // Определяем целевую руку (левую или правую)
                    const targetHand = currentHandPhaseRef.current; // "left" или "right"

                    // Получаем целевые соединения и индексы для выбранной руки
                    const targetConnections = exerciseData.targetConnections[targetHand];
                    const targetIndices = exerciseData.targetIndices[targetHand];

                    if (!targetConnections || !Array.isArray(targetConnections)) {
                        console.error("targetConnections is undefined or not an array:", targetConnections);
                        return;
                    }

                    // Создаем набор строковых представлений целевых соединений
                    const targetConnectionStrings = new Set(
                        targetConnections.map((conn) => {
                            const sortedIndices = [conn.start, conn.end].sort((a, b) => a - b);
                            return sortedIndices.join("-");
                        })
                    );

                    // Фильтруем соединения
                    const otherConnections = HandLandmarker.HAND_CONNECTIONS.filter((conn) => {
                        const sortedIndices = [conn.start, conn.end].sort((a, b) => a - b);
                        const connString = sortedIndices.join("-");
                        return !targetConnectionStrings.has(connString);
                    });

                    for (const landmarks of result.landmarks) {
                        // Определяем, какая рука обнаружена (левая или правая)
                        const handedness = result.handednesses[0][0].displayName; // "Left" или "Right"

                        // Если обнаруженная рука не соответствует целевой - пропускаем
                        if (handedness.toLowerCase() !== targetHand) continue;

                        // Отрисовываем остальные соединения белым цветом
                        drawingUtils.drawConnectors(landmarks, otherConnections, {
                            color: "#FFFFFF",
                            lineWidth: 2,
                        });

                        // // Отрисовываем соединения целевой руки зелёным цветом
                        // drawingUtils.drawConnectors(landmarks, targetConnections, {
                        //     color: "#00FF00",
                        //     lineWidth: 2,
                        // });

                        // Разделяем ключевые точки на целевые и остальные
                        const targetLandmarks = landmarks.filter((_, index) => targetIndices.includes(index));
                        const otherLandmarks = landmarks.filter((_, index) => !targetIndices.includes(index));

                        // Отрисовываем остальные ключевые точки белым цветом без заливки
                        drawingUtils.drawLandmarks(otherLandmarks, {
                            color: "#FFFFFF",
                            fillColor: "transparent",
                            lineWidth: 2,
                            radius: (data) => DrawingUtils.lerp(data.from?.z ?? 0.0, -0.15, 0.1, 5, 1),
                        });

                        // // Отрисовываем ключевые точки целевой руки зелёным цветом без заливки
                        // drawingUtils.drawLandmarks(targetLandmarks, {
                        //     color: "#00FF00",
                        //     fillColor: "transparent",
                        //     lineWidth: 2,
                        //     radius: (data) => DrawingUtils.lerp(data.from?.z ?? 0.0, -0.15, 0.1, 5, 1),
                        // });

                        // Добавляем новую точку и соединение
                        if (landmarks.length >= 18) {
                            // Проверяем, что есть все нужные точки
                            const point0 = landmarks[0]; // Точка запястья
                            const point5 = landmarks[5]; // Точка большого пальца
                            const point17 = landmarks[17]; // Точка мизинца

                            // Находим середину между точками 5 и 17
                            const midPoint = {
                                x: (point5.x + point17.x) / 2,
                                y: (point5.y + point17.y) / 2,
                                z: (point5.z + point17.z) / 2,
                            };

                            // Создаем новую точку - пересечение линии из точки 0 с серединой линии 5-17
                            const newPoint = {
                                x: (point0.x + midPoint.x) / 2,
                                y: (point0.y + midPoint.y) / 2,
                                z: (point0.z + midPoint.z) / 2,
                            };

                            // Отрисовываем новую точку красным цветом
                            drawingUtils.drawLandmarks([midPoint], {
                                color: "#FF0000",
                                fillColor: "#FF0000",
                                lineWidth: 2,
                                radius: 5, // Больший радиус для лучшей видимости
                            });

                            // Отрисовываем соединение между точкой 0 и новой точкой
                            drawingUtils.drawConnectors([point0, midPoint], [{ start: 0, end: 1 }], {
                                color: "#FF0000",
                                lineWidth: 2,
                            });

                            drawingUtils.drawConnectors([landmarks[5], landmarks[17]], [{ start: 0, end: 1 }], {
                                color: "#FF0000",
                                lineWidth: 2,
                            });

                            if (targetHand === "left") {
                                drawingUtils.drawConnectors([landmarks[0], { x: landmarks[0].x + 100, y: landmarks[0].y, z: landmarks[0].z }], [{ start: 0, end: 1 }], {
                                    color: "#FF0000",
                                    lineWidth: 2,
                                });
                            } else {
                                drawingUtils.drawConnectors([landmarks[0], { x: 0, y: landmarks[0].y, z: landmarks[0].z }], [{ start: 0, end: 1 }], {
                                    color: "#FF0000",
                                    lineWidth: 2,
                                });
                            }
                        }

                        // Анализ движения кисти
                        if (exerciseData.analyzeFunction) {
                            exerciseData.analyzeFunction(landmarks);
                        }
                    }
                    canvasCtx.restore();
                } catch (error) {
                    console.log("try err");
                    console.error("Hand Landmarker error:", error);
                }
            } else {
                const poseLandmarker = poseLandmarkerRef.current;
                poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
                    canvasCtx.save();
                    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                    for (const landmark of result.landmarks) {
                        // Получаем данные текущего упражнения
                        const exerciseData = exercises[selectedExercise];

                        let targetConnections, targetIndices;

                        if (currentHandPhaseRef.current === "left" || currentHandPhaseRef.current === "right") {
                            // Анализируем одну руку
                            targetConnections = exerciseData.targetConnections[currentHandRef.current];
                            targetIndices = exerciseData.targetIndices[currentHandRef.current];
                        } else if (currentHandPhaseRef.current === "both") {
                            // Анализируем обе руки
                            targetConnections = [...exerciseData.targetConnections.left, ...exerciseData.targetConnections.right];
                            targetIndices = [...exerciseData.targetIndices.left, ...exerciseData.targetIndices.right];
                        }

                        if (!targetConnections || !Array.isArray(targetConnections)) {
                            console.error("targetConnections is undefined or not an array:", targetConnections);
                            continue;
                        }
                        // Создаем набор строковых представлений целевых соединений
                        const targetConnectionStrings = new Set(
                            targetConnections.map((conn) => {
                                const sortedIndices = [conn.start, conn.end].sort((a, b) => a - b);
                                return sortedIndices.join("-");
                            })
                        );

                        // Фильтруем соединения
                        const otherConnections = PoseLandmarker.POSE_CONNECTIONS.filter((conn) => {
                            const sortedIndices = [conn.start, conn.end].sort((a, b) => a - b);
                            const connString = sortedIndices.join("-");
                            return !targetConnectionStrings.has(connString);
                        });

                        // Отрисовываем остальные соединения белым цветом
                        drawingUtils.drawConnectors(landmark, otherConnections, { color: "#FFFFFF" });

                        // Отрисовываем соединения целевой руки зелёным цветом
                        drawingUtils.drawConnectors(landmark, targetConnections, { color: "#00FF00" });

                        // Разделяем ключевые точки на целевые и остальные
                        const targetLandmarks = landmark.filter((_, index) => targetIndices.includes(index));
                        const otherLandmarks = landmark.filter((_, index) => !targetIndices.includes(index));

                        // Отрисовываем остальные ключевые точки белым цветом без заливки
                        drawingUtils.drawLandmarks(otherLandmarks, {
                            color: "#FFFFFF",
                            fillColor: "transparent",
                            lineWidth: 2,
                            radius: (data) => {
                                return DrawingUtils.lerp(data.from?.z ?? 0.0, -0.15, 0.1, 5, 1);
                            },
                        });

                        // Отрисовываем ключевые точки целевой руки зелёным цветом без заливки
                        drawingUtils.drawLandmarks(targetLandmarks, {
                            color: "#00FF00",
                            fillColor: "transparent",
                            lineWidth: 2,
                            radius: (data) => {
                                return DrawingUtils.lerp(data.from?.z ?? 0.0, -0.15, 0.1, 5, 1);
                            },
                        });

                        // Вызываем функцию анализа движения для текущего упражнения
                        if (exerciseData.analyzeFunction) {
                            exerciseData.analyzeFunction(landmark);
                        }
                    }
                    canvasCtx.restore();
                });
            }
        }
        if (webcamRunning === true) {
            window.requestAnimationFrame(predictWebcam);
        }
    }

    function calculateAcceleration(currentVelocity, previousVelocity, deltaTime) {
        return deltaTime > 0 ? (currentVelocity - previousVelocity) / deltaTime : 0;
    }

    function analyzeWristCurl(landmark) {
        if (isCountingDownRef.current) {
            return;
        }

        const currentTime = performance.now();
        const timeInSeconds = currentTime / 1000;
        const handData = currentHandRef.current === "left" ? leftHandData.current : rightHandData.current;

        // Инициализация данных при первом вызове
        if (!handData.startTime) handData.startTime = timeInSeconds;
        handData.repetitions = handData.repetitions || [];
        handData.currentRepetition = handData.currentRepetition || null;
        // handData.lastTime = timeInSeconds;

        const point5 = landmark[5]; // Точка большого пальца
        const point17 = landmark[17]; // Точка мизинца

        // Находим середину между точками 5 и 17
        const midPoint = {
            x: (point5.x + point17.x) / 2,
            y: (point5.y + point17.y) / 2,
            z: (point5.z + point17.z) / 2,
        };

        // Получение ключевых точек
        let wrist, elbow, fingerTip;
        if (currentHandRef.current === "left") {
            wrist = landmark[0];
            elbow = { x: 0, y: landmark[0].y };
            fingerTip = midPoint;
        } else {
            wrist = landmark[0];
            elbow = { x: landmark[0].x + 100, y: landmark[0].y };
            fingerTip = midPoint;
        }

        // Расчет углов и параметров
        const angleWrist = calcAngle(elbow, wrist, fingerTip);
        // console.log("angleWrist: ", angleWrist, "; x: ", elbow.x);
        const horizontalAngle = calcAngle(wrist, elbow, { x: 0, y: elbow.y });
        const velocity = calculateAngularVelocity(angleWrist, handData.lastAngle || angleWrist, currentTime - (handData.lastTime || currentTime));

        const deltaTime = timeInSeconds - (handData.currentRepetition?.startTime || timeInSeconds);
        const acceleration = calculateAcceleration(velocity, handData.lastAngularVelocity || 0, deltaTime);

        const radius = calcForearmLength(fingerTip, wrist);
        const linearVelocity = ((velocity * Math.PI) / 180) * radius;

        handData.maxAngleWrist = Math.max(handData.maxAngleWrist, angleWrist);
        handData.minAngleWrist = Math.min(handData.minAngleWrist, angleWrist);
        handData.wristAmplitude = handData.maxAngleWrist - handData.minAngleWrist;

        // console.log("velocity: " + velocity);
        // console.log("current: " + movementPhaseRef.current);
        // console.log("angularVelocity: " + angularVelocity);
        // console.log("angleWrist: " + angleWrist);
        // console.log("horizontalAngle: " + horizontalAngle);

        if (handData.currentRepetition) {
            const relativeTime = timeInSeconds - handData.currentRepetition.startTime;
            handData.currentRepetition.angles.push({ time: relativeTime, angleWrist: angleWrist, horizontalAngle: horizontalAngle, maxAngleWrist: handData.maxAngleWrist });
            handData.currentRepetition.angularVelocities.push({ time: timeInSeconds, angularVelocity: velocity });
            handData.currentRepetition.linearVelocities.push({ time: timeInSeconds, linearVelocity: linearVelocity });
            handData.currentRepetition.accelerations.push({ time: timeInSeconds, acceleration: acceleration });
        }

        const angleThresholdUp = angleThresholds.up;
        const angleThresholdDown = angleThresholds.down;

        if (movementPhaseRef.current === "initial" && angleWrist > angleThresholdUp) {
            // console.log("velocity: " + velocity);
            // console.log("angleWrist: " + angleWrist);
            movementPhaseRef.current = "up";

            handData.currentRepetition = {
                type: "up",
                startTime: timeInSeconds,
                angles: [],
                velocities: [],
                angularVelocities: [],
                linearVelocities: [],
                accelerations: [],
                horizontalAngles: [],
                averageAcceleration: 0,
                endTime: null,
                upDuration: 0,
                downDuration: 0,
                duration: 0,
                counter: 0,
            };

            // const relativeTime = timeInSeconds - handData.currentRepetition.startTime;
            // handData.currentRepetition.angles.push({ time: relativeTime, angleWrist: angleWrist, horizontalAngle: horizontalAngle, maxAngleWrist: handData.maxShoulderAngle });
            // handData.currentRepetition.angularVelocities.push({ time: timeInSeconds, angularVelocity: velocity });
            // handData.currentRepetition.linearVelocities.push({ time: timeInSeconds, linearVelocity: linearVelocity });
            // handData.currentRepetition.accelerations.push({ time: timeInSeconds, acceleration: acceleration });
        } else if (movementPhaseRef.current === "up" && angleWrist < angleThresholdDown) {
            movementPhaseRef.current = "down";

            if (handData.currentRepetition) {
                handData.currentRepetition.endTime = timeInSeconds;
                handData.currentRepetition.duration = handData.currentRepetition.endTime - handData.currentRepetition.startTime;

                // Вычисляем среднее ускорение
                const accelerations = handData.currentRepetition.accelerations.map((a) => a.acceleration);
                const sumAcceleration = accelerations.reduce((acc, val) => acc + val, 0);
                const averageAcceleration = sumAcceleration / accelerations.length || 0;
                handData.currentRepetition.averageAcceleration = averageAcceleration;

                handData.repetitions.push(handData.currentRepetition);
                handData.currentRepetition = null;

                handData.counter += 1;
                document.getElementById("counter").innerHTML = `Количество повторений: ${handData.counter}`;

                if (handData.counter >= desiredRepsRef.current) {
                    // console.log("Переход к другой руке");
                    if (currentHandPhaseRef.current === initialHandRef.current) {
                        // Переходим к противоположной руке
                        handleArmSwitch();
                        // startCountdown();
                    } else if (currentHandPhaseRef.current === oppositeHand(initialHandRef.current)) {
                        currentHandPhaseRef.current = "finished";
                        setWebcamRunning(false);
                        displayResults();
                        // startCountdown();
                    }
                }
            }

            movementPhaseRef.current = "initial";
        }

        // Обновление предыдущих значений
        handData.lastTime = currentTime;
        handData.lastAngle = angleWrist;

        // // Обновление данных текущего повторения
        // const currentRep = handData.currentRepetition;

        // // Расчет угловой скорости
        // const angularVelocity = currentRep.angles.length > 0 ? (angleWrist - currentRep.angles[currentRep.angles.length - 1].angleWrist) / deltaTime : 0;

        // // Расчет линейной скорости
        // const forearmLength = calcForearmLength(elbow, wrist);
        // const linearVelocity = angularVelocity * (Math.PI / 180) * forearmLength;

        // // Расчет ускорения
        // const acceleration = currentRep.angularVelocities.length > 0 ? (angularVelocity - currentRep.angularVelocities[currentRep.angularVelocities.length - 1].angularVelocity) / deltaTime : 0;

        // // Запись данных в текущее повторение
        // currentRep.angles.push({
        //     time: timeInSeconds,
        //     angleWrist: angleWrist,
        //     maxWristAngle: Math.max(currentRep.maxWristAngle, angleWrist),
        // });

        // currentRep.angularVelocities.push({
        //     time: timeInSeconds,
        //     angularVelocity: angularVelocity,
        // });

        // currentRep.linearVelocities.push({
        //     time: timeInSeconds,
        //     linearVelocity: linearVelocity,
        // });

        // currentRep.accelerations.push({
        //     time: timeInSeconds,
        //     acceleration: acceleration,
        // });

        // // Логика определения завершения повторения
        // const angleThreshold = 30; // Пороговый угол для определения движения
        // if (angleWrist > angleThreshold && !currentRep.current) {
        //     currentRep.current = true;
        // } else if (angleWrist < angleThreshold && currentRep.current) {
        //     currentRep.current = false;
        //     currentRep.endTime = timeInSeconds;
        //     currentRep.duration = currentRep.endTime - currentRep.startTime;

        //     // Расчет среднего ускорения
        //     currentRep.averageAcceleration = currentRep.accelerations.reduce((sum, a) => sum + a.acceleration, 0) / currentRep.accelerations.length;

        //     // Сохранение повторения
        //     handData.repetitions.push(currentRep);
        //     handData.counter++;

        //     // Сброс текущего повторения
        //     handData.currentRepetition = null;

        //     if (handData.counter >= desiredRepsRef.current) {
        //         // Упражнение завершено
        //         currentRep.current = "finished";
        //         setWebcamRunning(false);
        //         displayResults();
        //     }
        // }

        // // Обновление интерфейса
        // document.getElementById("maxAngle").innerHTML = `Максимальный угол сгибания кисти: ${handData.maxWristAngle}°`;
        // document.getElementById("movementAmplitude").innerHTML = `Амплитуда движения: ${handData.wristAmplitude}°`;
        // document.getElementById("movementPhase").innerHTML = `Текущая фаза: ${movementPhaseRef.current}`;
    }

    function applyLowPassFilter(newValue, oldValue, factor = 0.3) {
        return oldValue ? oldValue * (1 - factor) + newValue * factor : newValue;
    }

    function calculateAngularVelocity(currentAngle, prevAngle, deltaTime) {
        return deltaTime > 0 ? (currentAngle - prevAngle) / (deltaTime / 1000) : 0;
    }

    function analyzeBothArms(handData, landmark, currentTime, timeInSeconds) {
        // Левые конечности
        let shoulderLeft = landmark[11];
        let elbowLeft = landmark[13];
        let wristLeft = landmark[15];
        let hipLeft = landmark[23];
        // Правые конечности
        let shoulderRight = landmark[12];
        let elbowRight = landmark[14];
        let wristRight = landmark[16];
        let hipRight = landmark[24];

        let lastElbow = elbowRight;
        elbowRight.x = elbowRight.x - 2 * (elbowRight.x - shoulderRight.x);
        // Вычисляем углы
        const shoulderAngleLeft = calcAngle360(elbowLeft, shoulderLeft, hipLeft);
        const shoulderAngleRight = calcAngle360(elbowRight, shoulderRight, hipRight);
        elbowRight = lastElbow;
        const elbowAngleLeft = calcAngle(wristLeft, elbowLeft, shoulderLeft);
        const elbowAngleRight = calcAngle(wristRight, elbowRight, shoulderRight);

        // Обновляем максимальные и минимальные углы
        handData.maxShoulderAngleLeft = Math.max(handData.maxShoulderAngleLeft, shoulderAngleLeft);
        handData.minShoulderAngleLeft = Math.min(handData.minShoulderAngleLeft, shoulderAngleLeft);
        handData.shoulderAmplitudeLeft = handData.maxShoulderAngleLeft - handData.minShoulderAngleLeft;

        handData.maxShoulderAngleRight = Math.max(handData.maxShoulderAngleRight, shoulderAngleRight);
        handData.minShoulderAngleRight = Math.min(handData.minShoulderAngleRight, shoulderAngleRight);
        handData.shoulderAmplitudeRight = handData.maxShoulderAngleRight - handData.minShoulderAngleRight;

        // Вычисляем длину предплечья (радиус) для обеих рук
        const radiusLeft = calcForearmLength(shoulderLeft, elbowLeft);
        const radiusRight = calcForearmLength(shoulderRight, elbowRight);

        // Вычисляем угловые скорости и линейные скорости
        let shoulderAngularVelocityLeft = 0;
        let shoulderAngularVelocityRight = 0;
        let linearVelocityLeft = 0;
        let linearVelocityRight = 0;
        let accelerationLeft = 0;
        let accelerationRight = 0;

        if (handData.lastShoulderAngleLeft !== null && handData.lastTime !== null && handData.lastLinearVelocityLeft !== null) {
            const deltaTime = (currentTime - handData.lastTime) / 1000;
            const deltaAngleLeft = shoulderAngleLeft - handData.lastShoulderAngleLeft;
            shoulderAngularVelocityLeft = deltaAngleLeft / deltaTime;
            linearVelocityLeft = ((shoulderAngularVelocityLeft * Math.PI) / 180) * radiusLeft;
            const deltaLinearVelocityLeft = linearVelocityLeft - handData.lastLinearVelocityLeft;
            accelerationLeft = deltaLinearVelocityLeft / deltaTime;
        }
        if (handData.lastShoulderAngleRight !== null && handData.lastTime !== null && handData.lastLinearVelocityRight !== null) {
            const deltaTime = (currentTime - handData.lastTime) / 1000;
            const deltaAngleRight = shoulderAngleRight - handData.lastShoulderAngleRight;
            shoulderAngularVelocityRight = deltaAngleRight / deltaTime;
            linearVelocityRight = ((shoulderAngularVelocityRight * Math.PI) / 180) * radiusRight;
            const deltaLinearVelocityRight = linearVelocityRight - handData.lastLinearVelocityRight;
            accelerationRight = deltaLinearVelocityRight / deltaTime;
        }

        // Сохраняем данные
        if (handData.currentRepetition) {
            const relativeTime = timeInSeconds - handData.currentRepetition.startTime;
            handData.currentRepetition.anglesLeft.push({ time: relativeTime, shoulderAngle: shoulderAngleLeft, elbowAngleLeft: elbowAngleLeft, maxShoulderAngleLeft: handData.maxShoulderAngleLeft });
            handData.currentRepetition.anglesRight.push({ time: relativeTime, shoulderAngle: shoulderAngleRight, elbowAngleRight: elbowAngleRight, maxShoulderAngleRight: handData.maxShoulderAngleRight });
            handData.currentRepetition.angularVelocitiesLeft.push({ time: timeInSeconds, angularVelocity: Math.abs(shoulderAngularVelocityLeft) });
            handData.currentRepetition.angularVelocitiesRight.push({ time: timeInSeconds, angularVelocity: Math.abs(shoulderAngularVelocityRight) });
            handData.currentRepetition.linearVelocitiesLeft = handData.currentRepetition.linearVelocitiesLeft || [];
            handData.currentRepetition.linearVelocitiesLeft.push({
                time: timeInSeconds,
                linearVelocity: linearVelocityLeft,
            });
            handData.currentRepetition.linearVelocitiesRight = handData.currentRepetition.linearVelocitiesRight || [];
            handData.currentRepetition.linearVelocitiesRight.push({
                time: timeInSeconds,
                linearVelocity: linearVelocityRight,
            });
            handData.currentRepetition.accelerationsLeft = handData.currentRepetition.accelerationsLeft || [];
            handData.currentRepetition.accelerationsLeft.push({
                time: timeInSeconds,
                acceleration: accelerationLeft,
            });
            handData.currentRepetition.accelerationsRight = handData.currentRepetition.accelerationsRight || [];
            handData.currentRepetition.accelerationsRight.push({
                time: timeInSeconds,
                acceleration: accelerationRight,
            });

            if (lBaselineShoulderYRef.current !== null && rBaselineShoulderYRef.current !== null) {
                // Считываем текущие координаты ключевых точек
                const lShoulder = landmark[11];
                const rShoulder = landmark[12];
                const lEar = landmark[7];
                const rEar = landmark[8];
                const lMouth = landmark[9]; // Верхняя губа
                const rMouth = landmark[10]; // Нижняя губа

                // 2.2 Находим среднюю координату по оси X между точками рта
                const mouthX = (lMouth.x + rMouth.x) / 2;

                // 2.3 Рассчитываем модули разностей по оси X
                const lShoulderMouthDif = Math.abs(lShoulder.x - mouthX);
                const rShoulderMouthDif = Math.abs(rShoulder.x - mouthX);
                const lEarMouthDif = Math.abs(lEar.x - mouthX);
                const rEarMouthDif = Math.abs(rEar.x - mouthX);

                // 2.4 Рассчитываем разницу между базовыми и текущими значениями по оси Y для плеч
                const lBaselineDif = Math.abs(lBaselineShoulderYRef.current - lShoulder.y);
                const rBaselineDif = Math.abs(rBaselineShoulderYRef.current - rShoulder.y);

                // 2.5 Сравниваем разницы между левыми и правыми точками
                const shouldersMouthDif = Math.abs(lShoulderMouthDif - rShoulderMouthDif);
                const earsMouthDif = Math.abs(lEarMouthDif - rEarMouthDif);

                // 2.6 Определяем тип ошибки
                let error = null;
                if ((lBaselineDif > 0.03 || rBaselineDif > 0.03) && shouldersMouthDif < 0.01) {
                    error = "подъём плеча";
                } else if (earsMouthDif > 0.03) {
                    error = "наклон головы";
                } else if (shouldersMouthDif > 0.045 && earsMouthDif > 0.02) {
                    error = "наклон тела";
                }

                // Сохраняем ошибку, если она обнаружена
                if (error) {
                    handData.currentRepetition.errors.push({
                        time: timeInSeconds,
                        errorType: error,
                    });
                }
            }
        }

        // Обновляем последние значения
        handData.lastShoulderAngleLeft = shoulderAngleLeft;
        handData.lastShoulderAngleRight = shoulderAngleRight;
        handData.lastLinearVelocityRight = linearVelocityLeft;
        handData.lastLinearVelocityRight = linearVelocityRight;
        handData.lastTime = currentTime;

        // Логика фаз движения
        const angleThresholdUp = angleThresholds.up;
        const angleThresholdDown = angleThresholds.down;

        if (movementPhaseRef.current === "initial" && shoulderAngleLeft > angleThresholdUp && shoulderAngleRight > angleThresholdUp) {
            movementPhaseRef.current = "подъём";
            movementPhases.push(movementPhaseRef.current);

            handData.currentRepetition = {
                startTime: timeInSeconds,
                anglesLeft: [],
                anglesRight: [],
                angularVelocitiesLeft: [],
                angularVelocitiesRight: [],
                linearVelocitiesLeft: [],
                linearVelocitiesRight: [],
                accelerationsLeft: [],
                accelerationsRight: [],
                errors: [],
                endTime: null,
                duration: null,
                averageAccelerationLeft: null,
                averageAccelerationRight: null,
            };

            const relativeTime = timeInSeconds - handData.currentRepetition.startTime;
            handData.currentRepetition.anglesLeft.push({ time: relativeTime, shoulderAngle: shoulderAngleLeft, elbowAngleLeft: elbowAngleLeft, maxShoulderAngleLeft: handData.maxShoulderAngleLeft });
            handData.currentRepetition.anglesRight.push({ time: relativeTime, shoulderAngle: shoulderAngleRight, elbowAngleRight: elbowAngleRight, maxShoulderAngleRight: handData.maxShoulderAngleRight });
            handData.currentRepetition.angularVelocitiesLeft.push({ time: timeInSeconds, angularVelocity: Math.abs(shoulderAngularVelocityLeft) });
            handData.currentRepetition.angularVelocitiesRight.push({ time: timeInSeconds, angularVelocity: Math.abs(shoulderAngularVelocityRight) });
            handData.currentRepetition.linearVelocitiesLeft = handData.currentRepetition.linearVelocitiesLeft || [];
            handData.currentRepetition.linearVelocitiesLeft.push({
                time: timeInSeconds,
                linearVelocity: linearVelocityLeft,
            });
            handData.currentRepetition.linearVelocitiesRight = handData.currentRepetition.linearVelocitiesRight || [];
            handData.currentRepetition.linearVelocitiesRight.push({
                time: timeInSeconds,
                linearVelocity: linearVelocityRight,
            });
            handData.currentRepetition.accelerationsLeft = handData.currentRepetition.accelerationsLeft || [];
            handData.currentRepetition.accelerationsLeft.push({
                time: timeInSeconds,
                acceleration: accelerationLeft,
            });
            handData.currentRepetition.accelerationsRight = handData.currentRepetition.accelerationsRight || [];
            handData.currentRepetition.accelerationsRight.push({
                time: timeInSeconds,
                acceleration: accelerationRight,
            });

            if (lBaselineShoulderYRef.current !== null && rBaselineShoulderYRef.current !== null) {
                // Считываем текущие координаты ключевых точек
                const lShoulder = landmark[11];
                const rShoulder = landmark[12];
                const lEar = landmark[7];
                const rEar = landmark[8];
                const lMouth = landmark[9]; // Верхняя губа
                const rMouth = landmark[10]; // Нижняя губа

                // 2.2 Находим среднюю координату по оси X между точками рта
                const mouthX = (lMouth.x + rMouth.x) / 2;

                // 2.3 Рассчитываем модули разностей по оси X
                const lShoulderMouthDif = Math.abs(lShoulder.x - mouthX);
                const rShoulderMouthDif = Math.abs(rShoulder.x - mouthX);
                const lEarMouthDif = Math.abs(lEar.x - mouthX);
                const rEarMouthDif = Math.abs(rEar.x - mouthX);

                // 2.4 Рассчитываем разницу между базовыми и текущими значениями по оси Y для плеч
                const lBaselineDif = Math.abs(lBaselineShoulderYRef.current - lShoulder.y);
                const rBaselineDif = Math.abs(rBaselineShoulderYRef.current - rShoulder.y);

                // 2.5 Сравниваем разницы между левыми и правыми точками
                const shouldersMouthDif = Math.abs(lShoulderMouthDif - rShoulderMouthDif);
                const earsMouthDif = Math.abs(lEarMouthDif - rEarMouthDif);

                // 2.6 Определяем тип ошибки
                let error = null;
                if ((lBaselineDif > 0.03 || rBaselineDif > 0.03) && shouldersMouthDif < 0.01) {
                    error = "подъём плеча";
                } else if (earsMouthDif > 0.03) {
                    error = "наклон головы";
                } else if (shouldersMouthDif > 0.045 && earsMouthDif > 0.02) {
                    error = "наклон тела";
                }

                // Сохраняем ошибку, если она обнаружена
                if (error) {
                    handData.currentRepetition.errors.push({
                        time: timeInSeconds,
                        errorType: error,
                    });
                }
            }
        } else if (movementPhaseRef.current === "подъём" && shoulderAngleLeft < angleThresholdDown && shoulderAngleRight < angleThresholdDown) {
            movementPhaseRef.current = "опускание";
            movementPhases.push(movementPhaseRef.current);

            if (handData.currentRepetition) {
                handData.currentRepetition.endTime = timeInSeconds;
                handData.currentRepetition.duration = handData.currentRepetition.endTime - handData.currentRepetition.startTime;

                // Среднее ускорение для левой руки
                const accelerationsLeft = handData.currentRepetition.accelerationsLeft.map((a) => a.acceleration);
                const sumAccelerationLeft = accelerationsLeft.reduce((acc, val) => acc + val, 0);
                const averageAccelerationLeft = sumAccelerationLeft / accelerationsLeft.length || 0;
                handData.currentRepetition.averageAccelerationLeft = averageAccelerationLeft;

                // Среднее ускорение для правой руки
                const accelerationsRight = handData.currentRepetition.accelerationsRight.map((a) => a.acceleration);
                const sumAccelerationRight = accelerationsRight.reduce((acc, val) => acc + val, 0);
                const averageAccelerationRight = sumAccelerationRight / accelerationsRight.length || 0;
                handData.currentRepetition.averageAccelerationRight = averageAccelerationRight;

                handData.currentRepetition.anglesLeft.pop()
                handData.currentRepetition.accelerationsLeft.pop()
                handData.currentRepetition.angularVelocitiesLeft.pop()
                handData.currentRepetition.linearVelocitiesLeft.pop()
                handData.currentRepetition.anglesRight.pop()
                handData.currentRepetition.accelerationsRight.pop()
                handData.currentRepetition.angularVelocitiesRight.pop()
                handData.currentRepetition.linearVelocitiesRight.pop()
                handData.repetitions.push(handData.currentRepetition);
                handData.currentRepetition = null;

                handData.counter += 1;
                document.getElementById("counter").innerHTML = `Количество повторений: ${handData.counter}`;

                if (handData.counter >= desiredRepsRef.current) {
                    // Упражнение завершено
                    currentHandPhaseRef.current = "finished";
                    setWebcamRunning(false);
                    displayResults();
                }
            }

            movementPhaseRef.current = "initial";
        }
    }

    function analyzeSingleArm(handData, landmark, hand, currentTime, timeInSeconds) {
        if (isCountingDownRef.current) {
            return;
        }

        let shoulder, elbow, wrist, hip;
        if (hand === "left") {
            shoulder = landmark[11];
            elbow = landmark[13];
            wrist = landmark[15];
            hip = landmark[23];
        } else {
            shoulder = landmark[12];
            elbow = landmark[14];
            wrist = landmark[16];
            hip = landmark[24];
        }

        let lastElbow = elbow;
        if (hand === "right") {
            elbow.x = elbow.x - 2 * (elbow.x - shoulder.x);
        }
        const shoulderAngle = calcAngle360(elbow, shoulder, { x: shoulder.x, y: 10000 });
        if (hand === "right") {
            elbow = lastElbow;
        }
        const elbowAngle = calcAngle(wrist, elbow, shoulder);

        // Обновляем максимальные и минимальные углы
        handData.maxShoulderAngle = Math.max(handData.maxShoulderAngle, shoulderAngle);
        handData.minShoulderAngle = Math.min(handData.minShoulderAngle, shoulderAngle);
        handData.shoulderAmplitude = handData.maxShoulderAngle - handData.minShoulderAngle;

        // Вычисляем длину предплечья (радиус)
        const radius = calcForearmLength(shoulder, elbow);
        // Вычисляем угловую скорость
        let shoulderAngularVelocity = 0;
        let linearVelocity = 0;
        let acceleration = 0;

        if (handData.lastShoulderAngle !== null && handData.lastTime !== null && handData.lastLinearVelocity !== null) {
            const deltaTime = (currentTime - handData.lastTime) / 1000;
            const deltaAngle = shoulderAngle - handData.lastShoulderAngle;
            shoulderAngularVelocity = deltaAngle / deltaTime;

            // Линейная скорость: V = ω * r (преобразуем угловую скорость в радианы/с)
            linearVelocity = ((shoulderAngularVelocity * Math.PI) / 180) * radius;

            // Ускорение: a = ΔV / Δt
            const deltaLinearVelocity = linearVelocity - handData.lastLinearVelocity;
            acceleration = deltaLinearVelocity / deltaTime;
        }

        // Сохраняем данные
        if (handData.currentRepetition) {
            handData.currentRepetition.shoulderLeftСoord.push({ x: landmark[11].x, y: landmark[11].y, z: landmark[11].z })
            handData.currentRepetition.shoulderRightСoord.push({ x: landmark[12].x, y: landmark[12].y, z: landmark[12].z })
            const relativeTime = timeInSeconds - handData.currentRepetition.startTime;
            handData.currentRepetition.angles.push({ time: relativeTime, elbowAngle: elbowAngle, shoulderAngle: shoulderAngle, maxShoulderAngle: handData.maxShoulderAngle });
            handData.currentRepetition.angularVelocities.push({ time: timeInSeconds, angularVelocity: Math.abs(shoulderAngularVelocity) });
            handData.currentRepetition.linearVelocities = handData.currentRepetition.linearVelocities || [];
            handData.currentRepetition.linearVelocities.push({
                time: timeInSeconds,
                linearVelocity: linearVelocity,
            });
            handData.currentRepetition.accelerations = handData.currentRepetition.accelerations || [];
            handData.currentRepetition.accelerations.push({
                time: timeInSeconds,
                acceleration: acceleration,
            });
            // Проверяем, что базовые координаты установлены
            if (lBaselineShoulderYRef.current !== null && rBaselineShoulderYRef.current !== null) {
                // Считываем текущие координаты ключевых точек
                const lShoulder = landmark[11];
                const rShoulder = landmark[12];
                const lEar = landmark[7];
                const rEar = landmark[8];
                const lMouth = landmark[9]; // Верхняя губа
                const rMouth = landmark[10]; // Нижняя губа

                // 2.2 Находим среднюю координату по оси X между точками рта
                const mouthX = (lMouth.x + rMouth.x) / 2;

                // 2.3 Рассчитываем модули разностей по оси X
                const lShoulderMouthDif = Math.abs(lShoulder.x - mouthX);
                const rShoulderMouthDif = Math.abs(rShoulder.x - mouthX);
                const lEarMouthDif = Math.abs(lEar.x - mouthX);
                const rEarMouthDif = Math.abs(rEar.x - mouthX);

                // 2.4 Рассчитываем разницу между базовыми и текущими значениями по оси Y для плеч
                const lBaselineDif = Math.abs(lBaselineShoulderYRef.current - lShoulder.y);
                const rBaselineDif = Math.abs(rBaselineShoulderYRef.current - rShoulder.y);

                // 2.5 Сравниваем разницы между левыми и правыми точками
                const shouldersMouthDif = Math.abs(lShoulderMouthDif - rShoulderMouthDif);
                const earsMouthDif = Math.abs(lEarMouthDif - rEarMouthDif);

                // 2.6 Определяем тип ошибки
                let error = null;
                if ((lBaselineDif > 0.03 || rBaselineDif > 0.03) && shouldersMouthDif < 0.01) {
                    error = "подъём плеча";
                } else if (earsMouthDif > 0.03) {
                    error = "наклон головы";
                } else if (shouldersMouthDif > 0.045 && earsMouthDif > 0.02) {
                    error = "наклон тела";
                }

                // Сохраняем ошибку, если она обнаружена
                if (error) {
                    handData.currentRepetition.errors.push({
                        time: timeInSeconds,
                        errorType: error,
                    });
                }
            }
        }

        // Обновляем последние значения
        handData.lastShoulderAngle = shoulderAngle;
        handData.lastLinearVelocity = linearVelocity;
        handData.lastTime = currentTime;

        // Логика фаз движения
        const angleThresholdUp = angleThresholds.up;
        const angleThresholdDown = angleThresholds.down;

        if (movementPhaseRef.current === "initial" && shoulderAngle > angleThresholdUp) {
            movementPhaseRef.current = "подъём";
            movementPhases.push(movementPhaseRef.current);

            handData.currentRepetition = {
                startTime: timeInSeconds,
                angles: [],
                shoulderLeftСoord: [],
                shoulderRightСoord: [],
                angularVelocities: [],
                linearVelocities: [],
                accelerations: [],
                errors: [],
                endTime: null,
                duration: null,
                averageAcceleration: null,
            };

            handData.currentRepetition.shoulderLeftСoord.push({ x: landmark[11].x, y: landmark[11].y, z: landmark[11].z })
            handData.currentRepetition.shoulderRightСoord.push({ x: landmark[12].x, y: landmark[12].y, z: landmark[12].z })
            const relativeTime = timeInSeconds - handData.currentRepetition.startTime;
            handData.currentRepetition.angles.push({ time: relativeTime, elbowAngle: elbowAngle, shoulderAngle: shoulderAngle, maxShoulderAngle: handData.maxShoulderAngle });
            handData.currentRepetition.angularVelocities.push({ time: timeInSeconds, angularVelocity: Math.abs(shoulderAngularVelocity) });
            handData.currentRepetition.linearVelocities = handData.currentRepetition.linearVelocities || [];
            handData.currentRepetition.linearVelocities.push({
                time: timeInSeconds,
                linearVelocity: linearVelocity,
            });
            handData.currentRepetition.accelerations = handData.currentRepetition.accelerations || [];
            handData.currentRepetition.accelerations.push({
                time: timeInSeconds,
                acceleration: acceleration,
            });
            // Проверяем, что базовые координаты установлены
            if (lBaselineShoulderYRef.current !== null && rBaselineShoulderYRef.current !== null) {
                // Считываем текущие координаты ключевых точек
                const lShoulder = landmark[11];
                const rShoulder = landmark[12];
                const lEar = landmark[7];
                const rEar = landmark[8];
                const lMouth = landmark[9]; // Верхняя губа
                const rMouth = landmark[10]; // Нижняя губа

                // 2.2 Находим среднюю координату по оси X между точками рта
                const mouthX = (lMouth.x + rMouth.x) / 2;

                // 2.3 Рассчитываем модули разностей по оси X
                const lShoulderMouthDif = Math.abs(lShoulder.x - mouthX);
                const rShoulderMouthDif = Math.abs(rShoulder.x - mouthX);
                const lEarMouthDif = Math.abs(lEar.x - mouthX);
                const rEarMouthDif = Math.abs(rEar.x - mouthX);

                // 2.4 Рассчитываем разницу между базовыми и текущими значениями по оси Y для плеч
                const lBaselineDif = Math.abs(lBaselineShoulderYRef.current - lShoulder.y);
                const rBaselineDif = Math.abs(rBaselineShoulderYRef.current - rShoulder.y);

                // 2.5 Сравниваем разницы между левыми и правыми точками
                const shouldersMouthDif = Math.abs(lShoulderMouthDif - rShoulderMouthDif);
                const earsMouthDif = Math.abs(lEarMouthDif - rEarMouthDif);

                // 2.6 Определяем тип ошибки
                let error = null;
                if ((lBaselineDif > 0.03 || rBaselineDif > 0.03) && shouldersMouthDif < 0.01) {
                    error = "подъём плеча";
                } else if (earsMouthDif > 0.03) {
                    error = "наклон головы";
                } else if (shouldersMouthDif > 0.045 && earsMouthDif > 0.02) {
                    error = "наклон тела";
                }

                // Сохраняем ошибку, если она обнаружена
                if (error) {
                    handData.currentRepetition.errors.push({
                        time: timeInSeconds,
                        errorType: error,
                    });
                }
            }
        } else if (movementPhaseRef.current === "подъём" && shoulderAngle < angleThresholdDown) {
            movementPhaseRef.current = "опускание";
            movementPhases.push(movementPhaseRef.current);

            if (handData.currentRepetition) {
                handData.currentRepetition.endTime = timeInSeconds;
                handData.currentRepetition.duration = handData.currentRepetition.endTime - handData.currentRepetition.startTime;

                // Вычисляем среднее ускорение
                const accelerations = handData.currentRepetition.accelerations.map((a) => a.acceleration);
                const sumAcceleration = accelerations.reduce((acc, val) => acc + val, 0);
                const averageAcceleration = sumAcceleration / accelerations.length || 0;
                handData.currentRepetition.averageAcceleration = averageAcceleration;
                
                handData.currentRepetition.angles.pop()
                handData.currentRepetition.accelerations.pop()
                handData.currentRepetition.angularVelocities.pop()
                handData.currentRepetition.linearVelocities.pop()
                handData.currentRepetition.shoulderLeftСoord.pop()
                handData.currentRepetition.shoulderRightСoord.pop()
                handData.repetitions.push(handData.currentRepetition);
                handData.currentRepetition = null;

                handData.counter += 1;
                document.getElementById("counter").innerHTML = `Количество повторений: ${handData.counter}`;

                if (handData.counter >= desiredRepsRef.current) {
                    if (currentHandPhaseRef.current === initialHandRef.current) {
                        // Переходим к противоположной руке
                        const opposite = oppositeHand(initialHandRef.current);
                        currentHandPhaseRef.current = opposite;
                        currentHandRef.current = opposite;
                        setCurrentHand(opposite);
                        resetScenario();
                        // startCountdown();
                    } else if (currentHandPhaseRef.current === oppositeHand(initialHandRef.current)) {
                        // Переходим к обеим рукам
                        currentHandPhaseRef.current = "both";
                        currentHandRef.current = "both";
                        setCurrentHand("both");
                        resetScenario();
                        // startCountdown();
                    }
                }
            }

            movementPhaseRef.current = "initial";
        }
    }

    function analyzeArmRaise(landmark) {
        const currentTime = performance.now();
        const timeInSeconds = currentTime / 1000;

        if (currentHandPhaseRef.current === "left" || currentHandPhaseRef.current === "right") {
            // Анализ одной руки
            const handData = currentHandRef.current === "left" ? leftHandData.current : rightHandData.current;
            analyzeSingleArm(handData, landmark, currentHandRef.current, currentTime, timeInSeconds);
        } else if (currentHandPhaseRef.current === "both") {
            // Анализ обеих рук
            const handData = bothHandsData.current;
            analyzeBothArms(handData, landmark, currentTime, timeInSeconds);
        }
    }

    function calcForearmLength(shoulder, elbow) {
        const deltaX = shoulder.x - elbow.x;
        const deltaY = shoulder.y - elbow.y;
        const deltaZ = (shoulder.z || 0) - (elbow.z || 0);

        return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    }

    function calculatePhases(repetitions) {
        return repetitions
            .map((rep, index) => {
                const angles = rep.angles; // Массив замеров углов в повторении
                if (!angles || angles.length === 0) {
                    return null;
                }

                // Находим максимальный угол в повторении
                const maxAngle = Math.max(...angles.map((a) => a.shoulderAngle));
                const loweringThreshold = maxAngle;

                let upPhaseStartTime = angles[0].time;
                let upPhaseEndTime = null;
                let downPhaseStartTime = null;
                let downPhaseEndTime = angles[angles.length - 1].time;

                for (let i = 0; i < angles.length; i++) {
                    const angleData = angles[i];
                    const angle = angleData.shoulderAngle;

                    // Ищем момент перехода из фазы подъёма в фазу опускания
                    if (angle >= loweringThreshold && !upPhaseEndTime) {
                        upPhaseEndTime = angleData.time;
                        downPhaseStartTime = angleData.time;
                        break;
                    }
                }

                // Если фаза опускания не была найдена, устанавливаем конец фазы подъёма в конец повторения
                if (!upPhaseEndTime) {
                    upPhaseEndTime = angles[angles.length - 1].time;
                    downPhaseStartTime = upPhaseEndTime;
                }

                const upPhaseDuration = upPhaseEndTime - upPhaseStartTime;
                const downPhaseDuration = downPhaseEndTime - downPhaseStartTime;
                const totalDuration = upPhaseDuration + downPhaseDuration;

                // Рассчитываем проценты
                const upPhasePercentage = (upPhaseDuration / totalDuration) * 100;
                const downPhasePercentage = (downPhaseDuration / totalDuration) * 100;

                return {
                    repetition: index + 1,
                    upPhasePercentage,
                    downPhasePercentage,
                };
            })
            .filter((rep) => rep !== null);
    }

    function calculatePhasesWrist(repetitions) {
        return repetitions
            .map((rep, index) => {
                const angles = rep.angles; // Массив замеров углов в повторении
                if (!angles || angles.length === 0) {
                    return null;
                }

                // Находим максимальный угол в повторении
                const minAngle = Math.min(...angles.map((a) => a.angleWrist));
                const loweringThreshold = minAngle;

                let upPhaseStartTime = angles[0].time;
                let upPhaseEndTime = null;
                let downPhaseStartTime = null;
                let downPhaseEndTime = angles[angles.length - 1].time;

                for (let i = 0; i < angles.length; i++) {
                    const angleData = angles[i];
                    const angle = angleData.angleWrist;

                    // Ищем момент перехода из фазы подъёма в фазу опускания
                    if (angle <= loweringThreshold && !upPhaseEndTime) {
                        upPhaseEndTime = angleData.time;
                        downPhaseStartTime = angleData.time;
                        break;
                    }
                }

                // Если фаза опускания не была найдена, устанавливаем конец фазы подъёма в конец повторения
                if (!upPhaseEndTime) {
                    upPhaseEndTime = angles[angles.length - 1].time;
                    downPhaseStartTime = upPhaseEndTime;
                }

                const upPhaseDuration = upPhaseEndTime - upPhaseStartTime;
                const downPhaseDuration = downPhaseEndTime - downPhaseStartTime;
                const totalDuration = upPhaseDuration + downPhaseDuration;

                // Рассчитываем проценты
                const upPhasePercentage = (upPhaseDuration / totalDuration) * 100;
                const downPhasePercentage = (downPhaseDuration / totalDuration) * 100;

                return {
                    repetition: index + 1,
                    upPhasePercentage,
                    downPhasePercentage,
                };
            })
            .filter((rep) => rep !== null);
    }

    function calculatePhasesForBothHands(repetitions) {
        const leftPhases = [];
        const rightPhases = [];

        repetitions.forEach((rep, index) => {
            const anglesLeft = rep.anglesLeft;
            const anglesRight = rep.anglesRight;

            if (!anglesLeft || anglesLeft.length === 0 || !anglesRight || anglesRight.length === 0) {
                return;
            }

            // === Расчёт фаз для левой руки ===
            const maxAngleLeft = Math.max(...anglesLeft.map((a) => a.shoulderAngle));
            const loweringThresholdLeft = maxAngleLeft;

            let upPhaseStartTimeLeft = anglesLeft[0].time;
            let upPhaseEndTimeLeft = null;
            let downPhaseStartTimeLeft = null;
            let downPhaseEndTimeLeft = anglesLeft[anglesLeft.length - 1].time;

            for (let i = 0; i < anglesLeft.length; i++) {
                const angleData = anglesLeft[i];
                const angle = angleData.shoulderAngle;

                if (angle >= loweringThresholdLeft && !upPhaseEndTimeLeft) {
                    upPhaseEndTimeLeft = angleData.time;
                    downPhaseStartTimeLeft = angleData.time;
                    break;
                }
            }

            if (!upPhaseEndTimeLeft) {
                upPhaseEndTimeLeft = anglesLeft[anglesLeft.length - 1].time;
                downPhaseStartTimeLeft = upPhaseEndTimeLeft;
            }

            const upPhaseDurationLeft = upPhaseEndTimeLeft - upPhaseStartTimeLeft;
            const downPhaseDurationLeft = downPhaseEndTimeLeft - downPhaseStartTimeLeft;
            const totalDurationLeft = upPhaseDurationLeft + downPhaseDurationLeft;

            const upPhasePercentageLeft = (upPhaseDurationLeft / totalDurationLeft) * 100;
            const downPhasePercentageLeft = (downPhaseDurationLeft / totalDurationLeft) * 100;

            leftPhases.push({
                repetition: index + 1,
                upPhasePercentage: upPhasePercentageLeft,
                downPhasePercentage: downPhasePercentageLeft,
            });

            // === Расчёт фаз для правой руки ===
            const maxAngleRight = Math.max(...anglesRight.map((a) => a.shoulderAngle));
            const loweringThresholdRight = maxAngleRight; // Используем 90% от максимального угла как порог

            let upPhaseStartTimeRight = anglesRight[0].time;
            let upPhaseEndTimeRight = null;
            let downPhaseStartTimeRight = null;
            let downPhaseEndTimeRight = anglesRight[anglesRight.length - 1].time;

            for (let i = 0; i < anglesRight.length; i++) {
                const angleData = anglesRight[i];
                const angle = angleData.shoulderAngle;

                if (angle >= loweringThresholdRight && !upPhaseEndTimeRight) {
                    upPhaseEndTimeRight = angleData.time;
                    downPhaseStartTimeRight = angleData.time;
                    break;
                }
            }

            if (!upPhaseEndTimeRight) {
                upPhaseEndTimeRight = anglesRight[anglesRight.length - 1].time;
                downPhaseStartTimeRight = upPhaseEndTimeRight;
            }

            const upPhaseDurationRight = upPhaseEndTimeRight - upPhaseStartTimeRight;
            const downPhaseDurationRight = downPhaseEndTimeRight - downPhaseStartTimeRight;
            const totalDurationRight = upPhaseDurationRight + downPhaseDurationRight;

            const upPhasePercentageRight = (upPhaseDurationRight / totalDurationRight) * 100;
            const downPhasePercentageRight = (downPhaseDurationRight / totalDurationRight) * 100;

            rightPhases.push({
                repetition: index + 1,
                upPhasePercentage: upPhasePercentageRight,
                downPhasePercentage: downPhasePercentageRight,
            });
        });

        return { leftPhases, rightPhases };
    }

    function displayResults() {
        const leftReps = leftHandData.current.repetitions;
        const rightReps = rightHandData.current.repetitions;
        const bothReps = bothHandsData.current.repetitions;

        if (!bothReps || !Array.isArray(bothReps) || bothReps.length === 0) {
            console.warn("No data for both hands repetitions.");
            setBothRepetitions([]);
        } else {
            setBothRepetitions(bothReps);
        }

        if (!leftReps || !Array.isArray(leftReps) || leftReps.length === 0) {
            console.warn("No data for left hand repetitions.");
            setLeftRepetitions([]);
        } else {
            setLeftRepetitions(leftReps);
        }

        if (!rightReps || !Array.isArray(rightReps) || rightReps.length === 0) {
            console.warn("No data for right hand repetitions.");
            setRightRepetitions([]);
        } else {
            setRightRepetitions(rightReps);
        }

        // Объявляем фазовые данные
        let tempLeftPhasesData = [];
        let tempRightPhasesData = [];
        let tempBothPhasesDataLeft = [];
        let tempBothPhasesDataRight = [];

        // Обрабатываем данные для левой руки
        if (leftReps && leftReps.length > 0) {
            let leftPhases = calculatePhases(leftReps);
            if (displayedExercise === "wrist_curl") {
                leftPhases = calculatePhasesWrist(leftReps);
            }
            tempLeftPhasesData = [...leftPhases];
            setLeftRepetitions(leftReps);
        } else {
            setLeftRepetitions([]);
        }

        // Обрабатываем данные для правой руки
        if (rightReps && rightReps.length > 0) {
            let rightPhases = calculatePhases(rightReps);
            if (displayedExercise === "wrist_curl") {
                rightPhases = calculatePhasesWrist(rightReps);
            }
            tempRightPhasesData = [...rightPhases];
            setRightRepetitions(rightReps);
        } else {
            setRightRepetitions([]);
        }

        // Обрабатываем данные для обеих рук
        if (bothReps && bothReps.length > 0) {
            const { leftPhases, rightPhases } = calculatePhasesForBothHands(bothReps);
            tempBothPhasesDataLeft = [...leftPhases];
            tempBothPhasesDataRight = [...rightPhases];
            setBothRepetitions(bothReps);
        } else {
            setBothRepetitions([]);
        }

        // Обновляем состояния фазовых данных
        setLeftPhasesData(tempLeftPhasesData);
        setRightPhasesData(tempRightPhasesData);
        setBothPhasesData({ left: tempBothPhasesDataLeft, right: tempBothPhasesDataRight });

        const results = {
            leftHand: leftHandData.current,
            rightHand: rightHandData.current,
            bothHands: bothHandsData.current,
        };

        const leftStats = leftHandData.current.repetitions.map((rep, index) => {
            const angularVelocities = rep.angularVelocities.map((av) => av.angularVelocity);
            const min = Math.min(...angularVelocities);
            const max = Math.max(...angularVelocities);
            const avg = angularVelocities.reduce((sum, val) => sum + val, 0) / angularVelocities.length;

            // Фильтруем положительные (подъем) и отрицательные (опускание) значения
            const positiveVelocities = angularVelocities.filter((v) => v > 0); // Подъем
            const negativeVelocities = angularVelocities.filter((v) => v < 0); // Опускание

            // Средние значения для подъема и опускания
            const avgUp = positiveVelocities.length > 0 ? positiveVelocities.reduce((sum, val) => sum + val, 0) / positiveVelocities.length : 0;
            const avgDown = negativeVelocities.length > 0 ? negativeVelocities.reduce((sum, val) => sum + val, 0) / negativeVelocities.length : 0;

            return {
                repetition: index + 1,
                min,
                max,
                avgDown,
                avgUp,
            };
        });
        setLeftHandStats(leftStats);

        const rightStats = rightHandData.current.repetitions.map((rep, index) => {
            const angularVelocities = rep.angularVelocities.map((av) => av.angularVelocity);
            const min = Math.min(...angularVelocities);
            const max = Math.max(...angularVelocities);
            const avg = angularVelocities.reduce((sum, val) => sum + val, 0) / angularVelocities.length;

            // Фильтруем положительные (подъем) и отрицательные (опускание) значения
            const positiveVelocities = angularVelocities.filter((v) => v > 0); // Подъем
            const negativeVelocities = angularVelocities.filter((v) => v < 0); // Опускание

            // Средние значения для подъема и опускания
            const avgUp = positiveVelocities.length > 0 ? positiveVelocities.reduce((sum, val) => sum + val, 0) / positiveVelocities.length : 0;
            const avgDown = negativeVelocities.length > 0 ? negativeVelocities.reduce((sum, val) => sum + val, 0) / negativeVelocities.length : 0;

            return {
                repetition: index + 1,
                min,
                max,
                avgDown,
                avgUp,
            };
        });
        setRightHandStats(rightStats);

        const bothStats = bothHandsData.current.repetitions.map((rep, index) => {
            const angularVelocitiesLeft = rep.angularVelocitiesLeft.map((av) => av.angularVelocity);
            const angularVelocitiesRight = rep.angularVelocitiesRight.map((av) => av.angularVelocity);

            const minLeft = Math.min(...angularVelocitiesLeft);
            const maxLeft = Math.max(...angularVelocitiesLeft);
            const avgLeft = angularVelocitiesLeft.reduce((sum, val) => sum + val, 0) / angularVelocitiesLeft.length;

            const minRight = Math.min(...angularVelocitiesRight);
            const maxRight = Math.max(...angularVelocitiesRight);
            const avgRight = angularVelocitiesRight.reduce((sum, val) => sum + val, 0) / angularVelocitiesRight.length;

            // Фильтруем положительные (подъем) и отрицательные (опускание) значения для левой руки
            const positiveVelocitiesLeft = angularVelocitiesLeft.filter((v) => v > 0); // Подъем
            const negativeVelocitiesLeft = angularVelocitiesLeft.filter((v) => v < 0); // Опускание

            // Средние значения для подъема и опускания (левая рука)
            const avgUpLeft = positiveVelocitiesLeft.length > 0 ? positiveVelocitiesLeft.reduce((sum, val) => sum + val, 0) / positiveVelocitiesLeft.length : 0;
            const avgDownLeft = negativeVelocitiesLeft.length > 0 ? negativeVelocitiesLeft.reduce((sum, val) => sum + val, 0) / negativeVelocitiesLeft.length : 0;

            // Фильтруем положительные (подъем) и отрицательные (опускание) значения для правой руки
            const positiveVelocitiesRight = angularVelocitiesRight.filter((v) => v > 0); // Подъем
            const negativeVelocitiesRight = angularVelocitiesRight.filter((v) => v < 0); // Опускание

            // Средние значения для подъема и опускания (правая рука)
            const avgUpRight = positiveVelocitiesRight.length > 0 ? positiveVelocitiesRight.reduce((sum, val) => sum + val, 0) / positiveVelocitiesRight.length : 0;
            const avgDownRight = negativeVelocitiesRight.length > 0 ? negativeVelocitiesRight.reduce((sum, val) => sum + val, 0) / negativeVelocitiesRight.length : 0;

            return {
                repetition: index + 1,
                left: {
                    min: minLeft,
                    max: maxLeft,
                    avgDown: avgDownLeft,
                    avgUp: avgUpLeft,
                },
                right: {
                    min: minRight,
                    max: maxRight,
                    avgDown: avgDownRight,
                    avgUp: avgUpRight,
                },
            };
        });
        setBothHandsStats(bothStats);

        clearCanvas();

        setShowCharts(true);
        setDisplayedExercise(selectedExercise);

        // // Преобразуем объект в JSON-строку
        // const jsonString = JSON.stringify(results, null, 2);

        // // Создаем Blob из JSON-строки
        // const blob = new Blob([jsonString], { type: "application/json" });

        // // Создаем ссылку для скачивания
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement("a");
        // a.href = url;
        // a.download = "exercise_results.json"; // Имя файла
        // document.body.appendChild(a);
        // a.click();

        // // Убираем ссылку из DOM
        // document.body.removeChild(a);
        // URL.revokeObjectURL(url);

        // Функция для отображения графиков и анализа данных после завершения упражнения
        console.log("Упражнение завершено. Анализ данных:");

        console.log("Левая рука:");
        console.log("Количество повторений:", leftHandData.current.counter);
        console.log("Данные повторений:", leftHandData.current.repetitions);

        console.log("Правая рука:");
        console.log("Количество повторений:", rightHandData.current.counter);
        console.log("Данные повторений:", rightHandData.current.repetitions);

        console.log("Подъем обеих рук:");
        console.log("Количество повторений:", bothHandsData.current.counter);
        console.log("Данные повторений:", bothHandsData.current.repetitions);
    }
    return (
        <div className="App">
            <div
                id="liveView"
                className="videoView"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    margin: "5% auto",
                    width: "640px",
                    gap: "1rem",
                }}
            >
                <button style={{ fontSize: "18px" }} id="webcamButton" className="mdc-button mdc-button--raised" onClick={enableCam} disabled={!isModelLoaded || webcamRunning ? false : !selectedHand}>
                    <span className="mdc-button__ripple" />
                    <span className="mdc-button__label">{webcamRunning ? "CLOSE WEBCAM" : "ENABLE WEBCAM"}</span>
                </button>
                {!isModelLoaded && <div>Загрузка модели, пожалуйста, подождите...</div>}
                <fieldset>
                    <legend style={{ fontSize: "26px" }}>Выберите начальную руку:</legend>
                    <div id="handSelection">
                        <input type="radio" id="leftHand" value="left" name="hand" checked={selectedHand === "left"} onChange={(e) => setSelectedHand(e.target.value)} disabled={webcamRunning} />
                        <label htmlFor="leftHand" style={{ fontSize: "20px" }}>
                            Левая рука
                        </label>

                        <input type="radio" id="rightHand" value="right" name="hand" checked={selectedHand === "right"} onChange={(e) => setSelectedHand(e.target.value)} disabled={webcamRunning} />
                        <label htmlFor="rightHand" style={{ fontSize: "20px" }}>
                            Правая рука
                        </label>
                    </div>
                </fieldset>
                <fieldset>
                    <legend style={{ fontSize: "26px" }}>Выберите упражнение:</legend>
                    <div id="exerciseSelection">
                        <input
                            type="radio"
                            id="radioArmRaise"
                            value="arm_raise"
                            name="exercise"
                            defaultChecked={selectedExercise === "arm_raise"}
                            onChange={(e) => {
                                setSelectedExercise("arm_raise");
                                resetScenario();
                                movementPhaseRef.current = "initial";
                                handUp = false;
                                setLeftRepetitions([]);
                                setRightRepetitions([]);
                                setBothRepetitions([]);
                                setShowCharts(false);
                                clearCanvas();
                                leftHandData.current = { counter: 0, repetitions: [], lastLinearVelocity: 0, currentRepetition: null, maxAngleWrist: 0, minAngleWrist: 0, wristAmplitude: 0, maxShoulderAngle: 0, minShoulderAngle: 180, shoulderAmplitude: 0, maxElbowAngle: 0, minElbowAngle: 180, elbowAmplitude: 0, movementPhases: [], cycleTimes: [], angularVelocities: [], lastShoulderAngle: null, lastElbowAngle: null, lastTime: null, startTime: null };
                                rightHandData.current = { counter: 0, repetitions: [], lastLinearVelocity: 0, currentRepetition: null, maxAngleWrist: 0, minAngleWrist: 0, wristAmplitude: 0, maxShoulderAngle: 0, minShoulderAngle: 180, shoulderAmplitude: 0, maxElbowAngle: 0, minElbowAngle: 180, elbowAmplitude: 0, movementPhases: [], cycleTimes: [], angularVelocities: [], lastShoulderAngle: null, lastElbowAngle: null, lastTime: null, startTime: null };
                            }}
                        />
                        <label htmlFor="radioArmRaise" style={{ fontSize: "20px" }}>
                            Поднятие руки в сторону
                        </label>

                        <input
                            type="radio"
                            id="radioWristCurl"
                            value="wrist_curl"
                            name="exercise"
                            defaultChecked={selectedExercise === "wrist_curl"}
                            onChange={(e) => {
                                setSelectedExercise("wrist_curl");
                                resetScenario();
                                movementPhaseRef.current = "initial";
                                handUp = false;
                                setLeftRepetitions([]);
                                setRightRepetitions([]);
                                setBothRepetitions([]);
                                setShowCharts(false);
                                clearCanvas();
                                leftHandData.current = { counter: 0, repetitions: [], lastLinearVelocity: 0, currentRepetition: null, maxAngleWrist: 0, minAngleWrist: 0, wristAmplitude: 0, maxShoulderAngle: 0, minShoulderAngle: 180, shoulderAmplitude: 0, maxElbowAngle: 0, minElbowAngle: 180, elbowAmplitude: 0, movementPhases: [], cycleTimes: [], angularVelocities: [], lastShoulderAngle: null, lastElbowAngle: null, lastTime: null, startTime: null };
                                rightHandData.current = { counter: 0, repetitions: [], lastLinearVelocity: 0, currentRepetition: null, maxAngleWrist: 0, minAngleWrist: 0, wristAmplitude: 0, maxShoulderAngle: 0, minShoulderAngle: 180, shoulderAmplitude: 0, maxElbowAngle: 0, minElbowAngle: 180, elbowAmplitude: 0, movementPhases: [], cycleTimes: [], angularVelocities: [], lastShoulderAngle: null, lastElbowAngle: null, lastTime: null, startTime: null };
                            }}
                        />
                        <label htmlFor="radioWristCurl" style={{ fontSize: "20px" }}>
                            Поднятие кисти
                        </label>

                        {/* Добавьте другие радиокнопки для других упражнений с уникальными ID и Value */}
                    </div>
                </fieldset>
                <fieldset>
                    <legend style={{ fontSize: "26px" }}>Настройки углов:</legend>
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                        <div>
                            <label htmlFor="angleThresholdUp" style={{ fontSize: "20px" }}>
                                Угол подъема (°):
                            </label>
                            <input
                                type="number"
                                id="angleThresholdUp"
                                value={angleThresholds.up}
                                min="1"
                                max="180"
                                style={{ fontSize: "20px", marginLeft: "0.5rem", width: "60px" }}
                                onChange={(e) =>
                                    setAngleThresholds((prev) => ({
                                        ...prev,
                                        up: parseInt(e.target.value) || 20,
                                    }))
                                }
                                disabled={webcamRunning}
                            />
                        </div>
                        <div>
                            <label htmlFor="angleThresholdDown" style={{ fontSize: "20px" }}>
                                Угол опускания (°):
                            </label>
                            <input
                                type="number"
                                id="angleThresholdDown"
                                value={angleThresholds.down}
                                min="1"
                                max="180"
                                style={{ fontSize: "20px", marginLeft: "0.5rem", width: "60px" }}
                                onChange={(e) =>
                                    setAngleThresholds((prev) => ({
                                        ...prev,
                                        down: parseInt(e.target.value) || 20,
                                    }))
                                }
                                disabled={webcamRunning}
                            />
                        </div>
                    </div>
                </fieldset>
                <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="repsInput" style={{ fontSize: "20px" }}>
                        Количество повторений:
                    </label>
                    <input
                        type="number"
                        id="repsInput"
                        defaultValue="5"
                        min="1"
                        style={{ fontSize: "20px", marginLeft: "0.5rem", width: "50px" }}
                        onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            setDesiredReps(value);
                            desiredRepsRef.current = value;
                            resetScenario();
                        }}
                    />
                </div>
                <div id="fpsCounter" style={{ fontSize: "26px" }}>
                    FPS:{" "}
                </div>
                <div style={{ width: "1280px", height: "960px", position: "relative" }}>
                    <video ref={videoRef} id="webcam" style={{ position: "absolute", top: "0", left: "0", transform: "scaleX(-1)" }} autoPlay playsInline />
                    <canvas ref={canvasRef} className="output_canvas" id="output_canvas" style={{ position: "absolute", top: "0", left: "0", transform: "scaleX(-1)" }} />
                </div>
                {isCountingDown && (
                    <div id="countdownTimer" style={{ fontSize: "30px", color: "red" }}>
                        Начало через: {countdown} секунд
                    </div>
                )}
                <div id="stats">
                    <div id="message" style={{ fontSize: "30px" }}>
                        {displayMessage}
                    </div>

                    <div id="counter" style={{ fontSize: "30px" }}>
                        Количество повторений: 0
                    </div>
                    <div id="maxAngle" style={{ fontSize: "20px" }}></div>
                    <div id="movementAmplitude" style={{ fontSize: "20px" }}></div>
                    <div id="cycleTime" style={{ fontSize: "20px" }}></div>
                    <div id="angularVelocity" style={{ fontSize: "20px" }}></div>
                    <div id="movementPhase" style={{ fontSize: "20px" }}></div>
                </div>
            </div>
            {showCharts && (
                <div>
                    {/* <button
                        onClick={() => exportChartsToPDF(".graph-container", "arm_raise_report")}
                        style={{
                            padding: "12px 24px",
                            fontSize: "18px",
                            margin: "20px 0",
                            backgroundColor: "#2196F3",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            transition: "all 0.3s ease",
                            ":hover": {
                                backgroundColor: "#1976D2",
                                transform: "translateY(-2px)",
                            },
                        }}
                    >📥 Сохранить отчёт в PDF
                    </button>

                    {/* Графики */}
                    {displayedExercise === "arm_raise" && <ArmRaiseCharts />}
                    {displayedExercise === "wrist_curl" && <WristCurlCharts />}
                    {/* Таблица для левой руки */}
                    <div style={{ overflowX: "auto", marginBottom: "30px" }}>
                        <h3>Левая рука</h3>
                        <table
                            style={{
                                borderCollapse: "collapse",
                                width: "100%",
                                maxWidth: "1000px",
                                fontSize: "14px",
                                margin: "0 auto",
                            }}
                        >
                            <thead>
                                <tr style={{ backgroundColor: "#f2f2f2" }}>
                                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Повторение</th>
                                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Max (°/s)</th>
                                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Avg (°/s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leftHandStats.map((stat, index) => (
                                    <tr key={index}>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.repetition}</td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.max.toFixed(2)}</td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.avgUp.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Таблица для правой руки */}
                    <div style={{ overflowX: "auto", marginBottom: "30px" }}>
                        <h3>Правая рука</h3>
                        <table
                            style={{
                                borderCollapse: "collapse",
                                width: "100%",
                                maxWidth: "1000px",
                                fontSize: "14px",
                                margin: "0 auto",
                            }}
                        >
                            <thead>
                                <tr style={{ backgroundColor: "#f2f2f2" }}>
                                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Повторение</th>
                                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Max (°/s)</th>
                                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Avg (°/s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rightHandStats.map((stat, index) => (
                                    <tr key={index}>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.repetition}</td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.max.toFixed(2)}</td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.avgUp.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Таблица для обеих рук */}
                    {bothHandsStats.length > 0 && (
                        <div style={{ overflowX: "auto", marginBottom: "30px" }}>
                            <h3>Обе руки</h3>
                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    width: "100%",
                                    maxWidth: "1000px",
                                    fontSize: "14px",
                                    margin: "0 auto",
                                }}
                            >
                                <thead>
                                    <tr style={{ backgroundColor: "#f2f2f2" }}>
                                        <th style={{ border: "1px solid #ddd", padding: "8px" }} rowSpan="2">
                                            Повторение
                                        </th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px" }} colSpan="2">
                                            Левая рука
                                        </th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px" }} colSpan="2">
                                            Правая рука
                                        </th>
                                    </tr>
                                    <tr style={{ backgroundColor: "#f2f2f2" }}>
                                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>Max (°/s)</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>Avg (°/s)</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>Max (°/s)</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>Avg (°/s)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bothHandsStats.map((stat, index) => (
                                        <tr key={index}>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.repetition}</td>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.left.max.toFixed(2)}</td>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.left.avgUp.toFixed(2)}</td>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.right.max.toFixed(2)}</td>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{stat.right.avgUp.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
