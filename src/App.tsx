import { AuthProvider, useAuth } from './contexts/AuthContext';
import Map from './components/Map';

function AppContent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <p>Betöltés...</p>;
  }

  return (
    <div className="mx-auto my-4 p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Állomástávolság-számító</h1>
        {user ? (
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500" onClick={signOut}>
            Kijelentkezés
          </button>
        ) : (
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500" onClick={signIn}>
            Bejelentkezés Google-fiókkal
          </button>
        )}
      </div>
      {user ? (
        <Map />
      ) : (
        <p>Jelentkezz be az oldal használatához!</p>
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
