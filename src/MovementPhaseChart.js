// MovementPhaseChart.js

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
    if ((!phasesDataLeft || phasesDataLeft.length === 0) && (!phasesDataRight || phasesDataRight.length === 0)) {
        return <div>Нет данных для отображения графика фаз движения {handLabel}</div>;
    }

    // Определяем максимальное количество повторений между левой и правой рукой
    const maxReps = Math.max(phasesDataLeft.length, phasesDataRight.length);

    const labels = [];
    const upPercentagesLeft = [];
    const downPercentagesLeft = [];
    const upPercentagesRight = [];
    const downPercentagesRight = [];

    for (let i = 0; i < maxReps; i++) {
        labels.push(`Повторение ${i + 1}`);

        if (phasesDataLeft[i]) {
            upPercentagesLeft.push(phasesDataLeft[i].upPhasePercentage);
            downPercentagesLeft.push(phasesDataLeft[i].downPhasePercentage);
        } else {
            upPercentagesLeft.push(0);
            downPercentagesLeft.push(0);
        }

        if (phasesDataRight[i]) {
            upPercentagesRight.push(phasesDataRight[i].upPhasePercentage);
            downPercentagesRight.push(phasesDataRight[i].downPhasePercentage);
        } else {
            upPercentagesRight.push(0);
            downPercentagesRight.push(0);
        }
    }

    const data = {
        labels,
        datasets: [
            {
                label: 'Подъём - Левая рука',
                data: upPercentagesLeft,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
            {
                label: 'Опускание - Левая рука',
                data: downPercentagesLeft,
                backgroundColor: 'rgba(75, 192, 192, 0.3)',
            },
            {
                label: 'Подъём - Правая рука',
                data: upPercentagesRight,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
            },
            {
                label: 'Опускание - Правая рука',
                data: downPercentagesRight,
                backgroundColor: 'rgba(153, 102, 255, 0.3)',
            },
        ],
    };

    const options = {
        indexAxis: 'y',
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
                max: 200,
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Повторения',
                },
            },
        },
    };

    return <Bar data={data} options={options} />;
};

export default MovementPhaseChart;
