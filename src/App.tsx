import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  IconButton,
  ThemeProvider,
  createTheme,
  CssBaseline,
  alpha,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper as MuiTablePaper,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Custom components for markdown rendering
const MarkdownComponents: Components = {
  p: ({ children }) => (
    <Typography 
      component="p" 
      sx={{ 
        my: 1,
        lineHeight: 1.6,
      }}
    >
      {children}
    </Typography>
  ),
  h1: ({ children }) => (
    <Typography variant="h5" component="h1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle1" component="h3" sx={{ mt: 1.5, mb: 1, fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ my: 1, pl: 3 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ my: 1, pl: 3 }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography component="li" sx={{ my: 0.5 }}>
      {children}
    </Typography>
  ),
  code: (props: any) => {
    const { inline, className, children } = props;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    return !inline ? (
      <Box sx={{ my: 2 }}>
        <SyntaxHighlighter
          style={atomDark}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: '8px',
            fontSize: '0.9em',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </Box>
    ) : (
      <Typography
        component="code"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          px: 0.8,
          py: 0.3,
          fontFamily: 'monospace',
          fontSize: '0.9em',
        }}
      >
        {children}
      </Typography>
    );
  },
  blockquote: ({ children }) => (
    <Box
      component="blockquote"
      sx={{
        borderLeft: '4px solid',
        borderColor: 'primary.main',
        pl: 2,
        py: 0.5,
        my: 2,
        bgcolor: alpha('#BB86FC', 0.1),
        borderRadius: '4px',
      }}
    >
      {children}
    </Box>
  ),
  a: ({ children, href, ...props }) => (
    <Typography
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        color: 'primary.main',
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      }}
      {...props}
    >
      {children}
    </Typography>
  ),
};

function App() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hi! I\'m your venue finding assistant. Tell me what kind of venue you\'re looking for, and I\'ll help you find the perfect spot! 🏢✨'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#BB86FC',
        light: '#E0B3FF',
        dark: '#8858C8',
      },
      secondary: {
        main: '#03DAC6',
        light: '#64FFDA',
        dark: '#018786',
      },
      background: {
        default: '#121212',
        paper: '#1E1E1E',
      },
      error: {
        main: '#CF6679',
      },
      text: {
        primary: '#E1E1E1',
        secondary: '#A4A4A4',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
      h6: {
        fontSize: '1.1rem',
        fontWeight: 500,
        letterSpacing: '0.02em',
      },
      body1: {
        letterSpacing: '0.01em',
      },
    },
    components: {
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
              },
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(process.env.REACT_APP_API_URL as string, {
        message: input,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setError('Failed to get response from the server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          background: 'linear-gradient(180deg, rgba(18,18,18,1) 0%, rgba(30,30,30,1) 100%)',
        }}
      >
        <AppBar 
          position="fixed" 
          elevation={0}
          sx={{
            background: 'transparent',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BotIcon sx={{ fontSize: 28, mr: 2, color: theme.palette.primary.main }} />
              <Typography variant="h6" component="div">
                Venue Finder AI
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.7,
                background: alpha(theme.palette.primary.main, 0.1),
                padding: '4px 12px',
                borderRadius: '16px',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              Powered by AI
            </Typography>
          </Toolbar>
        </AppBar>

        <Container 
          maxWidth="md" 
          sx={{ 
            flex: 1, 
            py: 4, 
            mt: '70px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {messages.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    gap: 1.5,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: message.role === 'user' 
                        ? alpha(theme.palette.primary.main, 0.2)
                        : alpha(theme.palette.secondary.main, 0.2),
                      color: message.role === 'user'
                        ? theme.palette.primary.main
                        : theme.palette.secondary.main,
                    }}
                  >
                    {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                  </Avatar>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      maxWidth: '80%',
                      bgcolor: message.role === 'user'
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.background.paper, 0.6),
                      border: '1px solid',
                      borderColor: message.role === 'user'
                        ? alpha(theme.palette.primary.main, 0.3)
                        : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                    }}
                  >
                    {message.role === 'user' ? (
                      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message.content}
                      </Typography>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </Paper>
                </Box>
              ))}
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                p: 2,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                bgcolor: alpha(theme.palette.background.paper, 0.6),
              }}
            >
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading || !input.trim()}
                  sx={{
                    px: 3,
                    borderRadius: 3,
                    minWidth: 'auto',
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.primary.main} 90%)`,
                    },
                    '&.Mui-disabled': {
                      background: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <SendIcon />
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Container>
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{
            backgroundColor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            '& .MuiAlert-icon': {
              color: theme.palette.error.main,
            },
          }}
        >
          {error}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
