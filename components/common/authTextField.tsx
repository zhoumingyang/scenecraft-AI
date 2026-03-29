import TextField, { TextFieldProps } from "@mui/material/TextField";

const authInputSx = {
  "& .MuiOutlinedInput-root": {
    height: 50
  },
  "& .MuiOutlinedInput-input": {
    height: "100%",
    boxSizing: "border-box",
    padding: "0 14px",
    display: "flex",
    alignItems: "center"
  }
};

type AuthTextFieldProps = TextFieldProps;

export default function AuthTextField(props: AuthTextFieldProps) {
  return <TextField {...props} variant="outlined" sx={{ ...authInputSx, ...props.sx }} />;
}
