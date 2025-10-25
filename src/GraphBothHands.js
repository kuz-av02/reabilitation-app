import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphBothHands = ({ bothRepetitions }) => {
    const [showAllRepetitions, setShowAllRepetitions] = useState(false);
    const [hiddenLeftRepetitions, setHiddenLeftRepetitions] = useState([]);
    const [hiddenRightRepetitions, setHiddenRightRepetitions] = useState([]);

    const normalizeAngles = (points) => {
        if (!points || points.length === 0) return points;
        
        // Находим начальное значение (первая точка)
        const initialAngle = points[0]?.shoulderAngle || 0;
        
        // Вычитаем начальное значение из всех точек
        return points.map(point => ({
            ...point,
            angle: point.shoulderAngle - initialAngle
        }));
    };

    const { minAngle } = useMemo(() => {
        if (!bothRepetitions || bothRepetitions.length === 0) {
            return { minAngle: 0 };
        }

        let globalMin = Infinity;

        // Проходим по всем повторениям и находим глобальные min/max
        bothRepetitions.forEach(rep => {
            if (rep.anglesLeft) {
                const normalizedLeftAngles = normalizeAngles(rep.anglesLeft);
                normalizedLeftAngles.forEach(angleData => {
                    globalMin = Math.min(globalMin, angleData.angle);
                });
            }
            if (rep.anglesRight) {
                const normalizedRightAngles = normalizeAngles(rep.anglesLeft);
                normalizedRightAngles.forEach(angleData => {
                    globalMin = Math.min(globalMin, angleData.angle);
                });
            }
        });

        // Добавляем небольшой отступ для лучшего отображения
        const padding = (globalMin) * 0.1;
        return {
            minAngle: Math.min(0, globalMin - padding), 
        };
    }, [bothRepetitions]);

    const normalizeData = (repetitions, angleKey) => {
        if (!repetitions || !Array.isArray(repetitions)) return [];

        return repetitions
            .map((rep, index) => {
                const angles = rep[angleKey];
                if (!rep.duration || rep.duration === 0 || !angles || !Array.isArray(angles)) {
                    console.error("Invalid repetition data:", rep);
                    return null;
                }
                const normalizedAngles = normalizeAngles(angles);
                
                return {
                    index,
                    points: normalizedAngles.map((pt) => ({
                        percent: (pt.time / rep.duration) * 100,
                        angle: pt.angle,
                    })),
                };
            })
            .filter((rep) => rep !== null);
    };

    const normalizedLeft = useMemo(() => normalizeData(bothRepetitions, "anglesLeft"), [bothRepetitions]);
    const normalizedRight = useMemo(() => normalizeData(bothRepetitions, "anglesRight"), [bothRepetitions]);

    const filteredLeftCurves = useMemo(() => {
        return normalizedLeft.filter((rep) => !hiddenLeftRepetitions.includes(rep.index));
    }, [normalizedLeft, hiddenLeftRepetitions]);

    const filteredRightCurves = useMemo(() => {
        return normalizedRight.filter((rep) => !hiddenRightRepetitions.includes(rep.index));
    }, [normalizedRight, hiddenRightRepetitions]);

    const getAverageCurve = (normalizedCurves) => {
        if (normalizedCurves.length === 0) return null;

        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const anglesAtPercent = normalizedCurves.map(({ points: curve }) => {
                const closest = curve.reduce((prev, curr) => (Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev));
                return closest.angle;
            });
            const avgAngle = anglesAtPercent.reduce((sum, val) => sum + val, 0) / anglesAtPercent.length;
            points.push(avgAngle);
        }
        return points;
    };

    const leftAverageCurve = useMemo(() => getAverageCurve(filteredLeftCurves), [filteredLeftCurves]);
    const rightAverageCurve = useMemo(() => getAverageCurve(filteredRightCurves), [filteredRightCurves]);

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

    const getExtremeCurves = (normalizedCurves, filteredCurves) => {
        if (filteredCurves.length === 0) return { minCurve: null, maxCurve: null };

        const averages = filteredCurves.map(({ points: curve }) => {
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
                minIndex = filteredCurves[index].index;
            }
            if (avg > maxAvg) {
                maxAvg = avg;
                maxIndex = filteredCurves[index].index;
            }
        });

        return {
            minCurve: minIndex !== -1 ? getCurveAtPercentages(normalizedCurves.find((rep) => rep.index === minIndex)?.points) : null,
            maxCurve: maxIndex !== -1 ? getCurveAtPercentages(normalizedCurves.find((rep) => rep.index === maxIndex)?.points) : null,
        };
    };

    const { minCurve: leftMinCurve, maxCurve: leftMaxCurve } = useMemo(() => getExtremeCurves(normalizedLeft, filteredLeftCurves), [normalizedLeft, filteredLeftCurves]);

    const { minCurve: rightMinCurve, maxCurve: rightMaxCurve } = useMemo(() => getExtremeCurves(normalizedRight, filteredRightCurves), [normalizedRight, filteredRightCurves]);

    const getAllRepetitionsCurves = (normalizedCurves, hiddenRepetitions, color, handLabel) => {
        if (!showAllRepetitions || normalizedCurves.length === 0) return [];

        return normalizedCurves.map(({ index, points }) => ({
            label: `${handLabel} - Повторение ${index + 1}`,
            data: getCurveAtPercentages(points),
            borderColor: hiddenRepetitions.includes(index) ? `${color.replace("1)", "0.2)")}` : color,
            borderWidth: hiddenRepetitions.includes(index) ? 1 : 2,
            borderDash: hiddenRepetitions.includes(index) ? [] : [5, 5],
            pointRadius: 3,
            pointHoverRadius: 5,
            hidden: hiddenRepetitions.includes(index),
        }));
    };

    const leftAllCurves = useMemo(() => getAllRepetitionsCurves(normalizedLeft, hiddenLeftRepetitions, "rgba(75, 192, 192, 1)", "Левая"), [normalizedLeft, hiddenLeftRepetitions, showAllRepetitions]);

    const rightAllCurves = useMemo(() => getAllRepetitionsCurves(normalizedRight, hiddenRightRepetitions, "rgba(153, 102, 255, 1)", "Правая"), [normalizedRight, hiddenRightRepetitions, showAllRepetitions]);

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

    const toggleRepetitionVisibility = (hand, index) => {
        if (hand === "left") {
            setHiddenLeftRepetitions((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
        } else {
            setHiddenRightRepetitions((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
        }
    };

    const data = useMemo(() => {
        const labels = Array.from({ length: 101 }, (_, i) => `${i}%`);
        const datasets = [];

        if (showAllRepetitions) {
            datasets.push(...leftAllCurves);
            datasets.push(...rightAllCurves);

            if (filteredLeftCurves.length > 0) {
                datasets.push({
                    label: "Левая рука (среднее)",
                    data: leftAverageCurve || Array(101).fill(0),
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false,
                });
            }

            if (filteredRightCurves.length > 0) {
                datasets.push({
                    label: "Правая рука (среднее)",
                    data: rightAverageCurve || Array(101).fill(0),
                    borderColor: "rgba(153, 102, 255, 1)",
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false,
                });
            }
        } else {
            datasets.push({
                label: "Левая рука (среднее)",
                data: leftAverageCurve || Array(101).fill(0),
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: false,
            });

            datasets.push({
                label: "Правая рука (среднее)",
                data: rightAverageCurve || Array(101).fill(0),
                borderColor: "rgba(153, 102, 255, 1)",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: false,
            });

            // if (leftMinCurve && filteredLeftCurves.length > 0) {
            //     datasets.push({
            //         label: "Левая рука (мин)",
            //         data: leftMinCurve,
            //         borderColor: "rgba(75, 192, 192, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         pointRadius: 3,
            //         pointHoverRadius: 5,
            //         fill: false,
            //     });
            // }

            // if (leftMaxCurve && filteredLeftCurves.length > 0) {
            //     datasets.push({
            //         label: "Левая рука (макс)",
            //         data: leftMaxCurve,
            //         borderColor: "rgba(75, 192, 192, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         pointRadius: 3,
            //         pointHoverRadius: 5,
            //         fill: false,
            //     });
            // }

            // if (rightMinCurve && filteredRightCurves.length > 0) {
            //     datasets.push({
            //         label: "Правая рука (мин)",
            //         data: rightMinCurve,
            //         borderColor: "rgba(153, 102, 255, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         pointRadius: 3,
            //         pointHoverRadius: 5,
            //         fill: false,
            //     });
            // }

            // if (rightMaxCurve && filteredRightCurves.length > 0) {
            //     datasets.push({
            //         label: "Правая рука (макс)",
            //         data: rightMaxCurve,
            //         borderColor: "rgba(153, 102, 255, 0.7)",
            //         borderDash: [5, 5],
            //         borderWidth: 2,
            //         pointRadius: 3,
            //         pointHoverRadius: 5,
            //         fill: false,
            //     });
            // }
        }

        return { labels, datasets };
    }, [showAllRepetitions, leftAllCurves, rightAllCurves, leftAverageCurve, rightAverageCurve, leftMinCurve, leftMaxCurve, rightMinCurve, rightMaxCurve, filteredLeftCurves, filteredRightCurves]);

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                labels: {
                    font: { size: 26 },
                    color: '#111',
                },
                onClick: (e, legendItem, legend) => {
                    const index = legendItem.datasetIndex;
                    const meta = legend.chart.getDatasetMeta(index);
                    const label = meta?.label || "";

                    if (label.startsWith("Левая - Повторение")) {
                        const repNumber = parseInt(label.split(" ")[3]) - 1;
                        toggleRepetitionVisibility("left", repNumber);
                    } else if (label.startsWith("Правая - Повторение")) {
                        const repNumber = parseInt(label.split(" ")[3]) - 1;
                        toggleRepetitionVisibility("right", repNumber);
                    } else {
                        meta.hidden = !meta.hidden;
                        legend.chart.update();
                    }
                },
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.dataset.label || "";
                        if (label.includes("Повторение")) {
                            const hand = label.startsWith("Левая") ? "left" : "right";
                            const repNumber = parseInt(label.split(" ")[3]) - 1;
                            const isHidden = hand === "left" ? hiddenLeftRepetitions.includes(repNumber) : hiddenRightRepetitions.includes(repNumber);

                            return isHidden ? `${label} (скрыто)` : `${label}: ${context.parsed.y.toFixed(2)}°`;
                        }
                        return `${label}: ${context.parsed.y.toFixed(2)}°`;
                    },
                },
            },
            title: {
                display: true,
                text: "Сравнительный график",
                font: { size: 30 },
                color: '#111',
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
                            content: `Макс. угол левой (${maxAngleLeft?.toFixed(2) || "0"}°)`,
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
                            content: `Макс. угол правой (${maxAngleRight?.toFixed(2) || "0"}°)`,
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
                    font: { size: 30 },
                    color: '#111',
                },                
                ticks: {
                    font: { size: 16 },
                    color: '#222',
                    autoSkip: false,
                    callback: function(value, index) {
                        const step = 2;
                        return (index % step === 0) ? value : '';
                    },
                    maxTicksLimit: 101,
                } 
            },
            y: {
                title: {
                    display: true,
                    text: "Угол (°)",
                    font: { size: 30 },
                    color: '#111',
                },                
                ticks: {
                    font: { size: 20 },
                    color: '#222'
                }, 
                min: minAngle-20,
                max: 180,
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
                    fontSize: "24px",
                    zIndex: 10,
                }}
            >
                {showAllRepetitions ? "Показать только среднее" : "Показать все повторения"}
            </button>

            {bothRepetitions?.length > 0 ? <Line data={data} options={options} key={`${showAllRepetitions}-${hiddenLeftRepetitions.join(",")}-${hiddenRightRepetitions.join(",")}`} /> : <div>Нет достаточных данных для отображения сравнительного графика.</div>}
        </div>
    );
};

export default GraphBothHands;
