interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
      hover ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''
    } ${className}`}>
      {children}
    </div>
  );
}