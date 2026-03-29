import Button, { ButtonProps } from "@mui/material/Button";

type AuthPrimaryButtonProps = ButtonProps;

const primaryButtonSx = {
  borderRadius: 99,
  py: 1.2,
  fontWeight: 700,
  background: "linear-gradient(90deg, #8da2ff, #80e4ff)",
  color: "#081327",
  boxShadow: "0 16px 38px rgba(99,180,255,0.34)",
  "&:hover": {
    background: "linear-gradient(90deg, #9caeff, #8febff)"
  }
};

export default function AuthPrimaryButton(props: AuthPrimaryButtonProps) {
  return <Button {...props} variant={props.variant ?? "contained"} sx={{ ...primaryButtonSx, ...props.sx }} />;
}
