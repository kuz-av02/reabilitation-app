import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';



export const exportChartsToPDF = async (selector, filename = 'report') => {
    try {
        // Находим элемент с графиками
        const element = document.querySelector(selector);
        if (!element) {
            console.error('Element not found');
            return;
        }

        // Создаем PDF документ
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Добавляем заголовок
        pdf.setFontSize(20);
        pdf.text('Exercise report', pageWidth / 2, 15, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text(new Date().toLocaleDateString('ru-RU'), pageWidth / 2, 22, { align: 'center' });

        let currentY = 30;

        // Разделяем элемент на части для лучшего качества
        const children = element.children;
        
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            
            // Пропускаем кнопки и другие ненужные элементы
            if (child.tagName === 'BUTTON' || child.style.display === 'none') {
                continue;
            }

            // Создаем canvas из элемента
            const canvas = await html2canvas(child, {
                scale: 2, // Увеличиваем качество
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 20; // Отступы по бокам
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Если элемент не помещается на текущей странице, добавляем новую
            if (currentY + imgHeight > pageHeight - 20) {
                pdf.addPage();
                currentY = 20;
            }

            // Добавляем изображение в PDF
            pdf.addImage(imgData, 'PNG', 10, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
        }

        // Сохраняем PDF
        pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Ошибка при создании PDF отчета');
    }
};

// Альтернативная функция для экспорта отдельных компонентов
export const exportComponentToPDF = async (componentRef, filename = 'component') => {
    try {
        if (!componentRef.current) {
            console.error('Component ref not found');
            return;
        }

        const canvas = await html2canvas(componentRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`${filename}.pdf`);

    } catch (error) {
        console.error('Error exporting component to PDF:', error);
    }
};