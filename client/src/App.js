import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import authService from './services/auth';
import { Box, CssBaseline, createTheme, ThemeProvider } from '@mui/material';
import { NotificationProvider } from './contexts/NotificationContext';

// 创建主题
const theme = createTheme({
    palette: {
        primary: {
            main: '#2196f3',
        },
        secondary: {
            main: '#f50057',
        },
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
    },
});

// 包装组件，用于从URL中提取schematicId并传递给HomePage
const HomePageWithParams = (props) => {
    const { id } = useParams();
    return <HomePage {...props} openSchematicId={id ? parseInt(id) : null} />;
};

function App() {
    const [user, setUser] = useState(authService.getCurrentUser());
    const [isLoggedIn, setIsLoggedIn] = useState(!!authService.getCurrentUser());
    const [guestMode, setGuestMode] = useState(false);

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setIsLoggedIn(true);
        setGuestMode(false);
    };

    const enterGuestMode = () => {
        setGuestMode(true);
    };

    const exitGuestMode = () => {
        setGuestMode(false);
    };

    // 将enterGuestMode暴露为全局函数
    useEffect(() => {
        // 将函数暴露到全局，供其他组件调用
        window.enterGuestMode = enterGuestMode;

        // 清理函数
        return () => {
            delete window.enterGuestMode;
        };
    }, []);

    const homePageProps = {
        user,
        isGuestMode: guestMode,
        onExitGuestMode: exitGuestMode,
    };

    return (
        <ThemeProvider theme={theme}>
            <NotificationProvider>
                <CssBaseline />
                <Box sx={{
                    minHeight: '100vh',
                    bgcolor: '#f5f5f5'
                }}>
                    {isLoggedIn || guestMode ? (
                        <Routes>
                            <Route path="/litematic/:id" element={<HomePageWithParams {...homePageProps} />} />
                            <Route path="*" element={<HomePage {...homePageProps} />} />
                        </Routes>
                    ) : (
                        <Routes>
                            <Route path="/litematic/:id" element={
                                <LoginPage
                                    onLoginSuccess={handleLoginSuccess}
                                    onGuestMode={enterGuestMode}
                                />
                            } />
                            <Route path="*" element={
                                <LoginPage
                                    onLoginSuccess={handleLoginSuccess}
                                    onGuestMode={enterGuestMode}
                                />
                            } />
                        </Routes>
                    )}
                </Box>
            </NotificationProvider>
        </ThemeProvider>
    );
}

export default App; 