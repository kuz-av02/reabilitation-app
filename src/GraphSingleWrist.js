import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphSingleWrist = ({ repetitions, handLabel, lineColor }) => {
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

    // Находим минимальный угол для средней кривой
    const { minAngleIndex, minAngle } = useMemo(() => {
        if (!averageCurve) return { minAngleIndex: null, minAngle: null };

        let minAngle = Infinity;
        let minAngleIndex = -1;
        averageCurve.forEach((angle, index) => {
            if (angle < minAngle) {
                minAngle = angle;
                minAngleIndex = index;
            }
        });
        return { minAngleIndex, minAngle };
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

    const data = useMemo(() => {
        if (!averageCurve) return null;

        const datasets = [
            {
                label: `Средний угол (${handLabel})`,
                data: averageCurve,
                borderColor: lineColor,
                borderWidth: 2,
                tension: 0.1,
            }
        ];

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

        return {
            labels: Array.from({ length: 101 }, (_, i) => `${i}%`),
            datasets,
        };
    }, [averageCurve, maxCurveData, minCurveData, handLabel, lineColor]);

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: `Динамика кисти - ${handLabel}`,
            },
            annotation: {
                annotations: {
                    minAngleLine: minAngleIndex !== null && {
                        type: "line",
                        xMin: minAngleIndex,
                        xMax: minAngleIndex,
                        borderColor: "rgba(255, 0, 0, 0.7)",
                        borderWidth: 2,
                        borderDash: [10, 5],
                        label: {
                            content: `Мин. угол (${minAngle?.toFixed(2)}°)`,
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
                reverse: true, // Инвертируем ось Y
                title: {
                    display: true,
                    text: "Угол (°)",
                },
                min: minAngle - 20,
                max: 180,
                ticks: {
                    stepSize: 30,
                }
            },
        },
    };

    return (
        <div style={{ marginBottom: '2rem' }}>
            {data ? <Line data={data} options={options} /> : <div>Нет данных для отображения графика {handLabel}</div>}
        </div>
    );
};

export default GraphSingleWrist;