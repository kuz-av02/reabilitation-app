import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    BarElement,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    Legend
);

const MovementPhaseChart = ({ phasesDataLeft, phasesDataRight, handLabel }) => {
    // Проверяем, есть ли данные для отображения
    if ((!phasesDataLeft || phasesDataLeft.length === 0) && 
        (!phasesDataRight || phasesDataRight.length === 0)) {
        return <div>Нет данных для отображения графика фаз движения {handLabel}</div>;
    }

    // Рассчитываем средние значения для левой руки (если данные есть)
    const avgUpLeft = phasesDataLeft && phasesDataLeft.length > 0 
        ? phasesDataLeft.reduce((sum, phase) => sum + phase.upPhasePercentage, 0) / phasesDataLeft.length 
        : 0;
    const avgDownLeft = phasesDataLeft && phasesDataLeft.length > 0 
        ? phasesDataLeft.reduce((sum, phase) => sum + phase.downPhasePercentage, 0) / phasesDataLeft.length 
        : 0;

    // Рассчитываем средние значения для правой руки (если данные есть)
    const avgUpRight = phasesDataRight && phasesDataRight.length > 0 
        ? phasesDataRight.reduce((sum, phase) => sum + phase.upPhasePercentage, 0) / phasesDataRight.length 
        : 0;
    const avgDownRight = phasesDataRight && phasesDataRight.length > 0 
        ? phasesDataRight.reduce((sum, phase) => sum + phase.downPhasePercentage, 0) / phasesDataRight.length 
        : 0;

    // Находим повторение с минимальной и максимальной длительностью фаз для левой руки (если данные есть)
    const minPhaseLeft = phasesDataLeft && phasesDataLeft.length > 0 
        ? phasesDataLeft.reduce((min, phase) => 
            phase.upPhasePercentage< min.upPhasePercentage ? phase : min
        ) 
        : { upPhasePercentage: 0, downPhasePercentage: 0 };
    const maxPhaseLeft = phasesDataLeft && phasesDataLeft.length > 0 
        ? phasesDataLeft.reduce((max, phase) => 
            phase.upPhasePercentage > max.upPhasePercentage ? phase : max
        ) 
        : { upPhasePercentage: 0, downPhasePercentage: 0 };

    // Находим повторение с минимальной и максимальной длительностью фаз для правой руки (если данные есть)
    const minPhaseRight = phasesDataRight && phasesDataRight.length > 0 
        ? phasesDataRight.reduce((min, phase) => 
            phase.upPhasePercentage < min.upPhasePercentage ? phase : min
        ) 
        : { upPhasePercentage: 0, downPhasePercentage: 0 };
    const maxPhaseRight = phasesDataRight && phasesDataRight.length > 0 
        ? phasesDataRight.reduce((max, phase) => 
            phase.upPhasePercentage > max.upPhasePercentage  ? phase : max
        ) 
        : { upPhasePercentage: 0, downPhasePercentage: 0 };

    // Определяем данные для текущего этапа
    let data;
    if (handLabel === "Левая рука") {
        data = {
            labels: ['Среднее повторение', 'Минимальное повторение', 'Максимальное повторение'],
            datasets: [
                // Средние значения для левой руки
                {
                    label: 'Средний подъём - Левая рука',
                    data: [avgUpLeft, 0, 0],
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                },
                {
                    label: 'Среднее опускание - Левая рука',
                    data: [avgDownLeft, 0, 0],
                    backgroundColor: 'rgba(75, 192, 192, 0.3)',
                },
                // Минимальное повторение для левой руки
                {
                    label: 'Подъём - Минимальное повторение (Левая рука)',
                    data: [0, minPhaseLeft.upPhasePercentage, 0],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                },
                {
                    label: 'Опускание - Минимальное повторение (Левая рука)',
                    data: [0, minPhaseLeft.downPhasePercentage, 0],
                    backgroundColor: 'rgba(255, 99, 132, 0.3)',
                },
                // Максимальное повторение для левой руки
                {
                    label: 'Подъём - Максимальное повторение (Левая рука)',
                    data: [0, 0, maxPhaseLeft.upPhasePercentage],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                },
                {
                    label: 'Опускание - Максимальное повторение (Левая рука)',
                    data: [0, 0, maxPhaseLeft.downPhasePercentage],
                    backgroundColor: 'rgba(54, 162, 235, 0.3)',
                },
            ],
        };
    } else if (handLabel === "Правая рука") {
        data = {
            labels: ['Среднее повторение', 'Минимальное повторение', 'Максимальное повторение'],
            datasets: [
                // Средние значения для правой руки
                {
                    label: 'Средний подъём - Правая рука',
                    data: [avgUpRight, 0, 0],
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                },
                {
                    label: 'Среднее опускание - Правая рука',
                    data: [avgDownRight, 0, 0],
                    backgroundColor: 'rgba(153, 102, 255, 0.3)',
                },
                // Минимальное повторение для правой руки
                {
                    label: 'Подъём - Минимальное повторение (Правая рука)',
                    data: [0, minPhaseRight.upPhasePercentage, 0],
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                },
                {
                    label: 'Опускание - Минимальное повторение (Правая рука)',
                    data: [0, minPhaseRight.downPhasePercentage, 0],
                    backgroundColor: 'rgba(255, 159, 64, 0.3)',
                },
                // Максимальное повторение для правой руки
                {
                    label: 'Подъём - Максимальное повторение (Правая рука)',
                    data: [0, 0, maxPhaseRight.upPhasePercentage],
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                },
                {
                    label: 'Опускание - Максимальное повторение (Правая рука)',
                    data: [0, 0, maxPhaseRight.downPhasePercentage],
                    backgroundColor: 'rgba(75, 192, 192, 0.3)',
                },
            ],
        };
    } else if (handLabel === "Обе руки") {
        // Для обеих рук используем данные из phasesDataLeft и phasesDataRight
        const avgUpBoth = (avgUpLeft + avgUpRight) / 2;
        const avgDownBoth = (avgDownLeft + avgDownRight) / 2;

        const minPhaseBoth = {
            upPhasePercentage: Math.min(minPhaseLeft.upPhasePercentage, minPhaseRight.upPhasePercentage),
            downPhasePercentage: 100-Math.min(minPhaseLeft.upPhasePercentage, minPhaseRight.upPhasePercentage),
        };

        const maxPhaseBoth = {
            upPhasePercentage: Math.max(maxPhaseLeft.upPhasePercentage, maxPhaseRight.upPhasePercentage),
            downPhasePercentage: 100-Math.max(maxPhaseLeft.upPhasePercentage, maxPhaseRight.upPhasePercentage),
        };

        data = {
            labels: ['Среднее повторение', 'Минимальное повторение', 'Максимальное повторение'],
            datasets: [
                // Средние значения для обеих рук
                {
                    label: 'Средний подъём - Обе руки',
                    data: [avgUpBoth, 0, 0],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                },
                {
                    label: 'Среднее опускание - Обе руки',
                    data: [avgDownBoth, 0, 0],
                    backgroundColor: 'rgba(255, 99, 132, 0.3)',
                },
                // // Минимальное повторение для обеих рук
                // {
                //     label: 'Подъём - Минимальное повторение (Обе руки)',
                //     data: [0, minPhaseBoth.upPhasePercentage, 0],
                //     backgroundColor: 'rgba(54, 162, 235, 0.6)',
                // },
                // {
                //     label: 'Опускание - Минимальное повторение (Обе руки)',
                //     data: [0, minPhaseBoth.downPhasePercentage, 0],
                //     backgroundColor: 'rgba(54, 162, 235, 0.3)',
                // },
                // // Максимальное повторение для обеих рук
                // {
                //     label: 'Подъём - Максимальное повторение (Обе руки)',
                //     data: [0, 0, maxPhaseBoth.upPhasePercentage],
                //     backgroundColor: 'rgba(75, 192, 192, 0.6)',
                // },
                // {
                //     label: 'Опускание - Максимальное повторение (Обе руки)',
                //     data: [0, 0, maxPhaseBoth.downPhasePercentage],
                //     backgroundColor: 'rgba(75, 192, 192, 0.3)',
                // },
            ],
        };
    }

    const options = {
        indexAxis: 'x',
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
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
                    text: 'Длительность (%)',
                },
                max: 100, // Максимальное значение 100%
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Тип повторения',
                },
            },
        },
    };

    return <Bar data={data} options={options} />;
};

export default MovementPhaseChart;