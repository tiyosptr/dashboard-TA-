// Date formatting
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'full' = 'short') => {
  const d = new Date(date);
  
  switch(format) {
    case 'short':
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    case 'long':
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    case 'full':
      return d.toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    default:
      return d.toLocaleDateString('id-ID');
  }
};

// Currency formatting
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,}).format(amount);
};

// Number formatting
export const formatNumber = (num: number, decimals: number = 0) => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Calculate percentage
export const calculatePercentage = (value: number, total: number) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Get days difference
export const getDaysDifference = (date1: string | Date, date2: string | Date) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get hours difference
export const getHoursDifference = (date1: string | Date, date2: string | Date) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffHours = diffTime / (1000 * 60 * 60);
  return diffHours;
};

// Generate random ID
export const generateId = (prefix: string = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}-${random}`;
};

// Status color helper
export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    running: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    error: 'text-red-600 bg-red-100',
    maintenance: 'text-blue-600 bg-blue-100',
    pending: 'text-gray-600 bg-gray-100',
    'in-progress': 'text-blue-600 bg-blue-100',
    completed: 'text-green-600 bg-green-100',
  };
  return colors[status.toLowerCase()] || 'text-gray-600 bg-gray-100';
};

// Priority color helper
export const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    critical: 'text-red-700 bg-red-100 border-red-300',
    high: 'text-orange-700 bg-orange-100 border-orange-300',
    medium: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    low: 'text-green-700 bg-green-100 border-green-300',
  };
  return colors[priority.toLowerCase()] || 'text-gray-700 bg-gray-100 border-gray-300';
};

// Parse duration string (e.g., "2.5 hours" -> 2.5)
export const parseDuration = (duration: string): number => {
  const match = duration.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

// Format duration
export const formatDuration = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  }
  return `${hours.toFixed(1)} hours`;
};

// Calculate OEE
export const calculateOEE = (availability: number, performance: number, quality: number): number => {
  return (availability * performance * quality) / 10000;
};

// Export to CSV helper
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Debounce helper
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Truncate text
export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};  