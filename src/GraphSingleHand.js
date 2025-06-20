import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphSingleHand = ({ repetitions, handLabel, lineColor }) => {
    const [showAllRepetitions, setShowAllRepetitions] = useState(false);

    const normalizedCurves = useMemo(() => {
        if (!repetitions || !Array.isArray(repetitions) || repetitions.length === 0) {
            return [];
        }
        return repetitions
            .map((rep) => {
                if (!rep.duration || rep.duration === 0 || !rep.angles || !Array.isArray(rep.angles) || rep.angles.length === 0) {
                    console.error("Invalid repetition data:", rep);
                    return [];
                }
                return rep.angles.map((pt) => ({
                    percent: (pt.time / rep.duration) * 100,
                    angle: pt.shoulderAngle,
                }));
            })
            .filter((curve) => curve.length > 0);
    }, [repetitions]);

    const averagesPerRepetition = useMemo(() => {
        if (normalizedCurves.length === 0) {
            return [];
        }
        return normalizedCurves.map((curve) => {
            const totalAngle = curve.reduce((sum, point) => sum + point.angle, 0);
            const avgAngle = totalAngle / curve.length;
            return avgAngle;
        });
    }, [normalizedCurves]);

    const { minAvgIndex, maxAvgIndex } = useMemo(() => {
        if (averagesPerRepetition.length === 0) {
            return { minAvgIndex: null, maxAvgIndex: null };
        }
        let minAvg = Infinity;
        let maxAvg = -Infinity;
        let minAvgIndex = -1;
        let maxAvgIndex = -1;
        averagesPerRepetition.forEach((avg, index) => {
            if (avg < minAvg) {
                minAvg = avg;
                minAvgIndex = index;
            }
            if (avg > maxAvg) {
                maxAvg = avg;
                maxAvgIndex = index;
            }
        });
        return { minAvgIndex, maxAvgIndex };
    }, [averagesPerRepetition]);

    const averageCurve = useMemo(() => {
        if (normalizedCurves.length === 0) {
            return null;
        }
        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const anglesAtPercent = normalizedCurves.map((curve) => {
                const closest = curve.reduce((prev, curr) => (Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev));
                return closest.angle;
            });
            const avgAngle = anglesAtPercent.reduce((sum, val) => sum + val, 0) / anglesAtPercent.length;
            points.push(avgAngle);
        }
        return points;
    }, [normalizedCurves]);

    const minAvgCurve = useMemo(() => {
        if (minAvgIndex === null || !normalizedCurves[minAvgIndex]) {
            return null;
        }
        return getCurveAtPercentages(normalizedCurves[minAvgIndex]);
    }, [normalizedCurves, minAvgIndex]);

    const maxAvgCurve = useMemo(() => {
        if (maxAvgIndex === null || !normalizedCurves[maxAvgIndex]) {
            return null;
        }
        return getCurveAtPercentages(normalizedCurves[maxAvgIndex]);
    }, [normalizedCurves, maxAvgIndex]);

    const allRepetitionsCurves = useMemo(() => {
        if (!showAllRepetitions || normalizedCurves.length === 0) {
            return [];
        }
        return normalizedCurves.map((curve, idx) => ({
            label: `Повторение ${idx + 1}`,
            data: getCurveAtPercentages(curve),
            borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`,
            borderWidth: 1,
            fill: false,
        }));
    }, [normalizedCurves, showAllRepetitions]);

    function getCurveAtPercentages(curve) {
        if (!curve) return null;
        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const closest = curve.reduce((prev, curr) => (Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev));
            points.push(closest.angle);
        }
        return points;
    }

    const { maxAngleIndex, maxAngle } = useMemo(() => {
        if (!averageCurve) {
            return { maxAngleIndex: null, maxAngle: null };
        }
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

    const data = useMemo(() => {
        if (!averageCurve) {
            return null;
        }
        const labels = Array.from({ length: 101 }, (_, i) => `${i}%`);
        
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
                fill: false,
            });
            
            if (minAvgCurve) {
                datasets.push({
                    label: `Мин. угол повторения (${handLabel})`,
                    data: minAvgCurve,
                    borderColor: "rgba(255, 99, 132, 0.7)",
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                });
            }
            
            if (maxAvgCurve) {
                datasets.push({
                    label: `Макс. угол повторения (${handLabel})`,
                    data: maxAvgCurve,
                    borderColor: "rgba(54, 162, 235, 0.7)",
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                });
            }
        }

        return {
            labels,
            datasets,
        };
    }, [averageCurve, minAvgCurve, maxAvgCurve, handLabel, lineColor, showAllRepetitions, allRepetitionsCurves]);

    const options = {
        responsive: true,
        plugins: {
            legend: { display: true },
            title: { 
                display: true, 
                text: `График для ${handLabel}`,
                font: {
                    size: 16
                }
            },
            annotation: {
                annotations: {
                    maxAngleLine: maxAngleIndex !== null && {
                        type: "line",
                        xMin: maxAngleIndex,
                        xMax: maxAngleIndex,
                        borderColor: "rgba(255, 0, 0, 0.7)",
                        borderWidth: 2,
                        borderDash: [10, 5],
                        label: {
                            content: `Макс. угол (${maxAngle.toFixed(2)}°)`,
                            enabled: true,
                            position: "top",
                            backgroundColor: "rgba(255, 255, 255, 0.8)",
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
                    font: {
                        size: 14
                    }
                } 
            },
            y: { 
                title: { 
                    display: true, 
                    text: "Угол (°)",
                    font: {
                        size: 14
                    }
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

export default GraphSingleHand;