import { FormEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";

type AuthDialogProps = {
  open: boolean;
  mode: "login" | "register";
  onClose: () => void;
};

const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@scenecraft.local`;
const rowLabelSx = { minWidth: 52, color: "rgba(236,244,255,0.9)", fontWeight: 600 };
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
const socialButtonSx = {
  borderRadius: 2.5,
  py: 1,
  borderColor: "rgba(202,217,255,0.36)",
  backgroundColor: "rgba(255,255,255,0.04)"
};

export default function AuthDialog({ open, mode, onClose }: AuthDialogProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");

  const closeDialog = () => {
    if (busy) return;
    setErrorText("");
    onClose();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password.trim()) {
      setErrorText("请输入用户名和密码");
      return;
    }

    setBusy(true);
    setErrorText("");
    try {
      const email = usernameToEmail(normalizedUsername);
      if (mode === "register") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: normalizedUsername,
          callbackURL: "/editor"
        });
        if (result.error) {
          setErrorText(result.error.message || "注册失败，请稍后重试");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/editor"
        });
        if (result.error) {
          setErrorText(result.error.message || "登录失败，请检查用户名和密码");
          return;
        }
      }
      onClose();
      router.push("/editor");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const onSocialSignIn = async (provider: "google" | "github") => {
    setBusy(true);
    setErrorText("");
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/editor"
      });
      if (result.error) {
        setErrorText(result.error.message || "第三方登录失败，请检查配置");
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: {
            background:
              "radial-gradient(circle at 20% 18%, rgba(114,234,255,0.16), transparent 48%), rgba(5,8,19,0.76)",
            backdropFilter: "blur(4px)"
          }
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: 1,
          overflow: "hidden"
        }
      }}
    >
      <DialogTitle
        sx={{
          pt: 2.8,
          pb: 1.4,
          px: 3,
          pr: 7,
          fontWeight: 700,
          fontSize: 29,
          letterSpacing: "0.01em"
        }}
      >
        {mode === "register" ? "创建账号" : "欢迎回来"}
        <IconButton
          size="small"
          onClick={closeDialog}
          disabled={busy}
          aria-label="关闭弹窗"
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            border: "1px solid rgba(190,210,255,0.34)",
            backgroundColor: "rgba(255,255,255,0.06)",
            color: "rgba(243,248,255,0.9)",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.12)"
            }
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Typography color="text.secondary" sx={{ mb: 2.4, lineHeight: 1.7 }}>
          {mode === "register"
            ? "设置用户名与密码，创建后将直接进入编辑器。"
            : "使用你的用户名和密码继续创作流程。"}
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={1.8}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography sx={rowLabelSx}>用户名</Typography>
              <TextField
                placeholder="例如：mingyoung"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                fullWidth
                autoComplete="username"
                variant="outlined"
                sx={authInputSx}
              />
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography sx={rowLabelSx}>密码</Typography>
              <TextField
                type="password"
                placeholder="至少 8 位"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                variant="outlined"
                sx={authInputSx}
              />
            </Stack>
            {errorText ? <Alert severity="error">{errorText}</Alert> : null}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              sx={{
                mt: 0.6,
                borderRadius: 99,
                py: 1.2,
                fontWeight: 700,
                background: "linear-gradient(90deg, #8da2ff, #80e4ff)",
                color: "#081327",
                boxShadow: "0 16px 38px rgba(99,180,255,0.34)",
                "&:hover": {
                  background: "linear-gradient(90deg, #9caeff, #8febff)"
                }
              }}
            >
              {busy ? "处理中..." : mode === "register" ? "注册并进入 Editor" : "用户名密码登录"}
            </Button>
          </Stack>
        </Box>

        {mode === "login" ? (
          <>
            <Divider sx={{ my: 2.4 }}>或使用第三方认证</Divider>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
              <Button
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={() => onSocialSignIn("google")}
                disabled={busy}
                fullWidth
                sx={socialButtonSx}
              >
                谷歌认证
              </Button>
              <Button
                variant="outlined"
                startIcon={<GitHubIcon />}
                onClick={() => onSocialSignIn("github")}
                disabled={busy}
                fullWidth
                sx={socialButtonSx}
              >
                GitHub 认证
              </Button>
            </Stack>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
