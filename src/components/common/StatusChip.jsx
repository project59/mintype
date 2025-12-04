import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const StatusChip = ({ message, type }) => {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-300/10',
      textColor: 'text-emerald-500',
      iconColor: 'text-emerald-500',
      borderColor: 'border-emerald-400/20'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-300/20',
      textColor: 'text-yellow-500',
      iconColor: 'text-yellow-500',
      borderColor: 'border-yellow-400/20'
    },
    failed: {
      icon: XCircle,
      bgColor: 'bg-red-300/20',
      textColor: 'text-red-500',
      iconColor: 'text-red-500',
      borderColor: 'border-red-400/20'
    }
  };

  const { icon: Icon, bgColor, textColor, iconColor, borderColor } = config[type] || config.success;

  return (
    <div className={`inline-flex items-center gap-1`}>
      <div className={`rounded-full flex items-center justify-center h-5 w-5 ${bgColor} border ${borderColor}`}>

      <Icon className={`w-3 h-3 ${iconColor}`} />
      </div>
      <span className={`text-sm font-medium ${textColor}`}>
        {message}
      </span>
    </div>
  );
};

export default StatusChip;