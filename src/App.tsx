import { AuthProvider, useAuth } from './contexts/AuthContext';
import Map from './components/Map';

function AppContent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto my-4 p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Station Map</h1>
        {user ? (
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={signOut}>
            Sign Out
          </button>
        ) : (
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={signIn}>
            Sign In with Google
          </button>
        )}
      </div>
      {user ? (
        <Map />
      ) : (
        <p>Please sign in to create and save your station maps.</p>
      )}
    </div>
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
