"use client";

import { ThemeProvider, createTheme } from "@mui/material";
import { PropsWithChildren, useMemo } from "react";

export default function MuiProvider({ children }: PropsWithChildren) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          background: {
            default: "#070911",
            paper: "rgba(13,18,34,0.8)"
          },
          primary: {
            main: "#8fd5ff"
          },
          secondary: {
            main: "#bca8ff"
          },
          text: {
            primary: "#f4f8ff",
            secondary: "rgba(225,236,255,0.72)"
          }
        },
        shape: {
          borderRadius: 16
        },
        typography: {
          fontFamily: "\"Manrope\", \"PingFang SC\", \"Hiragino Sans GB\", sans-serif",
          h1: {
            fontWeight: 700,
            letterSpacing: "0.02em"
          },
          h2: {
            fontWeight: 700
          }
        },
        components: {
          MuiDialog: {
            styleOverrides: {
              paper: {
                border: "1px solid rgba(170,196,255,0.3)",
                background:
                  "radial-gradient(circle at 8% 0%, rgba(88,204,255,0.22), transparent 44%), radial-gradient(circle at 100% 100%, rgba(171,137,255,0.2), transparent 38%), linear-gradient(165deg, rgba(11,16,32,0.98), rgba(17,24,46,0.96), rgba(18,15,35,0.95))",
                boxShadow: "0 34px 110px rgba(1, 4, 18, 0.68)"
              }
            }
          },
          MuiButton: {
            defaultProps: {
              disableElevation: true
            },
            styleOverrides: {
              root: {
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 700
              }
            }
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.06)",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.09)"
                },
                "&.Mui-focused": {
                  backgroundColor: "rgba(255,255,255,0.11)",
                  boxShadow: "none"
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(190,205,255,0.22)"
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(204,221,255,0.36)"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(119,234,255,0.85)",
                  borderWidth: 1
                }
              },
              input: {
                padding: "14px 14px",
                color: "rgba(245,249,255,0.96)",
                "&:-webkit-autofill": {
                  WebkitTextFillColor: "rgba(245,249,255,0.96)",
                  WebkitBoxShadow: "0 0 0 1000px rgba(255,255,255,0.06) inset",
                  boxShadow: "0 0 0 1000px rgba(255,255,255,0.06) inset",
                  caretColor: "rgba(245,249,255,0.96)"
                }
              }
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                border: "1px solid rgba(160,182,255,0.24)",
                background:
                  "linear-gradient(160deg, rgba(10,12,22,0.92), rgba(17,22,40,0.86), rgba(24,13,43,0.8))",
                boxShadow: "0 32px 90px rgba(0,0,0,0.42)"
              }
            }
          },
          MuiAlert: {
            styleOverrides: {
              standardError: {
                borderRadius: 10,
                border: "1px solid rgba(255,156,169,0.26)",
                backgroundColor: "rgba(77,15,28,0.42)"
              }
            }
          },
          MuiDivider: {
            styleOverrides: {
              root: {
                color: "rgba(225,236,255,0.58)",
                fontSize: 13
              }
            }
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                color: "rgba(243,248,255,0.9)"
              }
            }
          }
        }
      }),
    []
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
