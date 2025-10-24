import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function registerCyrillicFont(pdf, url = '/fonts/DejaVuSans.ttf', fontName = 'DejaVuSans') {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Font fetch failed');
        const arrayBuffer = await res.arrayBuffer();
        // конвертируем в base64
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        const chunk = 0x8000;
        for (let i = 0; i < len; i += chunk) {
            const sub = bytes.subarray(i, Math.min(i + chunk, len));
            binary += String.fromCharCode.apply(null, sub);
        }
        const base64 = btoa(binary);
        // регистрируем
        if (pdf && pdf.addFileToVFS && pdf.addFont) {
            pdf.addFileToVFS(`${fontName}.ttf`, base64);
            pdf.addFont(`${fontName}.ttf`, fontName, 'normal');
            pdf.setFont(fontName);
        }
    } catch (err) {
        console.warn('Не удалось загрузить шрифт для кириллицы:', err);
        // в случае ошибки оставляем стандартный шрифт
    }
}


export const exportChartsToPDF = async (selector, filename = 'report', patientName = '') => {
    try {
        const element = document.querySelector(selector);
        if (!element) {
            console.error('Element not found');
            return;
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Регистрация кириллического шрифта (если файл доступен в public/fonts/)
        await registerCyrillicFont(pdf, '/fonts/DejaVuSans.ttf', 'DejaVuSans');

        // Заголовок: имя пациента (если есть), название отчёта и дата
        let y = 15;
        if (patientName && patientName.trim() !== '') {
            pdf.setFontSize(14);
            pdf.text(`Пациент: ${patientName}`, 10, y);
            y += 8;
        }
        pdf.setFontSize(20);
        pdf.text('Exercise report', pageWidth / 2, y, { align: 'center' });
        y += 7;
        pdf.setFontSize(12);
        pdf.text(new Date().toLocaleDateString('ru-RU'), pageWidth / 2, y, { align: 'center' });

        let currentY = y + 8;

        const children = element.children;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            if (child.tagName === 'BUTTON' || child.style.display === 'none') {
                continue;
            }

            const canvas = await html2canvas(child, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (currentY + imgHeight > pageHeight - 20) {
                pdf.addPage();
                currentY = 20;
            }

            pdf.addImage(imgData, 'PNG', 10, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
        }

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