
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}
