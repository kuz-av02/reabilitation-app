import "./App.css";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import React, { useRef, useState, useEffect } from "react";
import GraphSingleHand from "./GraphSingleHand";
import GraphBothHands from "./GraphBothHands";
import MovementPhaseChart from "./MovementPhaseChart";

function App() {
    const [desiredReps, setDesiredReps] = useState(5);
    const desiredRepsRef = useRef(5);
    const [selectedExercise, setSelectedExercise] = useState("arm_raise");
    const [webcamRunning, setWebcamRunning] = useState(false);
    const [isPoseLandmarkerLoaded, setIsPoseLandmarkerLoaded] = useState(false);
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

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

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

        // Устанавливаем размеры видео и канваса
        if (videoRef.current && canvasRef.current) {
            videoRef.current.width = 1280;
            videoRef.current.height = 960;
            canvasRef.current.width = 1280;
            canvasRef.current.height = 960;
            canvasCtxRef.current = canvasRef.current.getContext("2d");
            drawingUtilsRef.current = new DrawingUtils(canvasCtxRef.current);

            // После успешной инициализации poseLandmarker
            setIsPoseLandmarkerLoaded(true);
        } else {
            console.error("Video or Canvas element is not available.");
        }
    };

    useEffect(() => {
        return () => {
            // Очистка таймера при размонтировании
            clearInterval(timerIdRef.current);
        };
    }, []);

    // Управление видеопотоком при изменении состояния webcamRunning
    useEffect(() => {
        if (webcamRunning) {
            if (!isPoseLandmarkerLoaded) {
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
                const stream = video.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach((track) => track.stop());
                video.srcObject = null;
            }
        }
    }, [webcamRunning, isPoseLandmarkerLoaded]);

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

    const enableCam = () => {
        if (!isPoseLandmarkerLoaded) {
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
            startCountdown();
        } else {
            // Останавливаем упражнение
            setIsCountingDown(false);
            isCountingDownRef.current = false;
            setCountdown(5);
            setWebcamRunning(false);

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
        const startTimeMs = performance.now();
        poseLandmarkerRef.current.detectForVideo(video, startTimeMs, (result) => {
            if (result.landmarks && result.landmarks.length > 0) {
                const landmarks = result.landmarks[0];

                // Нормализуем координаты
                const lShoulder = landmarks[11];
                const rShoulder = landmarks[12];

                if (lShoulder && rShoulder) {
                    lBaselineShoulderYRef.current = lShoulder.y;
                    rBaselineShoulderYRef.current = rShoulder.y;
                    console.log("Baseline shoulders Y positions captured.");
                } else {
                    console.error("Shoulder landmarks not detected.");
                }
            } else {
                console.error("No pose landmarks detected.");
            }
        });
    };

    function calcAngle(p1, p2, p3) {
        const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
        let angle = Math.abs(radians * (180.0 / Math.PI));

        if (angle > 180.0) {
            angle = 360 - angle;
        }

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
            targetConnections: {
                left: [
                    { start: 15, end: 19 },
                    { start: 19, end: 21 },
                ],
                right: [
                    { start: 16, end: 20 },
                    { start: 20, end: 22 },
                ],
            },
            targetIndices: {
                left: [15, 17, 19, 21],
                right: [16, 18, 20, 22],
            },
            analyzeFunction: analyzeWristCurl,
        },
        // Добавьте другие упражнения по аналогии
    };

    async function predictWebcam() {
        if (!webcamRunning) {
            return;
        }

        const canvasElement = canvasRef.current;
        const video = videoRef.current;
        const poseLandmarker = poseLandmarkerRef.current;
        const canvasCtx = canvasCtxRef.current;
        const drawingUtils = drawingUtilsRef.current;

        if (!canvasElement || !video || !poseLandmarker || !canvasCtx || !drawingUtils) {
            console.error("One or more required elements are not available.");
            return;
        }

        let startTimeMs = performance.now();
        if (lastVideoTimeRef.current !== video.currentTime) {
            lastVideoTimeRef.current = video.currentTime;
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
        if (webcamRunning === true) {
            window.requestAnimationFrame(predictWebcam);
        }
    }

    function analyzeWristCurl(landmark) {
        const currentTime = performance.now();
        const handData = currentHandRef.current === "left" ? leftHandData.current : rightHandData.current;

        let wrist, elbow, shoulder;
        if (currentHandRef.current === "left") {
            wrist = landmark[15];
            elbow = landmark[13];
            shoulder = landmark[11];
        } else {
            wrist = landmark[16];
            elbow = landmark[14];
            shoulder = landmark[12];
        }

        const elbowAngle = calcAngle(wrist, elbow, shoulder);
        handData.maxElbowAngle = Math.max(handData.maxElbowAngle, elbowAngle);
        handData.minElbowAngle = Math.min(handData.minElbowAngle, elbowAngle);
        handData.elbowAmplitude = handData.maxElbowAngle - handData.minElbowAngle;

        // Логика фаз движения
        // ...

        // Обновление интерфейса
        document.getElementById("maxAngle").innerHTML = `Максимальный угол сгибания в локте: ${handData.maxElbowAngle.toFixed(2)}°`;
        document.getElementById("movementAmplitude").innerHTML = `Амплитуда движения: ${handData.elbowAmplitude.toFixed(2)}°`;
        document.getElementById("movementPhase").innerHTML = `Текущая фаза: ${movementPhaseRef.current}`;

        // Проверка завершения упражнения
        // ...
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

        // Вычисляем углы
        const shoulderAngleLeft = calcAngle(elbowLeft, shoulderLeft, hipLeft);
        const shoulderAngleRight = calcAngle(elbowRight, shoulderRight, hipRight);
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
            handData.currentRepetition.angularVelocitiesLeft.push({ time: timeInSeconds, angularVelocity: shoulderAngularVelocityLeft });
            handData.currentRepetition.angularVelocitiesRight.push({ time: timeInSeconds, angularVelocity: shoulderAngularVelocityRight });
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
        const angleThresholdUp = 30;
        const angleThresholdDown = 20;

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

        // Вычисляем углы
        const shoulderAngle = calcAngle(elbow, shoulder, hip);
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
            const relativeTime = timeInSeconds - handData.currentRepetition.startTime;
            handData.currentRepetition.angles.push({ time: relativeTime, elbowAngle: elbowAngle, shoulderAngle: shoulderAngle, maxShoulderAngle: handData.maxShoulderAngle });
            handData.currentRepetition.angularVelocities.push({ time: timeInSeconds, angularVelocity: shoulderAngularVelocity });
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
        const angleThresholdUp = 30;
        const angleThresholdDown = 20;

        if (movementPhaseRef.current === "initial" && shoulderAngle > angleThresholdUp) {
            movementPhaseRef.current = "подъём";
            movementPhases.push(movementPhaseRef.current);

            handData.currentRepetition = {
                startTime: timeInSeconds,
                angles: [],
                angularVelocities: [],
                linearVelocities: [],
                accelerations: [],
                errors: [],
                endTime: null,
                duration: null,
                averageAcceleration: null,
            };
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
        const deltaZ = (shoulder.z || 0) - (elbow.z || 0); // Проверяем на undefined

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
            const leftPhases = calculatePhases(leftReps);
            tempLeftPhasesData = [...leftPhases];
            setLeftRepetitions(leftReps);
        } else {
            setLeftRepetitions([]);
        }

        // Обрабатываем данные для правой руки
        if (rightReps && rightReps.length > 0) {
            const rightPhases = calculatePhases(rightReps);
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

            return {
                repetition: index + 1,
                min,
                max,
                avg,
            };
        });
        setLeftHandStats(leftStats);

        const rightStats = rightHandData.current.repetitions.map((rep, index) => {
            const angularVelocities = rep.angularVelocities.map((av) => av.angularVelocity);
            const min = Math.min(...angularVelocities);
            const max = Math.max(...angularVelocities);
            const avg = angularVelocities.reduce((sum, val) => sum + val, 0) / angularVelocities.length;

            return {
                repetition: index + 1,
                min,
                max,
                avg,
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

            return {
                repetition: index + 1,
                left: {
                    min: minLeft,
                    max: maxLeft,
                    avg: avgLeft,
                },
                right: {
                    min: minRight,
                    max: maxRight,
                    avg: avgRight,
                },
            };
        });
        setBothHandsStats(bothStats);

        setShowCharts(true);
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
                <button style={{ fontSize: "18px" }} id="webcamButton" className="mdc-button mdc-button--raised" onClick={enableCam} disabled={!isPoseLandmarkerLoaded || webcamRunning ? false : !selectedHand}>
                    <span className="mdc-button__ripple" />
                    <span className="mdc-button__label">{webcamRunning ? "CLOSE WEBCAM" : "ENABLE WEBCAM"}</span>
                </button>
                {!isPoseLandmarkerLoaded && <div>Загрузка модели, пожалуйста, подождите...</div>}
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
                                setSelectedExercise(e.target.value);
                                resetScenario();
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
                                setSelectedExercise(e.target.value);
                                resetScenario();
                            }}
                        />
                        <label htmlFor="radioWristCurl" style={{ fontSize: "20px" }}>
                            Поднятие кисти
                        </label>

                        {/* Добавьте другие радиокнопки для других упражнений с уникальными ID и Value */}
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
                        {currentHandPhaseRef.current === "both" ? "Поднимите обе руки вверх" : `Поднимите ${currentHand === "left" ? "левую" : "правую"} руку вверх`}
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
                    <h2>Результаты упражнения</h2>
                    <GraphSingleHand repetitions={leftRepetitions} handLabel="Левая рука" lineColor="rgba(75, 192, 192, 1)" />
                    <GraphSingleHand repetitions={rightRepetitions} handLabel="Правая рука" lineColor="rgba(153, 102, 255, 1)" />
                    <GraphBothHands bothRepetitions={bothRepetitions} />

                    <h2>Графики фаз движения</h2>
                    {/* Отображаем графики для левой и правой руки с их данными */}
                    <MovementPhaseChart phasesDataLeft={leftPhasesData} phasesDataRight={[]} handLabel="Левая рука" />
                    <MovementPhaseChart phasesDataLeft={[]} phasesDataRight={rightPhasesData} handLabel="Правая рука" />
                    {/* Отображаем график для обеих рук, используя данные фаз из exercises с обеими руками */}
                    <MovementPhaseChart phasesDataLeft={bothPhasesData.left} phasesDataRight={bothPhasesData.right} handLabel="Обе руки" />

                    <h2>Статистика угловой скорости</h2>
                    <h3>Левая рука</h3>
                    <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
                        {leftHandStats.map((stat, index) => (
                            <li key={index}>
                                Повторение {stat.repetition}: Min = {stat.min.toFixed(2)}°/s, Max = {stat.max.toFixed(2)}°/s, Avg = {stat.avg.toFixed(2)}°/s
                            </li>
                        ))}
                    </ul>

                    <h3>Правая рука</h3>
                    <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
                        {rightHandStats.map((stat, index) => (
                            <li key={index}>
                                Повторение {stat.repetition}: Min = {stat.min.toFixed(2)}°/s, Max = {stat.max.toFixed(2)}°/s, Avg = {stat.avg.toFixed(2)}°/s
                            </li>
                        ))}
                    </ul>

                    <h3>Обе руки</h3>
                    <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
                        {bothHandsStats.map((stat, index) => (
                            <li key={index}>
                                Повторение {stat.repetition}:
                                <ul style={{ listStyleType: "none", paddingLeft: "20px" }}>
                                    <li>
                                        Левая рука: Min = {stat.left.min.toFixed(2)}°/s, Max = {stat.left.max.toFixed(2)}°/s, Avg = {stat.left.avg.toFixed(2)}°/s
                                    </li>
                                    <li>
                                        Правая рука: Min = {stat.right.min.toFixed(2)}°/s, Max = {stat.right.max.toFixed(2)}°/s, Avg = {stat.right.avg.toFixed(2)}°/s
                                    </li>
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default App;
