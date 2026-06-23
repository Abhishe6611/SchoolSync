export const formatDate = (dateInput) => {
  if (!dateInput) return "—";
  
  // If the input is just "YYYY-MM-DD", append time to ensure local timezone doesn't shift the day backwards
  const dateStr = typeof dateInput === 'string' && dateInput.length === 10 
    ? `${dateInput}T00:00:00` 
    : dateInput;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

export const formatDateTime = (dateInput) => {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};
