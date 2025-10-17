// DateFormatter.jsx
import React from 'react';

const DateFormatter = ({ dateString, format = 'dd/mm/yyyy' }) => {
    const formatDate = (inputDate) => {
        if (!inputDate) return '-';

        try {
            let date;

            // Handle berbagai format input
            if (inputDate.includes('T')) {
                // Format ISO (2024-01-15T10:00:00Z)
                date = new Date(inputDate);
            } else if (inputDate.includes('-')) {
                // Format YYYY-MM-DD (2024-01-15)
                const [year, month, day] = inputDate.split('-');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (inputDate.includes('/')) {
                // Format DD/MM/YYYY (15/01/2024)
                const [day, month, year] = inputDate.split('/');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                // Default parsing
                date = new Date(inputDate);
            }

            // Validasi tanggal
            if (isNaN(date.getTime())) {
                return 'Tanggal tidak valid';
            }

            // Format berdasarkan parameter
            switch (format) {
                case 'dd/mm/yyyy':
                    return date.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                case 'dd-mm-yyyy':
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}-${month}-${year}`;
                case 'full':
                    return date.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                case 'yyyy-mm-dd':
                    // Untuk input date
                    return date.toISOString().split('T')[0];
                default:
                    return date.toLocaleDateString('id-ID');
            }
        } catch (error) {
            console.error('Error formatting date:', inputDate, error);
            return 'Format error';
        }
    };

    return <span>{formatDate(dateString)}</span>;
};

export default DateFormatter;