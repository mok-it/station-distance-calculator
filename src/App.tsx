import { Box, Button, Container, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Map from './components/Map';

function AppContent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Station Map
          </Typography>
          {user ? (
            <Button variant="contained" onClick={signOut}>
              Sign Out
            </Button>
          ) : (
            <Button variant="contained" onClick={signIn}>
              Sign In with Google
            </Button>
          )}
        </Box>
        {user ? (
          <Map />
        ) : (
          <Typography>
            Please sign in to create and save your station maps.
          </Typography>
        )}
      </Box>
    </Container>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
