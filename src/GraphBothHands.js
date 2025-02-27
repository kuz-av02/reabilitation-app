import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";

import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphBothHands = ({ bothRepetitions }) => {
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

    const leftAverageCurve = useMemo(() => {
        if (normalizedLeft.length === 0) {
            return null;
        }
        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const anglesAtPercent = normalizedLeft.map((curve) => {
                const closest = curve.reduce((prev, curr) => (Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev));
                return closest.angle;
            });
            const avgAngle = anglesAtPercent.reduce((sum, val) => sum + val, 0) / anglesAtPercent.length;
            points.push(avgAngle);
        }
        return points;
    }, [normalizedLeft]);

    const rightAverageCurve = useMemo(() => {
        if (normalizedRight.length === 0) {
            return null;
        }
        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const anglesAtPercent = normalizedRight.map((curve) => {
                const closest = curve.reduce((prev, curr) => (Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev));
                return closest.angle;
            });
            const avgAngle = anglesAtPercent.reduce((sum, val) => sum + val, 0) / anglesAtPercent.length;
            points.push(avgAngle);
        }
        return points;
    }, [normalizedRight]);

    const { maxAngleIndexLeft, maxAngleLeft } = useMemo(() => {
        if (!leftAverageCurve) {
            return { maxAngleIndexLeft: null, maxAngleLeft: null };
        }
        let maxAngle = -Infinity;
        let maxAngleIndex = -1;
        leftAverageCurve.forEach((angle, index) => {
            if (angle > maxAngle) {
                maxAngle = angle;
                maxAngleIndex = index;
            }
        });
        return { maxAngleIndexLeft: maxAngleIndex, maxAngleLeft: maxAngle };
    }, [leftAverageCurve]);

    const { maxAngleIndexRight, maxAngleRight } = useMemo(() => {
        if (!rightAverageCurve) {
            return { maxAngleIndexRight: null, maxAngleRight: null };
        }
        let maxAngle = -Infinity;
        let maxAngleIndex = -1;
        rightAverageCurve.forEach((angle, index) => {
            if (angle > maxAngle) {
                maxAngle = angle;
                maxAngleIndex = index;
            }
        });
        return { maxAngleIndexRight: maxAngleIndex, maxAngleRight: maxAngle };
    }, [rightAverageCurve]);

    const data = useMemo(() => {
        if (!leftAverageCurve || !rightAverageCurve) {
            return null;
        }
        const labels = Array.from({ length: 101 }, (_, i) => `${i}%`);
        return {
            labels,
            datasets: [
                {
                    label: "Левая рука",
                    data: leftAverageCurve,
                    borderColor: "rgba(75, 192, 192, 1)",
                    fill: false,
                },
                {
                    label: "Правая рука",
                    data: rightAverageCurve,
                    borderColor: "rgba(153, 102, 255, 1)",
                    fill: false,
                },
            ],
        };
    }, [leftAverageCurve, rightAverageCurve]);

    const options = {
        responsive: true,
        plugins: {
            legend: { display: true },
            title: { display: true, text: "Сравнительный график" },
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
            x: { title: { display: true, text: "Время цикла (%)" } },
            y: { title: { display: true, text: "Угол (°)" } },
        },
    };

    return <div>{data ? <Line data={data} options={options} /> : <div>Нет достаточных данных для отображения сравнительного графика.</div>}</div>;
};

export default GraphBothHands;
