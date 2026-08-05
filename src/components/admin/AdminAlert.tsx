import { Alert } from "@/components/ui/Alert";

interface AdminAlertProps {
  tone: "success" | "error";
  message: string;
  onDismiss?: () => void;
}

export function AdminAlert({ tone, message, onDismiss }: AdminAlertProps) {
  return (
    <Alert tone={tone} onDismiss={onDismiss}>
      {message}
    </Alert>
  );
}
