import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphBothHands = ({ bothRepetitions }) => {
    const [showAllRepetitions, setShowAllRepetitions] = useState(false);

    const normalizeData = (repetitions, angleKey) => {
        if (!repetitions || !Array.isArray(repetitions) || repetitions.length === 0) {
            return [];
        }
        return repetitions
            .map((rep) => {
                const angles = rep[angleKey];
                if (!rep.duration || rep.duration === 0 || !angles || !Array.isArray(angles) || angles.length === 0) {
                    console.error("Invalid repetition data:", rep);
                    return [];
                }
                return angles.map((pt) => ({
                    percent: (pt.time / rep.duration) * 100,
                    angle: pt.shoulderAngle,
                }));
            })
            .filter((curve) => curve.length > 0);
    };

    const normalizedLeft = useMemo(() => normalizeData(bothRepetitions, "anglesLeft"), [bothRepetitions]);
    const normalizedRight = useMemo(() => normalizeData(bothRepetitions, "anglesRight"), [bothRepetitions]);

    const getAverageCurve = (normalizedCurves) => {
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
    };

    const leftAverageCurve = useMemo(() => getAverageCurve(normalizedLeft), [normalizedLeft]);
    const rightAverageCurve = useMemo(() => getAverageCurve(normalizedRight), [normalizedRight]);

    const getExtremeCurves = (normalizedCurves) => {
        if (normalizedCurves.length === 0) {
            return { minCurve: null, maxCurve: null };
        }
        
        const averages = normalizedCurves.map(curve => {
            const totalAngle = curve.reduce((sum, point) => sum + point.angle, 0);
            return totalAngle / curve.length;
        });
        
        let minAvg = Infinity;
        let maxAvg = -Infinity;
        let minIndex = -1;
        let maxIndex = -1;
        
        averages.forEach((avg, index) => {
            if (avg < minAvg) {
                minAvg = avg;
                minIndex = index;
            }
            if (avg > maxAvg) {
                maxAvg = avg;
                maxIndex = index;
            }
        });
        
        const getCurveAtPercentages = (curve) => {
            if (!curve) return null;
            const N = 100;
            const points = [];
            for (let i = 0; i <= N; i++) {
                const targetPercent = (i / N) * 100;
                const closest = curve.reduce((prev, curr) => (Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev));
                points.push(closest.angle);
            }
            return points;
        };
        
        return {
            minCurve: minIndex !== -1 ? getCurveAtPercentages(normalizedCurves[minIndex]) : null,
            maxCurve: maxIndex !== -1 ? getCurveAtPercentages(normalizedCurves[maxIndex]) : null
        };
    };

    const { minCurve: leftMinCurve, maxCurve: leftMaxCurve } = useMemo(() => getExtremeCurves(normalizedLeft), [normalizedLeft]);
    const { minCurve: rightMinCurve, maxCurve: rightMaxCurve } = useMemo(() => getExtremeCurves(normalizedRight), [normalizedRight]);

    const getAllRepetitionsCurves = (normalizedCurves, color, handLabel) => {
        if (!showAllRepetitions || normalizedCurves.length === 0) {
            return [];
        }
        return normalizedCurves.map((curve, idx) => ({
            label: `${handLabel} - Повторение ${idx + 1}`,
            data: getCurveAtPercentages(curve),
            borderColor: color.replace('1)', '0.3)'),
            borderWidth: 1,
            fill: false,
        }));
    };

    const leftAllCurves = useMemo(() => getAllRepetitionsCurves(normalizedLeft, "rgba(75, 192, 192, 1)", "Левая"), [normalizedLeft, showAllRepetitions]);
    const rightAllCurves = useMemo(() => getAllRepetitionsCurves(normalizedRight, "rgba(153, 102, 255, 1)", "Правая"), [normalizedRight, showAllRepetitions]);

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

    const getMaxAngleInfo = (curve) => {
        if (!curve) return { index: null, angle: null };
        let maxAngle = -Infinity;
        let maxIndex = -1;
        curve.forEach((angle, index) => {
            if (angle > maxAngle) {
                maxAngle = angle;
                maxIndex = index;
            }
        });
        return { index: maxIndex, angle: maxAngle };
    };

    const { index: maxAngleIndexLeft, angle: maxAngleLeft } = useMemo(() => getMaxAngleInfo(leftAverageCurve), [leftAverageCurve]);
    const { index: maxAngleIndexRight, angle: maxAngleRight } = useMemo(() => getMaxAngleInfo(rightAverageCurve), [rightAverageCurve]);

    const data = useMemo(() => {
        if (!leftAverageCurve || !rightAverageCurve) {
            return null;
        }
        const labels = Array.from({ length: 101 }, (_, i) => `${i}%`);
        
        const datasets = [];
        
        if (showAllRepetitions) {
            // Добавляем все повторения для обеих рук
            datasets.push(...leftAllCurves);
            datasets.push(...rightAllCurves);
            
            // Добавляем средние кривые поверх всех повторений
            datasets.push({
                label: "Левая рука (среднее)",
                data: leftAverageCurve,
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 3,
                fill: false,
            });
            
            datasets.push({
                label: "Правая рука (среднее)",
                data: rightAverageCurve,
                borderColor: "rgba(153, 102, 255, 1)",
                borderWidth: 3,
                fill: false,
            });
        } else {
            // Только среднее, мин и макс для обеих рук
            datasets.push({
                label: "Левая рука (среднее)",
                data: leftAverageCurve,
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 2,
                fill: false,
            });
            
            datasets.push({
                label: "Правая рука (среднее)",
                data: rightAverageCurve,
                borderColor: "rgba(153, 102, 255, 1)",
                borderWidth: 2,
                fill: false,
            });
            
            // if (leftMinCurve) {
            //     datasets.push({
            //         label: "Левая рука (мин)",
            //         data: leftMinCurve,
            //         borderColor: "rgba(75, 192, 192, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         fill: false,
            //     });
            // }
            
            // if (leftMaxCurve) {
            //     datasets.push({
            //         label: "Левая рука (макс)",
            //         data: leftMaxCurve,
            //         borderColor: "rgba(75, 192, 192, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         fill: false,
            //     });
            // }
            
            // if (rightMinCurve) {
            //     datasets.push({
            //         label: "Правая рука (мин)",
            //         data: rightMinCurve,
            //         borderColor: "rgba(153, 102, 255, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         fill: false,
            //     });
            // }
            
            // if (rightMaxCurve) {
            //     datasets.push({
            //         label: "Правая рука (макс)",
            //         data: rightMaxCurve,
            //         borderColor: "rgba(153, 102, 255, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         fill: false,
            //     });
            // }
        }

        return {
            labels,
            datasets,
        };
    }, [leftAverageCurve, rightAverageCurve, leftMinCurve, leftMaxCurve, rightMinCurve, rightMaxCurve, showAllRepetitions, leftAllCurves, rightAllCurves]);

    const options = {
        responsive: true,
        plugins: {
            legend: { display: true },
            title: { 
                display: true, 
                text: "Сравнительный график",
                font: {
                    size: 16
                }
            },
            annotation: {
                annotations: {
                    maxAngleLineLeft: maxAngleIndexLeft !== null && {
                        type: "line",
                        xMin: maxAngleIndexLeft,
                        xMax: maxAngleIndexLeft,
                        borderColor: "rgba(75, 192, 192, 1)",
                        borderWidth: 2,
                        borderDash: [10, 5],
                        label: {
                            content: `Макс. угол левой (${maxAngleLeft.toFixed(2)}°)`,
                            enabled: true,
                            position: "top",
                            backgroundColor: "rgba(255, 255, 255, 0.8)",
                        },
                    },
                    maxAngleLineRight: maxAngleIndexRight !== null && {
                        type: "line",
                        xMin: maxAngleIndexRight,
                        xMax: maxAngleIndexRight,
                        borderColor: "rgba(153, 102, 255, 1)",
                        borderWidth: 2,
                        borderDash: [10, 5],
                        label: {
                            content: `Макс. угол правой (${maxAngleRight.toFixed(2)}°)`,
                            enabled: true,
                            position: "bottom",
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
                {showAllRepetitions ? "Показать только среднее" : "Показать все повторения"}
            </button>
            {data ? <Line data={data} options={options} /> : <div>Нет достаточных данных для отображения сравнительного графика.</div>}
        </div>
    );
};

export default GraphBothHands;