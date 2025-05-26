import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const exportChartsToPDF = async (containerSelector = ".graph-container", filename = "exercise_report") => {
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const elements = document.querySelectorAll(containerSelector);

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Делаем скриншот элемента
      const canvas = await html2canvas(element, { scale: 2 }); // Увеличиваем разрешение
      const imgData = canvas.toDataURL("image/png");

      // Добавляем новую страницу для каждого графика (кроме первого)
      if (i > 0) pdf.addPage();

      // Рассчитываем размеры
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      const imgWidth = pageWidth - 20; // Отступы по 10 мм с каждой стороны
      const imgHeight = imgWidth / imgRatio;

      // Добавляем изображение
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    }

    // Сохраняем PDF
    pdf.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error("Ошибка при генерации PDF:", error);
    alert("Не удалось создать PDF-отчёт");
  }
};