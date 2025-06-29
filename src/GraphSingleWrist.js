import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphSingleWrist = ({ repetitions, handLabel, lineColor }) => {
    const [showAllRepetitions, setShowAllRepetitions] = useState(false);
    const [hiddenRepetitions, setHiddenRepetitions] = useState([]);

    // Генератор цветов для повторений
    const generateColor = (index, total) => {
        const hue = (index * 360 / total) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    };

    // Нормализуем данные всех повторений с сохранением индексов и цветов
    const normalizedCurves = useMemo(() => {
        if (!repetitions || !Array.isArray(repetitions)) return [];
        
        return repetitions
            .map((rep, index) => {
                if (!rep.duration || rep.duration === 0 || !rep.angles || !Array.isArray(rep.angles)) {
                    console.error("Invalid repetition data:", rep);
                    return null;
                }
                return {
                    index,
                    color: generateColor(index, repetitions.length),
                    points: rep.angles.map(pt => ({
                        percent: (pt.time / rep.duration) * 100,
                        angle: pt.angleWrist,
                    }))
                };
            })
            .filter(rep => rep !== null);
    }, [repetitions]);

    // Фильтруем кривые, исключая скрытые повторения
    const filteredCurves = useMemo(() => {
        return normalizedCurves.filter(rep => !hiddenRepetitions.includes(rep.index));
    }, [normalizedCurves, hiddenRepetitions]);

    // Находим кривые с максимальным и минимальным изменением угла
    const { maxCurve, minCurve } = useMemo(() => {
        if (filteredCurves.length === 0) return { maxCurve: null, minCurve: null };

        let maxAmplitude = -Infinity;
        let minAmplitude = Infinity;
        let maxCurve = null;
        let minCurve = null;

        filteredCurves.forEach(({ points: curve }) => {
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
    }, [filteredCurves]);

    // Создаем среднюю кривую
    const averageCurve = useMemo(() => {
        if (filteredCurves.length === 0) return null;

        const N = 100;
        const points = [];
        for (let i = 0; i <= N; i++) {
            const targetPercent = (i / N) * 100;
            const anglesAtPercent = filteredCurves.map(({ points: curve }) => {
                const closest = curve.reduce((prev, curr) => 
                    Math.abs(curr.percent - targetPercent) < Math.abs(prev.percent - targetPercent) ? curr : prev
                );
                return closest.angle;
            });
            points.push(anglesAtPercent.reduce((sum, val) => sum + val, 0) / anglesAtPercent.length);
        }
        return points;
    }, [filteredCurves]);

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
        if (!showAllRepetitions || normalizedCurves.length === 0) return [];
        
        return normalizedCurves.map(({ index, points, color }) => ({
            label: `Повторение ${index + 1}`,
            data: getCurveData(points),
            borderColor: hiddenRepetitions.includes(index) 
                ? `${color.replace('%)', '%, 0.2)')}` 
                : color,
            borderWidth: hiddenRepetitions.includes(index) ? 1 : 2,
            borderDash: hiddenRepetitions.includes(index) ? [] : [5, 5],
            pointRadius: 3,
            pointHoverRadius: 5,
            hidden: hiddenRepetitions.includes(index),
        }));
    }, [showAllRepetitions, normalizedCurves, hiddenRepetitions]);

    const toggleRepetitionVisibility = (index) => {
        setHiddenRepetitions(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const data = useMemo(() => {
        const datasets = [];

        if (showAllRepetitions) {
            // Добавляем все повторения
            datasets.push(...allRepetitionsCurves);
            
            // Добавляем среднюю кривую поверх всех повторений
            if (filteredCurves.length > 0) {
                datasets.push({
                    label: `Средний угол (${handLabel})`,
                    data: averageCurve || Array(101).fill(0),
                    borderColor: lineColor,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false,
                });
            }
        } else {
            // Всегда показываем среднюю кривую
            datasets.push({
                label: `Средний угол (${handLabel})`,
                data: averageCurve || Array(101).fill(0),
                borderColor: lineColor,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: false,
            });

            // Добавляем мин/макс кривые, если есть данные
            if (maxCurveData && filteredCurves.length > 0) {
                datasets.push({
                    label: `Макс. изменение (${handLabel})`,
                    data: maxCurveData,
                    borderColor: 'rgba(255, 99, 132, 0.7)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    pointHoverRadius: 5,
                });
            }

            if (minCurveData && filteredCurves.length > 0) {
                datasets.push({
                    label: `Мин. изменение (${handLabel})`,
                    data: minCurveData,
                    borderColor: 'rgba(54, 162, 235, 0.7)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    pointHoverRadius: 5,
                });
            }
        }

        return {
            labels: Array.from({ length: 101 }, (_, i) => `${i}%`),
            datasets,
        };
    }, [
        showAllRepetitions, 
        allRepetitionsCurves, 
        averageCurve, 
        maxCurveData, 
        minCurveData, 
        handLabel, 
        lineColor,
        filteredCurves
    ]);

    const options = {
        responsive: true,
        plugins: {
            legend: { 
                display: true,
                onClick: (e, legendItem, legend) => {
                    const index = legendItem.datasetIndex;
                    const meta = legend.chart.getDatasetMeta(index);
                    
                    // Для повторений - переключаем видимость
                    if (meta?.label?.startsWith('Повторение')) {
                        const repNumber = parseInt(meta.label.split(' ')[1]) - 1;
                        toggleRepetitionVisibility(repNumber);
                    } 
                    // Для остальных элементов (среднее, мин, макс) - стандартное поведение
                    else {
                        meta.hidden = !meta.hidden;
                        legend.chart.update();
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.dataset.label || '';
                        if (label.startsWith('Повторение')) {
                            const repNumber = parseInt(label.split(' ')[1]) - 1;
                            return hiddenRepetitions.includes(repNumber) 
                                ? `${label} (скрыто)` 
                                : `${label}: ${context.parsed.y.toFixed(2)}°`;
                        }
                        return `${label}: ${context.parsed.y.toFixed(2)}°`;
                    }
                }
            },
            title: {
                display: true,
                text: `Динамика кисти - ${handLabel}`,
                font: { size: 16 }
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
                            content: `Макс. угол (${maxAngle?.toFixed(2) || '0'}°)`,
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
                    font: { size: 14 }
                },
            },
            y: {
                reverse: false,
                title: {
                    display: true,
                    text: "Угол (°)",
                    font: { size: 14 }
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
            
            {repetitions?.length > 0 ? (
                <Line 
                    data={data} 
                    options={options} 
                    key={`${showAllRepetitions}-${hiddenRepetitions.join(',')}`}
                />
            ) : (
                <div>Нет данных для отображения графика {handLabel}</div>
            )}
        </div>
    );
};

export default GraphSingleWrist;