// utils/dateUtils.js
export const formatDate = (dateString, format = "dd/mm/yyyy") => {
  if (!dateString || dateString === "0001-01-01T00:00:00Z") return "-";

  try {
    let date;

    // Handle null date dari database
    if (dateString === "0001-01-01T00:00:00Z" || dateString === "0001-01-01") {
      return "-";
    }

    // Handle berbagai format input
    if (dateString.includes("T")) {
      date = new Date(dateString);
    } else if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-");
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      date = new Date(dateString);
    }

    // Validasi tanggal
    if (isNaN(date.getTime()) || date.getFullYear() < 1000) {
      return "-";
    }

    // Format output
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    switch (format) {
      case "dd/mm/yyyy":
        return `${day}/${month}/${year}`;
      case "dd-mm-yyyy":
        return `${day}-${month}-${year}`;
      case "yyyy-mm-dd":
        return `${year}-${month}-${day}`;
      case "full":
        return date.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      default:
        return `${day}/${month}/${year}`;
    }
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "-";
  }
};

// Untuk input date (form)
export const formatDateForInput = (dateString) => {
  if (!dateString) return "";

  try {
    if (dateString.includes("T")) {
      return dateString.split("T")[0];
    }
    return dateString;
  } catch (error) {
    return "";
  }
};
