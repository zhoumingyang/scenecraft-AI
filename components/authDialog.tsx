import RegisterDialog from "@/components/auth/registerDialog";
import LoginDialog from "@/components/auth/loginDialog";
import ResetPasswordDialog from "@/components/auth/resetPasswordDialog";

type AuthDialogProps = {
  open: boolean;
  mode: "login" | "register";
  onClose: () => void;
  resetPasswordToken: string | null;
  onResetPasswordTokenClear: () => void;
};

export default function AuthDialog({
  open,
  mode,
  onClose,
  resetPasswordToken,
  onResetPasswordTokenClear
}: AuthDialogProps) {
  return (
    <>
      <RegisterDialog open={open && mode === "register"} onClose={onClose} />
      <LoginDialog open={open && mode === "login"} onClose={onClose} />
      <ResetPasswordDialog token={resetPasswordToken} onClose={onResetPasswordTokenClear} />
    </>
  );
}
