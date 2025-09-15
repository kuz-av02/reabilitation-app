import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, annotationPlugin);

const GraphSingleHand = ({ repetitions, handLabel, lineColor }) => {
    const [showAllRepetitions, setShowAllRepetitions] = useState(false);
    const [hiddenRepetitions, setHiddenRepetitions] = useState([]);

    // Получаем индексы всех повторений
    const allRepetitionIndices = useMemo(() => {
        return repetitions?.map((_, index) => index) || [];
    }, [repetitions]);

    // Функция для расчета угла между двумя точками (в градусах)
    const calculateAngleBetweenPoints = (shoulderLeft, shoulderRight) => {
        const normalizedLeft = shoulderLeft
        const normalizedRight = shoulderRight
        
        // console.log("Нормализованные плечи:", normalizedLeft, normalizedRight);
        
        // Вектор между плечами
        const dx = normalizedRight.x - normalizedLeft.x;
        const dy = normalizedRight.y - normalizedLeft.y;
        
        // console.log("Δx:", dx, "Δy:", dy);
        
        // Если плечи на одном уровне по Y, угол с осью X = 0°
        if (dy === 0) {
            console.log("Плечи на одном уровне, угол = 0°");
            return 0;
        }
        
        // Если плечи на одном уровне по X, угол с осью X = 90°
        if (dx === 0) {
            console.log("Плечи вертикально, угол = 90°");
            return 90;
        }
        
        // Вычисляем угол между вектором плеч и осью X
        const angleRad = Math.atan2(Math.abs(dy), Math.abs(dx));
        const angleDeg = angleRad * (180 / Math.PI);
        
        // Возвращаем минимальный угол (всегда между 0° и 90°)
        return angleDeg;
    };

    // Функция для расчета углов между плечами для всех элементов массива
    const calculateShoulderAngles = (shoulderLeftCoords, shoulderRightCoords) => {
        if (!shoulderLeftCoords || !shoulderRightCoords || 
            shoulderLeftCoords.length !== shoulderRightCoords.length) {
            return [];
        }
        
        // Рассчитываем угол для каждой пары координат
        return shoulderLeftCoords.map((shoulderLeft, index) => {
            const shoulderRight = shoulderRightCoords[index];
            if (!shoulderLeft || !shoulderRight) {
                return 0;
            }
            return calculateAngleBetweenPoints(shoulderLeft, shoulderRight);
        });
    };

    const normalizeAngles = (angles, shoulderLeftCoords, shoulderRightCoords) => {
        if (!angles || angles.length === 0) {
            return angles;
        }
        
        // Рассчитываем углы между плечами для всех элементов
        const shoulderAngles = calculateShoulderAngles(shoulderLeftCoords, shoulderRightCoords);
        
        // Находим начальное значение (первая точка)
        const initialAngle = angles[0]?.shoulderAngle || 0;
        const initialShoulderAngle = shoulderAngles[0] || 0;
        
        // Вычитаем начальное значение из всех точек
        // И вычитаем shoulderAngles[index] только если angle > 90 градусов
        return angles.map((angleData, index) => {
            const shoulderAngleValue = angleData.shoulderAngle;
            const shoulderAngleCorrection = shoulderAngles[index] || 0;
            
            // Вычитаем shoulderAngleCorrection только если исходный угол > 90 градусов
            const correctedAngle = shoulderAngleValue > 90 
                ? shoulderAngleValue - initialAngle - shoulderAngleCorrection
                : shoulderAngleValue - initialAngle;
            
            return { 
                ...angleData,
                shoulderAngle: correctedAngle
            };
        });
    };

    // Находим минимальное и максимальное значения среди всех углов
    const { minAngle } = useMemo(() => {
        if (!repetitions || repetitions.length === 0) {
            return { minAngle: 0 };
        }

        let globalMin = Infinity;

        // Проходим по всем повторениям и находим глобальные min/max
        repetitions.forEach(rep => {
            if (rep.angles) {
                const normalizedAngles = normalizeAngles(rep.angles, rep.shoulderLeftCoord, rep.shoulderRightCoord);
                normalizedAngles.forEach(angleData => {
                    globalMin = Math.min(globalMin, angleData.shoulderAngle);
                });
            }
        });

        // Добавляем небольшой отступ для лучшего отображения
        const padding = (globalMin) * 0.1;
        return {
            minAngle: Math.min(0, globalMin - padding)
        };
    }, [repetitions]);

    const normalizedCurves = useMemo(() => {
        if (!repetitions || !Array.isArray(repetitions)) return [];
        
        return repetitions
            .map((rep, index) => {
                if (!rep.duration || rep.duration === 0 || !rep.angles || !Array.isArray(rep.angles)) {
                    console.error("Invalid repetition data:", rep);
                    return null;
                }
                // Нормализуем углы перед созданием точек
                const normalizedAngles = normalizeAngles(rep.angles, rep.shoulderLeftСoord, rep.shoulderRightСoord);
                
                return {
                    index,
                    points: normalizedAngles.map(pt => ({
                        percent: (pt.time / rep.duration) * 100,
                        angle: pt.shoulderAngle, // Используем уже нормализованное значение
                    }))
                };
            })
            .filter(rep => rep !== null);
    }, [repetitions]);

    // Фильтруем кривые, исключая скрытые повторения
    const filteredCurves = useMemo(() => {
        return normalizedCurves.filter(rep => !hiddenRepetitions.includes(rep.index));
    }, [normalizedCurves, hiddenRepetitions]);

    const averagesPerRepetition = useMemo(() => {
        if (filteredCurves.length === 0) return [];
        return filteredCurves.map(({ points }) => {
            const totalAngle = points.reduce((sum, point) => sum + point.angle, 0);
            return totalAngle / points.length;
        });
    }, [filteredCurves]);

    const { minAvgIndex, maxAvgIndex } = useMemo(() => {
        if (averagesPerRepetition.length === 0) return { minAvgIndex: null, maxAvgIndex: null };
        
        let minAvg = Infinity;
        let maxAvg = -Infinity;
        let minAvgIndex = -1;
        let maxAvgIndex = -1;
        
        averagesPerRepetition.forEach((avg, index) => {
            if (avg < minAvg) {
                minAvg = avg;
                minAvgIndex = filteredCurves[index].index; // Сохраняем оригинальный индекс
            }
            if (avg > maxAvg) {
                maxAvg = avg;
                maxAvgIndex = filteredCurves[index].index; // Сохраняем оригинальный индекс
            }
        });
        
        return { minAvgIndex, maxAvgIndex };
    }, [averagesPerRepetition, filteredCurves]);

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
            const avgAngle = anglesAtPercent.reduce((sum, val) => sum + val, 0) / anglesAtPercent.length;
            points.push(avgAngle);
        }
        return points;
    }, [filteredCurves]);

    const minAvgCurve = useMemo(() => {
        if (minAvgIndex === null) return null;
        const curve = normalizedCurves.find(rep => rep.index === minAvgIndex)?.points;
        return curve ? getCurveAtPercentages(curve) : null;
    }, [minAvgIndex, normalizedCurves]);

    const maxAvgCurve = useMemo(() => {
        if (maxAvgIndex === null) return null;
        const curve = normalizedCurves.find(rep => rep.index === maxAvgIndex)?.points;
        return curve ? getCurveAtPercentages(curve) : null;
    }, [maxAvgIndex, normalizedCurves]);

    const allRepetitionsCurves = useMemo(() => {
        if (!showAllRepetitions || normalizedCurves.length === 0) return [];
        
        return normalizedCurves.map(({ index, points }) => ({
            label: `Повторение ${index + 1}`,
            data: getCurveAtPercentages(points),
            borderColor: hiddenRepetitions.includes(index) 
                ? `rgba(200, 200, 200, 0.3)` 
                : `hsl(${(index * 360 / repetitions.length)}, 70%, 50%)`,
            borderWidth: hiddenRepetitions.includes(index) ? 1 : 2,
            borderDash: hiddenRepetitions.includes(index) ? [] : [5, 5], // Штриховая линия для видимых повторений
            pointBackgroundColor: hiddenRepetitions.includes(index) 
                ? `rgba(200, 200, 200, 0.3)` 
                : `hsl(${(index * 360 / repetitions.length)}, 70%, 50%)`,
            pointRadius: 3, // Включаем точки
            pointHoverRadius: 5,
            hidden: hiddenRepetitions.includes(index),
        }));
    }, [showAllRepetitions, normalizedCurves, hiddenRepetitions, repetitions]);

    function getCurveAtPercentages(curve) {
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
    }

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

    const toggleRepetitionVisibility = (repIndex) => {
        setHiddenRepetitions(prev => 
            prev.includes(repIndex) 
                ? prev.filter(i => i !== repIndex) 
                : [...prev, repIndex]
        );
    };

    const data = useMemo(() => {
        const labels = Array.from({ length: 101 }, (_, i) => `${i}%`);
        const datasets = [];
        
        if (showAllRepetitions) {
            datasets.push(...allRepetitionsCurves);
            
            if (filteredCurves.length > 0) {
                datasets.push({
                    label: `Средний угол (${handLabel})`,
                    data: averageCurve || Array(101).fill(0),
                    borderColor: lineColor,
                    borderWidth: 3,
                    pointRadius: 3, // Точки для средней линии
                    pointHoverRadius: 5,
                    fill: false,
                });
            }
        } else {
            datasets.push({
                label: `Средний угол (${handLabel})`,
                data: averageCurve || Array(101).fill(0),
                borderColor: lineColor,
                borderWidth: 2,
                pointRadius: 3, // Точки для средней линии
                pointHoverRadius: 5,
                fill: false,
            });
            
            if (minAvgCurve && filteredCurves.length > 0) {
                datasets.push({
                    label: `Мин. угол (${handLabel})`,
                    data: minAvgCurve,
                    borderColor: "rgba(255, 99, 132, 0.7)",
                    borderDash: [5, 5], // Штриховая линия для мин
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false,
                });
            }
            
            if (maxAvgCurve && filteredCurves.length > 0) {
                datasets.push({
                    label: `Макс. угол (${handLabel})`,
                    data: maxAvgCurve,
                    borderColor: "rgba(54, 162, 235, 0.7)",
                    borderDash: [5, 5], // Штриховая линия для макс
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false,
                });
            }
        }
        
        return { labels, datasets };
    }, [
        showAllRepetitions, 
        allRepetitionsCurves, 
        averageCurve, 
        minAvgCurve, 
        maxAvgCurve, 
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
                        if (label.startsWith('Повторение') && hiddenRepetitions.includes(parseInt(label.split(' ')[1]) - 1)) {
                            return `${label} (скрыто)`;
                        }
                        return `${label}: ${context.parsed.y.toFixed(2)}°`;
                    }
                }
            },
            title: { 
                display: true, 
                text: `График для ${handLabel}`,
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
                            content: `Макс. угол (${maxAngle?.toFixed(2)}°)`,
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
                    font: { size: 14 }
                } 
            },
            y: { 
                title: { 
                    display: true, 
                    text: "Угол (°)",
                    font: { size: 14 }
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

export default GraphSingleHand;