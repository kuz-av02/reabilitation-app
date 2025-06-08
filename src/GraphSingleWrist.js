import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphSingleWrist = ({ repetitions, handLabel, lineColor }) => {
    const [showAllRepetitions, setShowAllRepetitions] = useState(false);

    // Нормализуем данные всех повторений
    const normalizedCurves = useMemo(() => {
        if (!repetitions || !Array.isArray(repetitions) || repetitions.length === 0) {
            return [];
        }
        return repetitions
            .map((rep) => {
                if (!rep.duration || rep.duration === 0 || !rep.angles || !Array.isArray(rep.angles) || rep.angles.length === 0) {
                    console.error("Invalid repetition data:", rep);
                    return null;
                }
                return rep.angles.map((pt) => ({
                    percent: (pt.time / rep.duration) * 100,
                    angle: pt.angleWrist,
                }));
            })
            .filter(curve => curve !== null);
    }, [repetitions]);

    // Находим кривые с максимальным и минимальным изменением угла
    const { maxCurve, minCurve } = useMemo(() => {
        if (normalizedCurves.length === 0) return { maxCurve: null, minCurve: null };

        let maxAmplitude = -Infinity;
        let minAmplitude = Infinity;
        let maxCurve = null;
        let minCurve = null;

        normalizedCurves.forEach(curve => {
            const angles = curve.map(p => p.angle);
            const amplitude = Math.max(...angles) - Math.min(...angles);
            
            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude;
                maxCurve = curve;
            }
            
            if (amplitude < minAmplitude) {
                minAmplitude = amplitude;
                minCurve = curve;
            }
        });

        return { maxCurve, minCurve };
    }, [normalizedCurves]);

    // Создаем среднюю кривую
    const averageCurve = useMemo(() => {
        if (normalizedCurves.length === 0) return null;

        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const anglesAtPercent = normalizedCurves.map(curve => {
                const closest = curve.reduce((prev, curr) => 
                    Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev
                );
                return closest.angle;
            });
            points.push(anglesAtPercent.reduce((sum, val) => sum + val, 0) / anglesAtPercent.length);
        }
        return points;
    }, [normalizedCurves]);

    // Находим максимальный угол для средней кривой
    const { maxAngleIndex, maxAngle } = useMemo(() => {
        if (!averageCurve) return { maxAngleIndex: null, maxAngle: null };

        let maxAngle = -Infinity;
        let maxAngleIndex = -1;
        averageCurve.forEach((angle, index) => {
            if (angle > maxAngle) {
                maxAngle = angle;
                maxAngleIndex = index;
            }
        });
        return { maxAngleIndex, maxAngle };
    }, [averageCurve]);

    // Преобразуем кривые в данные для графика
    const getCurveData = (curve) => {
        if (!curve) return null;
        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const closest = curve.reduce((prev, curr) => 
                Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev
            );
            points.push(closest.angle);
        }
        return points;
    };

    const maxCurveData = useMemo(() => getCurveData(maxCurve), [maxCurve]);
    const minCurveData = useMemo(() => getCurveData(minCurve), [minCurve]);

    // Все повторения для отображения
    const allRepetitionsCurves = useMemo(() => {
        if (!showAllRepetitions || normalizedCurves.length === 0) {
            return [];
        }
        return normalizedCurves.map((curve, idx) => ({
            label: `Повторение ${idx + 1}`,
            data: getCurveData(curve),
            borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`,
            borderWidth: 1,
            fill: false,
        }));
    }, [normalizedCurves, showAllRepetitions]);

    const data = useMemo(() => {
        if (!averageCurve) return null;

        const datasets = [];

        if (showAllRepetitions) {
            // Добавляем все повторения
            datasets.push(...allRepetitionsCurves);
            
            // Добавляем среднюю кривую поверх всех повторений
            datasets.push({
                label: `Средний угол (${handLabel})`,
                data: averageCurve,
                borderColor: lineColor,
                borderWidth: 3,
                fill: false,
            });
        } else {
            // Только среднее, мин и макс
            datasets.push({
                label: `Средний угол (${handLabel})`,
                data: averageCurve,
                borderColor: lineColor,
                borderWidth: 2,
                tension: 0.1,
            });

            if (maxCurveData) {
                datasets.push({
                    label: `Макс. изменение (${handLabel})`,
                    data: maxCurveData,
                    borderColor: 'rgba(255, 99, 132, 0.7)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                });
            }

            if (minCurveData) {
                datasets.push({
                    label: `Мин. изменение (${handLabel})`,
                    data: minCurveData,
                    borderColor: 'rgba(54, 162, 235, 0.7)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                });
            }
        }

        return {
            labels: Array.from({ length: 101 }, (_, i) => `${i}%`),
            datasets,
        };
    }, [averageCurve, maxCurveData, minCurveData, handLabel, lineColor, showAllRepetitions, allRepetitionsCurves]);

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: `Динамика кисти - ${handLabel}`,
            },
            annotation: {
                annotations: {
                    minAngleLine: maxAngleIndex !== null && {
                        type: "line",
                        xMin: maxAngleIndex,
                        xMax: maxAngleIndex,
                        borderColor: "rgba(255, 0, 0, 0.7)",
                        borderWidth: 2,
                        borderDash: [10, 5],
                        label: {
                            content: `Мин. угол (${maxAngle?.toFixed(2)}°)`,
                            enabled: true,
                            position: "bottom",
                        },
                    },
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Время цикла (%)",
                },
            },
            y: {
                reverse: false,
                title: {
                    display: true,
                    text: "Угол (°)",
                },
                min: 0,
                max: 100,
                ticks: {
                    stepSize: 30,
                }
            },
        },
    };

    return (
        <div style={{ margin: "20px 0", position: "relative" }}>
            <button 
                onClick={() => setShowAllRepetitions(!showAllRepetitions)}
                style={{
                    position: "absolute",
                    right: "10px",
                    top: "10px",
                    padding: "5px 10px",
                    backgroundColor: showAllRepetitions ? "#f44336" : "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    zIndex: 10
                }}
            >
                {showAllRepetitions ? "Показать среднее, max, min" : "Показать все повторения"}
            </button>
            {data ? <Line data={data} options={options} /> : <div>Нет данных для отображения графика {handLabel}</div>}
        </div>
    );
};

export default GraphSingleWrist;