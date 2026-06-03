import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusMap: Record<string, { label: string; className: string; icon: string }> = {
    APPROVED: { label: 'Approved', className: 'approved', icon: '✅' },
    REJECTED: { label: 'Rejected', className: 'rejected', icon: '❌' },
    PARTIAL: { label: 'Partial', className: 'partial', icon: '⚠️' },
    MANUAL_REVIEW: { label: 'Manual Review', className: 'manual-review', icon: '🔍' },
    PENDING: { label: 'Pending', className: 'pending', icon: '⏳' },
  };

  const config = statusMap[status] || statusMap.PENDING;

  return (
    <span className={`badge ${config.className}`}>
      {config.icon} {config.label}
    </span>
  );
};

export default StatusBadge;
