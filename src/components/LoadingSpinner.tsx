interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "purple" | "gray";
  text?: string;
}

export default function LoadingSpinner({ 
  size = "md", 
  color = "blue", 
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const colorClasses = {
    blue: "border-blue-600",
    green: "border-green-600", 
    purple: "border-purple-600",
    gray: "border-gray-600"
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div 
        className={`${sizeClasses[size]} border-2 border-gray-300 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`}
      ></div>
      {text && (
        <p className="text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
}
