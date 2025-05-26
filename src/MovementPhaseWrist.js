import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const MovementPhaseWrist = ({ phasesDataLeft, phasesDataRight, handLabel }) => {
    // Проверяем, есть ли данные для отображения
    if ((!phasesDataLeft || phasesDataLeft.length === 0) && (!phasesDataRight || phasesDataRight.length === 0)) {
        return <div>Нет данных для отображения графика фаз движения {handLabel}</div>;
    }

    // Рассчитываем средние значения для левой руки (если данные есть)
    const avgUpLeft = phasesDataLeft && phasesDataLeft.length > 0 ? phasesDataLeft.reduce((sum, phase) => sum + phase.upPhasePercentage, 0) / phasesDataLeft.length : 0;
    const avgDownLeft = phasesDataLeft && phasesDataLeft.length > 0 ? phasesDataLeft.reduce((sum, phase) => sum + phase.downPhasePercentage, 0) / phasesDataLeft.length : 0;

    // Рассчитываем средние значения для правой руки (если данные есть)
    const avgUpRight = phasesDataRight && phasesDataRight.length > 0 ? phasesDataRight.reduce((sum, phase) => sum + phase.upPhasePercentage, 0) / phasesDataRight.length : 0;
    const avgDownRight = phasesDataRight && phasesDataRight.length > 0 ? phasesDataRight.reduce((sum, phase) => sum + phase.downPhasePercentage, 0) / phasesDataRight.length : 0;

    // Находим повторение с минимальной и максимальной длительностью фаз для левой руки (если данные есть)
    const minPhaseLeft = phasesDataLeft && phasesDataLeft.length > 0 ? phasesDataLeft.reduce((min, phase) => (phase.upPhasePercentage < min.upPhasePercentage ? phase : min)) : { upPhasePercentage: 0, downPhasePercentage: 0 };
    const maxPhaseLeft = phasesDataLeft && phasesDataLeft.length > 0 ? phasesDataLeft.reduce((max, phase) => (phase.upPhasePercentage > max.upPhasePercentage ? phase : max)) : { upPhasePercentage: 0, downPhasePercentage: 0 };

    // Находим повторение с минимальной и максимальной длительностью фаз для правой руки (если данные есть)
    const minPhaseRight = phasesDataRight && phasesDataRight.length > 0 ? phasesDataRight.reduce((min, phase) => (phase.upPhasePercentage < min.upPhasePercentage ? phase : min)) : { upPhasePercentage: 0, downPhasePercentage: 0 };
    const maxPhaseRight = phasesDataRight && phasesDataRight.length > 0 ? phasesDataRight.reduce((max, phase) => (phase.upPhasePercentage > max.upPhasePercentage ? phase : max)) : { upPhasePercentage: 0, downPhasePercentage: 0 };

    // Определяем данные для текущего этапа
    let data;
    if (handLabel === "Левая кисть") {
        data = {
            labels: ["Среднее повторение", "Минимальное повторение", "Максимальное повторение"],
            datasets: [
                // Средние значения для левой руки
                {
                    label: "Средний подъём - Левая кисть",
                    data: [avgUpLeft, 0, 0],
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                },
                {
                    label: "Среднее опускание - Левая кисть",
                    data: [avgDownLeft, 0, 0],
                    backgroundColor: "rgba(75, 192, 192, 0.3)",
                },
                // Минимальное повторение для левой руки
                {
                    label: "Подъём - Минимальное повторение (Левая кисть)",
                    data: [0, minPhaseLeft.upPhasePercentage, 0],
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                },
                {
                    label: "Опускание - Минимальное повторение (Левая кисть)",
                    data: [0, minPhaseLeft.downPhasePercentage, 0],
                    backgroundColor: "rgba(255, 99, 132, 0.3)",
                },
                // Максимальное повторение для левой руки
                {
                    label: "Подъём - Максимальное повторение (Левая кисть)",
                    data: [0, 0, maxPhaseLeft.upPhasePercentage],
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                },
                {
                    label: "Опускание - Максимальное повторение (Левая кисть)",
                    data: [0, 0, maxPhaseLeft.downPhasePercentage],
                    backgroundColor: "rgba(54, 162, 235, 0.3)",
                },
            ],
        };
    } else if (handLabel === "Правая кисть") {
        data = {
            labels: ["Среднее повторение", "Минимальное повторение", "Максимальное повторение"],
            datasets: [
                // Средние значения для правой руки
                {
                    label: "Средний подъём - Правая кисть",
                    data: [avgUpRight, 0, 0],
                    backgroundColor: "rgba(153, 102, 255, 0.6)",
                },
                {
                    label: "Среднее опускание - Правая кисть",
                    data: [avgDownRight, 0, 0],
                    backgroundColor: "rgba(153, 102, 255, 0.3)",
                },
                // Минимальное повторение для правой руки
                {
                    label: "Подъём - Минимальное повторение (Правая кисть)",
                    data: [0, minPhaseRight.upPhasePercentage, 0],
                    backgroundColor: "rgba(255, 159, 64, 0.6)",
                },
                {
                    label: "Опускание - Минимальное повторение (Правая кисть)",
                    data: [0, minPhaseRight.downPhasePercentage, 0],
                    backgroundColor: "rgba(255, 159, 64, 0.3)",
                },
                // Максимальное повторение для правой руки
                {
                    label: "Подъём - Максимальное повторение (Правая кисть)",
                    data: [0, 0, maxPhaseRight.upPhasePercentage],
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                },
                {
                    label: "Опускание - Максимальное повторение (Правая кисть)",
                    data: [0, 0, maxPhaseRight.downPhasePercentage],
                    backgroundColor: "rgba(75, 192, 192, 0.3)",
                },
            ],
        };
    }

    const options = {
        indexAxis: "x",
        responsive: true,
        plugins: {
            legend: {
                position: "top",
            },
            title: {
                display: true,
                text: `Фазы движения для ${handLabel}`,
            },
        },
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: "Длительность (%)",
                },
                max: 100, // Максимальное значение 100%
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: "Тип повторения",
                },
            },
        },
    };

    return <Bar data={data} options={options} />;
};

export default MovementPhaseWrist;
